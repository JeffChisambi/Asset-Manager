import { supabase } from "@/lib/supabase";
import { Post } from "@/types/profile";

const BUCKET = "post_media";

export interface IPostRepository {
  createPost(
    userId: string,
    post: Omit<Post, "id" | "userId" | "createdAt">,
    mediaFiles?: { uri: string; name: string }[],
  ): Promise<Post>;
  getPostsByUser(userId: string): Promise<Post[]>;
}

export class SupabasePostRepository implements IPostRepository {
  async createPost(
    userId: string,
    post: Omit<Post, "id" | "userId" | "createdAt">,
    mediaFiles?: { uri: string; name: string }[],
  ): Promise<Post> {
    const mediaUrls: string[] = [];

    // 1. Determine type prefix for each file so the card can reliably distinguish
    // media types regardless of whether Supabase or local URIs are used.
    const typePrefix = (name: string): "image" | "music" | "voice" => {
      if (name.startsWith("image")) return "image";
      if (name.startsWith("music")) return "music";
      return "voice";
    };

    // 2. Upload files to Supabase storage using XMLHttpRequest blob conversion.
    //    If upload fails (offline / RLS / network) we fall back to the local URI
    //    so the post still renders with media immediately.
    if (mediaFiles && mediaFiles.length) {
      for (const file of mediaFiles) {
        const prefix = typePrefix(file.name);
        let resolvedUrl: string | null = null;

        try {
          const blob: Blob = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = function () {
              resolve(xhr.response);
            };
            xhr.onerror = function () {
              reject(new TypeError("Local file read failed"));
            };
            xhr.responseType = "blob";
            xhr.open("GET", file.uri, true);
            xhr.send(null);
          });

          const fileExt = file.name.split(".").pop() || "bin";
          const uniquePath = `posts/${userId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

          let contentType = "application/octet-stream";
          if (prefix === "image") contentType = "image/jpeg";
          else if (prefix === "music" || prefix === "voice")
            contentType = "audio/x-m4a";

          const { data, error } = await supabase.storage
            .from(BUCKET)
            .upload(uniquePath, blob, { contentType });

          if (!error && data?.path) {
            const { data: urlData } = supabase.storage
              .from(BUCKET)
              .getPublicUrl(data.path);
            if (urlData?.publicUrl) {
              resolvedUrl = urlData.publicUrl;
              console.log("[post_media] Upload success:", resolvedUrl);
            }
          } else if (error) {
            // Log the full error so we can diagnose RLS / bucket issues
            console.error("[post_media] Upload FAILED:", {
              message: error.message,
              statusCode: (error as any).statusCode,
              error: (error as any).error,
              path: uniquePath,
              contentType,
            });
          }
        } catch (uploadErr) {
          console.error("[post_media] XHR / blob error:", uploadErr);
        }

        // Encode the type as a prefix so ProfilePostCard can detect it reliably
        // Format: "image::<url>", "music::<url>", "voice::<url>"
        mediaUrls.push(`${prefix}::${resolvedUrl ?? file.uri}`);
      }
    }

    const newPost: Post = {
      id: `post_${Date.now()}`,
      userId,
      content: post.content,
      likes: 0,
      comments: 0,
      shares: 0,
      isLiked: false,
      isSaved: false,
      createdAt: new Date().toISOString(),
      tags: post.tags ?? [],
      mediaUrls: mediaUrls.length ? mediaUrls : undefined,
    } as any;

    // 2. Insert post row into Supabase "posts" table (gracefully fails when table/connection is missing)
    try {
      const { error } = await supabase.from("posts").insert([newPost]);
      if (error) throw error;
    } catch (insertErr) {
      console.warn(
        "Supabase database insert post failed (offline fallback active):",
        insertErr,
      );
    }

    return newPost;
  }

  async getPostsByUser(userId: string): Promise<Post[]> {
    try {
      const queryPromise = supabase
        .from("posts")
        .select("*")
        .eq("userId", userId)
        .order("createdAt", { ascending: false });

      const timeoutPromise = new Promise<Post[]>((_, reject) =>
        setTimeout(() => reject(new Error("Query timeout")), 5000),
      );

      const { data, error } = (await Promise.race([
        queryPromise,
        timeoutPromise,
      ])) as any;

      if (error) throw error;
      return (data as Post[]) || [];
    } catch (err) {
      console.warn(
        "Supabase get posts failed or timed out, returning empty list:",
        err,
      );
      return [];
    }
  }

  /**
   * Call this once (e.g., on app start or from a dev screen) to verify that
   * the `post_media` bucket exists and the current session can upload to it.
   * Results are printed to the console and returned as a string summary.
   */
  static async diagnoseBucket(): Promise<string> {
    const lines: string[] = [];

    // 1. Check auth session
    const { data: session } = await supabase.auth.getSession();
    lines.push(
      `Auth session: ${session?.session ? `uid=${session.session.user.id}` : "NONE (anonymous)"}`,
    );

    // 2. Check bucket exists
    const { data: buckets, error: bucketErr } =
      await supabase.storage.listBuckets();
    if (bucketErr) {
      lines.push(`listBuckets error: ${bucketErr.message}`);
    } else {
      const found = buckets?.find((b) => b.id === BUCKET);
      lines.push(
        `Bucket '${BUCKET}': ${found ? "EXISTS (public=" + found.public + ")" : "NOT FOUND"}`,
      );
    }

    // 3. Try a tiny probe upload (1-byte text file)
    const probe = new Blob(["1"], { type: "text/plain" });
    const probePath = `probe/${Date.now()}.txt`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(probePath, probe, { contentType: "text/plain" });

    if (uploadErr) {
      lines.push(
        `Probe upload FAILED: [${(uploadErr as any).statusCode}] ${uploadErr.message}`,
      );
    } else {
      lines.push(`Probe upload SUCCESS — bucket is writable`);
      // Clean up probe file
      await supabase.storage.from(BUCKET).remove([probePath]);
    }

    const report = lines.join("\n");
    console.log("[diagnoseBucket]\n" + report);
    return report;
  }
}
