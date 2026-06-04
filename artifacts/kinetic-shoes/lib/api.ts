export function getApiBase(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  const domain =
    process.env.EXPO_PUBLIC_DOMAIN ||
    process.env.EXPO_PUBLIC_REPL_SLUG ||
    "";
  if (!domain) {
    console.warn("[api] EXPO_PUBLIC_DOMAIN not set — API calls will fail on native");
  }
  return domain ? `https://${domain}` : "";
}

export class ChatAuthError extends Error {
  constructor() {
    super("Unauthorized: token expired or invalid");
    this.name = "ChatAuthError";
  }
}

export async function chatApiFetch(
  path: string,
  method: string,
  token: string,
  body?: unknown,
): Promise<Response | null> {
  const base = getApiBase();
  if (!base) return null;
  try {
    return await fetch(`${base}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    return null;
  }
}

export async function chatApiCall<T = unknown>(
  path: string,
  method: string,
  token: string,
  body?: unknown,
): Promise<T | null> {
  const res = await chatApiFetch(path, method, token, body);
  if (!res) return null;
  if (res.status === 401) throw new ChatAuthError();
  if (!res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
