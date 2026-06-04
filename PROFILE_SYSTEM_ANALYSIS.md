# Kinetic Shoes Profile System - Comprehensive Security & Performance Analysis

**Generated:** June 3, 2026  
**Scope:** Full profile system audit (ProfileScreen, useProfile, services, repositories, edit screen)  
**Analysis Depth:** Error handling, security, validation, performance, production readiness

---

## EXECUTIVE SUMMARY

The profile system has a solid foundation with good fallback mechanisms, but critical production issues exist across security, validation, error handling, and performance. Immediate action required on **9 critical/high severity issues** before production deployment.

**Key Strengths:**
- Graceful fallback chain (Supabase → Local Storage → Mock data)
- Timeout protection on Supabase queries (5s)
- Offline-first architecture with AsyncStorage persistence
- Component memoization for performance

**Key Weaknesses:**
- No input validation or sanitization on profile fields
- XSS vulnerabilities in bio, location, website rendering
- Race condition in profile updates (optimistic updates without rollback)
- Missing permission checks on sensitive operations
- No comprehensive error logging or monitoring
- Incomplete error states in UI
- Memory leak potential in useProfile hook

---

## 1. ERROR HANDLING ISSUES

### 🔴 CRITICAL: Silent Error Swallowing in updateProfile

**Location:** [profile.service.ts](profile.service.ts#L102-L110)

```typescript
async updateProfile(userId: string, data: Partial<User>): Promise<void> {
  // Step 1 — always save locally first (guaranteed, works offline)
  await saveLocalProfile(userId, data);

  // Step 2 — attempt Supabase sync (best-effort; ignored when table missing)
  try {
    await this.repository.updateProfile(userId, data);
  } catch {
    // Intentionally suppressed — local save above is the source of truth
  }
}
```

**Problem:**
- All Supabase update errors are silently swallowed
- No indication to user that sync failed
- Permanent data loss if local storage fails but no error is surfaced
- No retry logic or exponential backoff for transient failures

**Severity:** 🔴 CRITICAL

**Impact:** Users cannot know if their changes synced to the backend. Silent data loss risk.

**Recommendations:**
```typescript
async updateProfile(userId: string, data: Partial<User>): Promise<void> {
  const localSaveResult = await saveLocalProfile(userId, data);
  if (!localSaveResult.success) {
    throw new Error('Failed to save profile locally');
  }

  // Track sync status
  try {
    await this.repository.updateProfile(userId, data);
    // Mark as synced in local storage
    await markProfileSynced(userId);
  } catch (err) {
    // Queue for retry with exponential backoff
    await queueForSyncRetry(userId, data, err);
    // Notify user of sync status
    throw new AppError('Profile saved locally but sync failed', 'SYNC_FAILED', err);
  }
}
```

---

### 🔴 CRITICAL: No Error Handling in useProfile Hook

**Location:** [useProfile.ts](useProfile.ts#L25-L35)

```typescript
const load = useCallback(async () => {
  if (!hasDataRef.current) {
    setIsLoading(true);
  }
  setError(null);

  try {
    const [userData, postsData] = await Promise.all([
      ProfileService.getUser(userId),
      ProfileService.getPosts(userId),
    ]);

    if (!userData) {
      setError("User not found");
    } else {
      hasDataRef.current = true;
      setUser(userData);
      setPosts(postsData);
    }
  } catch {
    setError("Failed to load profile");  // ← Generic, unhelpful error
  }
```

**Problems:**
1. Generic error message with no context for debugging
2. No error code/category to distinguish between different failure types
3. User sees "Failed to load profile" for all scenarios (404, network, timeout, permission denied)
4. No retry attempt after error

**Severity:** 🔴 CRITICAL

**Recommendations:**
```typescript
} catch (err: unknown) {
  const error = err instanceof Error ? err.message : String(err);
  if (error.includes('404') || error.includes('not found')) {
    setError("This user's profile doesn't exist");
  } else if (error.includes('timeout')) {
    setError("Profile loading timed out. Check your connection.");
  } else if (error.includes('permission') || error.includes('403')) {
    setError("You don't have permission to view this profile");
  } else {
    setError(`Failed to load profile: ${error}`);
  }
  // Log with user ID for debugging
  logError('PROFILE_LOAD_FAILED', { userId, error });
}
```

---

### 🟠 HIGH: Unhandled Promise Rejection in EditProfileScreen

**Location:** [edit.tsx](edit.tsx#L109-L127)

```typescript
useEffect(() => {
  let cancelled = false;
  (async () => {
    setIsLoading(true);
    const profile = await ProfileService.getUser(userId);  // ← No error handling
    if (profile && !cancelled) {
      // ...set state
    }
    if (!cancelled) setIsLoading(false);
  })();
  return () => { cancelled = true; };
}, [userId, colors.primary]);
```

**Problems:**
1. If `getUser()` throws, the error is unhandled and promise rejects
2. User sees loading spinner forever
3. No way to retry or navigate away

**Severity:** 🟠 HIGH

**Recommendations:**
```typescript
useEffect(() => {
  let cancelled = false;
  (async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await ProfileService.getUser(userId);
      if (profile && !cancelled) {
        // ...set state
      } else if (!cancelled) {
        setError("Profile not found");
      }
    } catch (err) {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      }
    } finally {
      if (!cancelled) setIsLoading(false);
    }
  })();
  return () => { cancelled = true; };
}, [userId, colors.primary]);
```

---

### 🟠 HIGH: Missing Error Boundary in ProfileScreen

**Location:** [ProfileScreen.tsx](ProfileScreen.tsx#L1-L50)

**Problem:**
- No error boundary wrapper
- A single component error crashes entire profile screen
- No fallback UI for component failures
- User can't recover without full app restart

**Severity:** 🟠 HIGH

**Recommendations:**
1. Wrap ProfileScreen in React Native Error Boundary
2. Provide fallback UI with "Try Again" button
3. Log errors to crash reporting service (Sentry, Bugsnag)

---

### 🟡 MEDIUM: Incomplete Error States in UI

**Location:** [ProfileScreen.tsx](ProfileScreen.tsx) - useProfile integration

**Problem:**
- useProfile returns `error` state but ProfileScreen doesn't display it
- If `error` is set, user sees blank screen

**Recommendations:**
```typescript
if (error) {
  return (
    <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
      <Text style={[styles.errorTitle, { color: colors.foreground }]}>{error}</Text>
      <TouchableOpacity onPress={() => refresh()} style={styles.retryBtn}>
        <Text style={styles.retryBtnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## 2. INPUT VALIDATION & SANITIZATION ISSUES

### 🔴 CRITICAL: No Input Validation on Profile Fields

**Location:** [edit.tsx](edit.tsx#L221-L237)

```typescript
const handleSave = useCallback(async () => {
  if (!displayName.trim()) {  // ← Only checks empty string
    Alert.alert("Name required", "Please enter your display name.");
    return;
  }
  setIsSaving(true);
  try {
    await ProfileService.updateProfile(userId, {
      displayName: displayName.trim(),  // ← No length validation
      username: username.trim(),        // ← No format validation
      bio: bio.trim(),                   // ← No profanity filter
      location: location.trim(),        // ← No validation
      website: website.trim(),           // ← No URL validation
      avatarColor,
      avatarUrl: avatarUri ?? undefined,
      coverUrl: coverUri ?? undefined,
    });
```

**Missing Validations:**
1. **displayName:** No max length enforcement (could be 500 chars in form but stored as-is)
2. **username:** No format validation (allows special chars, spaces, unicode)
3. **bio:** No profanity filter, length validation, or URL detection
4. **location:** No validation for injection attacks
5. **website:** No URL validation, could accept malicious URLs
6. **avatarColor:** No validation that it's a valid hex color

**Severity:** 🔴 CRITICAL

**Recommendations:**
```typescript
// Create validation utilities
function validateProfileFields(data: Partial<User>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.displayName) {
    if (data.displayName.length > 60) errors.push('Display name must be 60 characters or less');
    if (!/^[a-zA-Z0-9\s'-]+$/.test(data.displayName)) errors.push('Display name contains invalid characters');
  }

  if (data.username) {
    if (data.username.length < 3 || data.username.length > 30) 
      errors.push('Username must be 3-30 characters');
    if (!/^[a-zA-Z0-9_-]+$/.test(data.username)) 
      errors.push('Username can only contain letters, numbers, underscores, and hyphens');
  }

  if (data.bio) {
    if (data.bio.length > 160) errors.push('Bio must be 160 characters or less');
    // Basic HTML/script detection
    if (/<[^>]*>/g.test(data.bio)) errors.push('Bio cannot contain HTML tags');
  }

  if (data.website) {
    try {
      new URL(data.website.startsWith('http') ? data.website : `https://${data.website}`);
    } catch {
      errors.push('Please enter a valid website URL');
    }
  }

  if (data.avatarColor) {
    if (!/^#[0-9A-F]{6}$/i.test(data.avatarColor)) 
      errors.push('Invalid color format');
  }

  return { valid: errors.length === 0, errors };
}

// Use in handleSave
const validation = validateProfileFields({
  displayName: displayName.trim(),
  username: username.trim(),
  bio: bio.trim(),
  location: location.trim(),
  website: website.trim(),
  avatarColor,
});

if (!validation.valid) {
  Alert.alert('Validation Error', validation.errors.join('\n'));
  return;
}
```

---

### 🔴 CRITICAL: XSS Vulnerability - Unsanitized Bio/Website Rendering

**Location:** [ProfileScreen.tsx](ProfileScreen.tsx#L170-L185) - AboutTab

```typescript
const AboutTab = memo(({ user }: AboutTabProps) => {
  const colors = useColors();

  const rows: { icon: string; label: string; value: string }[] = [
    {
      icon: "location-outline",
      label: "Location",
      value: user.location || "—",  // ← Directly rendered, no sanitization
    },
    { icon: "calendar-outline", label: "Joined", value: user.joinDate },
    { icon: "link-outline", label: "Website", value: user.website || "—" },  // ← Direct render
  ];

  return (
    <View style={styles.aboutContainer}>
      <View style={[styles.aboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.aboutSection, { color: colors.foreground }]}>Bio</Text>
        <Text style={[styles.aboutBio, { color: colors.foreground }]}>
          {user.bio || "No bio yet."}  // ← Direct render, no sanitization
        </Text>
```

**XSS Risk Scenarios:**
1. User stores `bio: "<script>alert('xss')</script>"` in AsyncStorage
2. React Native Text component may interpret or process malicious content
3. While React Native is safer than web, if data is ever exposed to WebView component it's exploitable

**Severity:** 🔴 CRITICAL

**Recommendations:**
```typescript
// Sanitization utility
function sanitizeText(text: string, maxLength: number = 500): string {
  if (!text) return '';
  
  // Remove any HTML/script tags
  let sanitized = text.replace(/<[^>]*>/g, '');
  
  // Remove control characters except newlines
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Truncate to max length
  sanitized = sanitized.substring(0, maxLength);
  
  return sanitized.trim();
}

// Use in AboutTab
<Text style={[styles.aboutBio, { color: colors.foreground }]}>
  {sanitizeText(user.bio) || "No bio yet."}
</Text>
```

---

### 🔴 CRITICAL: Unsafe URL Handling in Website Links

**Location:** [ProfileHeader.tsx](ProfileHeader.tsx#L75-L83)

```typescript
const handleLink = () => {
  if (user.website) {
    const url = user.website.startsWith("http")
      ? user.website
      : `https://${user.website}`;
    Linking.openURL(url);  // ← No validation of URL
  }
};
```

**Vulnerabilities:**
1. **No protocol whitelist:** Accepts `javascript://`, `data://`, `file://` URLs
2. **No domain validation:** Could open malicious sites
3. **No user confirmation:** Opens URL without asking user

**Severity:** 🔴 CRITICAL

**Recommendations:**
```typescript
const SAFE_PROTOCOLS = ['http://', 'https://'];

function isSafeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return SAFE_PROTOCOLS.some(proto => urlObj.protocol === proto.replace('://', ':'));
  } catch {
    return false;
  }
}

const handleLink = async () => {
  if (user.website) {
    if (!isSafeUrl(user.website)) {
      Alert.alert('Invalid URL', 'This website URL is not valid');
      return;
    }
    const url = user.website.startsWith("http")
      ? user.website
      : `https://${user.website}`;
    
    // Optional: Ask user for confirmation
    Alert.alert(
      'Open Link',
      `Open ${user.website}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open',
          onPress: () => Linking.openURL(url),
        },
      ]
    );
  }
};
```

---

## 3. SECURITY ISSUES

### 🔴 CRITICAL: Missing Permission Checks

**Location:** [ProfileScreen.tsx](ProfileScreen.tsx#L550+) - Store management

```typescript
const handleSaveStore = async () => {
  if (!storeName.trim()) {
    Alert.alert("Required field", "Please enter a store name.");
    return;
  }
  setLoading(true);
  try {
    const title = merchantType === "basic_shop" ? "Basic Shop Owner" : "Independent Vendor";
    await ProfileService.updateProfile(userId, { title });
    // ... creates/updates store

    const config = {
      owner_id: userId,  // ← No check: does userId own this store?
      // ... rest of config
    };

    if (store) {
      await StoreService.updateStore(store.id, config as any);  // ← No auth check
    } else {
      await StoreService.createStore(config as any);
    }
```

**Problems:**
1. No backend check that userId owns the store being edited
2. Client-side userId is not trustworthy - frontend can be spoofed
3. No permission verification before allowing store deletion

**Severity:** 🔴 CRITICAL

**Recommendations:**
```typescript
// Backend API should verify ownership:
// PUT /api/stores/:storeId
// - Verify authenticated user is store owner
// - Check JWT token matches owner_id in database
// - Reject if user_id in JWT != store.owner_id

// Client-side should show permission errors:
try {
  await StoreService.updateStore(store.id, config as any);
} catch (err: any) {
  if (err.status === 403) {
    Alert.alert('Permission Denied', 'You do not have permission to edit this store');
    return;
  }
  // ... handle other errors
}
```

---

### 🔴 CRITICAL: Unvalidated File Uploads in Post Creation

**Location:** [post.repository.ts](post.repository.ts#L28-L75)

```typescript
async createPost(
  userId: string,
  post: Omit<Post, "id" | "userId" | "createdAt">,
  mediaFiles?: { uri: string; name: string }[],
): Promise<Post> {
  const mediaUrls: string[] = [];

  const typePrefix = (name: string): "image" | "music" | "voice" => {
    if (name.startsWith("image")) return "image";
    if (name.startsWith("music")) return "music";
    return "voice";
  };

  if (mediaFiles && mediaFiles.length) {
    for (const file of mediaFiles) {
      const prefix = typePrefix(file.name);
      let resolvedUrl: string | null = null;

      try {
        // ... XMLHttpRequest blob conversion
        const fileExt = file.name.split(".").pop() || "bin";
        const uniquePath = `posts/${userId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
```

**Validation Gaps:**
1. **No file size limit check:** Could upload 10GB+ files
2. **No file type validation:** Accepts any extension (`.exe`, `.bat`, etc.)
3. **Extension spoofing:** `malware.exe.jpg` would pass `typePrefix()` check
4. **No MIME type verification:** Relies on name prefix only
5. **No virus scanning:** Malicious files uploaded directly

**Severity:** 🔴 CRITICAL

**Recommendations:**
```typescript
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav'];

async function validateMediaFile(file: { uri: string; name: string }): Promise<{
  valid: boolean;
  error?: string;
  mimeType?: string;
}> {
  // 1. Check file size
  const fileSize = await getFileSizeFromUri(file.uri);
  if (fileSize > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` };
  }

  // 2. Validate extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp3', 'm4a', 'aac', 'wav'].includes(ext)) {
    return { valid: false, error: 'Unsupported file type' };
  }

  // 3. Get actual MIME type from file contents (not extension)
  const mimeType = await getMimeTypeFromFile(file.uri);
  
  // 4. Validate MIME type matches content
  if (!isValidMimeType(ext, mimeType)) {
    return { valid: false, error: 'File content does not match extension' };
  }

  return { valid: true, mimeType };
}

// Use in createPost:
if (mediaFiles && mediaFiles.length) {
  for (const file of mediaFiles) {
    const validation = await validateMediaFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    // ... continue upload with validated file
  }
}
```

---

### 🟠 HIGH: Weak Avatar Color Validation

**Location:** [profile.repository.ts](profile.repository.ts#L36)

```typescript
async createProfile(userId: string, data: Partial<User>): Promise<void> {
  const payload: Record<string, any> = {
    id: userId,
    username: data.username || "",
    display_name: data.displayName || "",
    avatar_color: data.avatarColor || "#13B734",  // ← No validation
```

**Problem:**
- Any string accepted as color (could be SQL injection if stored without escaping)
- React Native doesn't validate hex colors, displays as white if invalid

**Severity:** 🟠 HIGH

**Recommendations:**
```typescript
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

const FALLBACK_COLOR = "#13B734";

avatar_color: isValidHexColor(data.avatarColor ?? "") ? data.avatarColor : FALLBACK_COLOR,
```

---

### 🟠 HIGH: No Rate Limiting on Profile Updates

**Location:** [profile.service.ts](profile.service.ts#L102-L110)

**Problem:**
- User can spam profile updates (100+ per second)
- Each update writes to AsyncStorage, potentially causing:
  - Storage quota exhaustion
  - App lag/ANR (Application Not Responding)
  - Lost writes due to concurrent access

**Severity:** 🟠 HIGH

**Recommendations:**
```typescript
class RateLimiter {
  private lastUpdateTime = 0;
  private minIntervalMs = 500; // Min 500ms between updates

  async checkLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;
    
    if (timeSinceLastUpdate < this.minIntervalMs) {
      const waitTime = this.minIntervalMs - timeSinceLastUpdate;
      await new Promise(r => setTimeout(r, waitTime));
    }
    
    this.lastUpdateTime = Date.now();
  }
}

const profileUpdateLimiter = new RateLimiter();

async updateProfile(userId: string, data: Partial<User>): Promise<void> {
  await profileUpdateLimiter.checkLimit();
  // ... rest of update logic
}
```

---

## 4. RACE CONDITIONS & CONCURRENCY ISSUES

### 🔴 CRITICAL: Race Condition in useProfile Hook

**Location:** [useProfile.ts](useProfile.ts#L37-L47)

```typescript
useEffect(() => {
  hasDataRef.current = false;
  setUser(null);
  setPosts([]);
  setError(null);
  load();
}, [load]);  // ← Dependency on 'load' function

// But 'load' has userId as dependency:
const load = useCallback(async () => {
  if (!hasDataRef.current) {
    setIsLoading(true);
  }
  setError(null);

  try {
    const [userData, postsData] = await Promise.all([
      ProfileService.getUser(userId),  // ← Uses userId
      ProfileService.getPosts(userId),
    ]);
```

**Race Condition Scenario:**
1. User navigates to profile A
2. useEffect calls `load()`
3. Before request completes, user navigates to profile B
4. useEffect calls `load()` for profile B
5. If profile A response arrives after B response, B's data gets overwritten with A's data

**Severity:** 🔴 CRITICAL

**Recommendations:**
```typescript
export function useProfile(userId: string): UseProfileReturn {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasDataRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    // Cancel previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    if (!hasDataRef.current) {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Pass abort signal to service
      const [userData, postsData] = await Promise.all([
        ProfileService.getUser(userId, abortControllerRef.current.signal),
        ProfileService.getPosts(userId, abortControllerRef.current.signal),
      ]);

      // Only update state if this request wasn't aborted
      if (!abortControllerRef.current.signal.aborted) {
        if (!userData) {
          setError("User not found");
        } else {
          hasDataRef.current = true;
          setUser(userData);
          setPosts(postsData);
        }
      }
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        setError("Failed to load profile");
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    hasDataRef.current = false;
    setUser(null);
    setPosts([]);
    setError(null);
    load();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [userId, load]); // Keep userId in dependencies

  return { user, posts, isLoading, error, refresh: load };
}
```

---

### 🟠 HIGH: Optimistic Update Without Rollback

**Location:** [edit.tsx](edit.tsx#L230-L250)

```typescript
const handleSave = useCallback(async () => {
  // ... validation
  setIsSaving(true);
  try {
    await ProfileService.updateProfile(userId, {
      displayName: displayName.trim(),
      username: username.trim(),
      bio: bio.trim(),
      location: location.trim(),
      website: website.trim(),
      avatarColor,
      avatarUrl: avatarUri ?? undefined,
      coverUrl: coverUri ?? undefined,
    });

    // Update chat context (optimistic)
    if (currentUser) {
      setCurrentUser({  // ← Updates UI immediately
        ...currentUser,
        displayName: displayName.trim(),
        username: username.trim(),
        avatarColor,
      });
    }

    router.back();
  } catch (err) {
    Alert.alert("Save failed", "Something went wrong. Please try again.");  // ← No rollback
  }
```

**Problems:**
1. Chat context updated optimistically before save succeeds
2. If save fails, UI shows new values but backend has old values
3. No rollback to previous state on error
4. User navigates back before knowing if save succeeded

**Severity:** 🟠 HIGH

**Recommendations:**
```typescript
const handleSave = useCallback(async () => {
  // ... validation
  
  // Store previous values for rollback
  const previousUser = { ...currentUser };
  
  setIsSaving(true);
  try {
    await ProfileService.updateProfile(userId, {
      displayName: displayName.trim(),
      username: username.trim(),
      bio: bio.trim(),
      location: location.trim(),
      website: website.trim(),
      avatarColor,
      avatarUrl: avatarUri ?? undefined,
      coverUrl: coverUri ?? undefined,
    });

    // Only update after confirmed success
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        displayName: displayName.trim(),
        username: username.trim(),
        avatarColor,
      });
    }

    router.back();
  } catch (err) {
    // Rollback on failure
    if (previousUser && currentUser?.id === previousUser.id) {
      setCurrentUser(previousUser);
    }
    Alert.alert(
      "Save failed",
      err instanceof Error ? err.message : "Something went wrong. Please try again."
    );
  } finally {
    setIsSaving(false);
  }
}, [userId, currentUser, setCurrentUser, router]);
```

---

### 🟡 MEDIUM: Concurrent AsyncStorage Writes

**Location:** [profile.service.ts](profile.service.ts#L66-L81)

```typescript
async function saveLocalProfile(
  userId: string,
  data: Partial<User>,
): Promise<void> {
  try {
    // Merge with any existing local data
    const existing = (await loadLocalProfile(userId)) ?? {};
    const merged: Partial<User> = { ...existing, ...data };
    await AsyncStorage.setItem(profileKey(userId), JSON.stringify(merged));
  } catch {}
}
```

**Problem:**
- No locking mechanism between read and write
- If called twice concurrently:
  1. Thread A reads profile: `{displayName: "A"}`
  2. Thread B reads profile: `{displayName: "A"}`
  3. Thread A writes: `{displayName: "A", bio: "new"}`
  4. Thread B writes: `{displayName: "B"}` (overwrites A's bio)

**Severity:** 🟡 MEDIUM

**Recommendations:**
```typescript
class AsyncStorageLock {
  private locks = new Map<string, Promise<void>>();

  async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
    
    const lock = fn().finally(() => this.locks.delete(key));
    this.locks.set(key, lock);
    return lock;
  }
}

const storageLock = new AsyncStorageLock();

async function saveLocalProfile(userId: string, data: Partial<User>): Promise<void> {
  await storageLock.runExclusive(profileKey(userId), async () => {
    const existing = (await loadLocalProfile(userId)) ?? {};
    const merged: Partial<User> = { ...existing, ...data };
    await AsyncStorage.setItem(profileKey(userId), JSON.stringify(merged));
  });
}
```

---

## 5. MEMORY LEAKS & PERFORMANCE ISSUES

### 🟠 HIGH: Potential Memory Leak in useProfile

**Location:** [useProfile.ts](useProfile.ts#L36-L47)

```typescript
useEffect(() => {
  hasDataRef.current = false;
  setUser(null);
  setPosts([]);
  setError(null);
  load();
}, [load]);  // ← Missing cleanup function
```

**Problem:**
- If `load()` creates timers/intervals, they're not cleaned up when userId changes
- Large `posts` array kept in memory even after unmount

**Severity:** 🟠 HIGH

**Recommendations:**
```typescript
useEffect(() => {
  hasDataRef.current = false;
  setUser(null);
  setPosts([]);
  setError(null);
  load();

  // Return cleanup function
  return () => {
    // Cancel any in-flight requests (see Race Condition fix above)
    abortControllerRef.current?.abort();
    
    // Clear refs on unmount
    hasDataRef.current = false;
  };
}, [userId, load]);
```

---

### 🟠 HIGH: Unbounded AsyncStorage Growth

**Location:** [profile.service.ts](profile.service.ts#L209-L225)

```typescript
async createPost(
  userId: string,
  content: string,
  tags: string[],
  mediaFiles?: { uri: string; name: string }[],
): Promise<Post> {
  // ... create post
  
  // Also save locally in AsyncStorage for fallback / local caching
  try {
    const currentLocalPostsRaw = await AsyncStorage.getItem(
      `profile_posts_${userId}`,
    );
    const currentLocalPosts: Post[] = currentLocalPostsRaw
      ? JSON.parse(currentLocalPostsRaw)
      : [];
    await AsyncStorage.setItem(
      `profile_posts_${userId}`,
      JSON.stringify([newPost, ...currentLocalPosts]),  // ← No limit on array size
    );
```

**Problems:**
1. Posts cached indefinitely without cleanup
2. AsyncStorage has ~10MB limit on most platforms
3. App will crash when storage fills up
4. No TTL (time-to-live) on cached posts

**Severity:** 🟠 HIGH

**Recommendations:**
```typescript
const MAX_CACHED_POSTS = 100;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function saveLocalPosts(userId: string, newPost: Post): Promise<void> {
  try {
    const cacheKey = `profile_posts_${userId}`;
    const currentCacheRaw = await AsyncStorage.getItem(cacheKey);
    const currentCache: Post[] = currentCacheRaw ? JSON.parse(currentCacheRaw) : [];
    
    // Add new post
    const updated = [newPost, ...currentCache];
    
    // 1. Trim to max size
    const trimmed = updated.slice(0, MAX_CACHED_POSTS);
    
    // 2. Remove expired posts (older than TTL)
    const now = Date.now();
    const filtered = trimmed.filter(post => {
      const postTime = new Date(post.createdAt).getTime();
      return (now - postTime) < CACHE_TTL_MS;
    });
    
    await AsyncStorage.setItem(cacheKey, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Error caching posts:', err);
  }
}
```

---

### 🟡 MEDIUM: Missing Image Cache Management

**Location:** [ProfileScreen.tsx](ProfileScreen.tsx) & [edit.tsx](edit.tsx)

**Problem:**
- Avatar and cover images loaded from Supabase without caching
- No image memory cache (Image component caches but it's limited)
- Large images could cause memory spikes
- No image optimization (resizing, compression)

**Severity:** 🟡 MEDIUM

**Recommendations:**
```typescript
// Create image cache utility
const imageCache = new Map<string, string>();
const MAX_CACHE_SIZE = 50;

function getCachedImageUrl(url: string): string {
  if (imageCache.has(url)) return imageCache.get(url)!;
  
  if (imageCache.size >= MAX_CACHE_SIZE) {
    const firstKey = imageCache.keys().next().value;
    imageCache.delete(firstKey);
  }
  
  imageCache.set(url, url);
  return url;
}

// Use optimized image loading
<Image
  source={{ uri: getCachedImageUrl(user.avatarUrl || '') }}
  style={styles.avatar}
  onError={() => console.log('Image failed to load')}
  onLoad={() => console.log('Image loaded')}
/>
```

---

## 6. MISSING FEATURES FOR PRODUCTION

### 🟡 MEDIUM: No Profile Caching Strategy

**Problem:**
- Every profile view refetches from Supabase
- No cache invalidation logic
- No conditional GET (If-Modified-Since headers)
- Wasted bandwidth for unchanged profiles

**Recommendations:**
```typescript
interface CachedProfile {
  data: User;
  timestamp: number;
  etag?: string;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class ProfileCache {
  private cache = new Map<string, CachedProfile>();

  getCached(userId: string): User | null {
    const cached = this.cache.get(userId);
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > CACHE_DURATION) {
      this.cache.delete(userId);
      return null;
    }
    
    return cached.data;
  }

  set(userId: string, data: User, etag?: string): void {
    this.cache.set(userId, {
      data,
      timestamp: Date.now(),
      etag,
    });
  }

  clear(userId: string): void {
    this.cache.delete(userId);
  }
}

// Use in service:
async getUser(userId: string): Promise<User | null> {
  const cached = profileCache.getCached(userId);
  if (cached) return cached;
  
  // ... fetch from Supabase
  profileCache.set(userId, user);
  return user;
}
```

---

### 🟡 MEDIUM: No Offline Conflict Resolution

**Problem:**
- User edits profile offline, then makes another edit online
- Both edits synced independently - could cause data loss
- No conflict detection or merge strategy

**Recommendations:**
```typescript
interface ProfileVersion {
  data: Partial<User>;
  timestamp: number;
  hash: string; // Hash to detect conflicts
}

async updateProfile(userId: string, data: Partial<User>): Promise<void> {
  const localSaveResult = await saveLocalProfile(userId, data);
  
  // Get version info for conflict detection
  const savedData = await loadLocalProfile(userId);
  const hash = calculateHash(savedData);
  
  try {
    // Send with version info
    await this.repository.updateProfile(userId, data, { hash });
  } catch (err: any) {
    if (err.code === 'CONFLICT') {
      // Handle conflict - merge strategies:
      // 1. Server wins: discard local changes
      // 2. Client wins: force push (risky)
      // 3. Merge: combine both versions intelligently
      await handleConflict(userId, data, err.serverVersion);
    }
  }
}
```

---

### 🟡 MEDIUM: No Profile Verification/Badge System

**Problem:**
- `isVerified` field exists but never set
- No email/phone verification flow
- User can claim to be anyone

**Recommendations:**
1. Add email verification on account creation
2. Add phone verification for certain actions
3. Add verification badge in UI for verified users
4. Log and audit verification changes

---

### 🟡 MEDIUM: No Profile Activity Logging

**Problem:**
- No audit trail of profile changes
- Can't detect unauthorized edits
- No way to restore previous profile state

**Recommendations:**
```typescript
interface ProfileEdit {
  userId: string;
  timestamp: number;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  ipAddress?: string;
  deviceId?: string;
}

async function logProfileEdit(
  userId: string,
  changes: Partial<User>,
  oldProfile: User
): Promise<void> {
  const edits: ProfileEdit['changes'] = [];
  
  for (const [key, value] of Object.entries(changes)) {
    const oldValue = (oldProfile as any)[key];
    if (oldValue !== value) {
      edits.push({
        field: key,
        oldValue,
        newValue: value,
      });
    }
  }
  
  if (edits.length > 0) {
    await saveProfileEditLog({
      userId,
      timestamp: Date.now(),
      changes: edits,
    });
  }
}
```

---

## 7. EDGE CASES & UNDEFINED BEHAVIOR

### 🟡 MEDIUM: Profile Tab "About" Doesn't Handle Missing Data Gracefully

**Location:** [ProfileScreen.tsx](ProfileScreen.tsx#L170-L185)

```typescript
const rows: { icon: string; label: string; value: string }[] = [
  {
    icon: "location-outline",
    label: "Location",
    value: user.location || "—",
  },
  { icon: "calendar-outline", label: "Joined", value: user.joinDate },  // ← No fallback
  { icon: "link-outline", label: "Website", value: user.website || "—" },
];
```

**Problem:**
- `user.joinDate` could be undefined, displays as blank

**Fix:**
```typescript
value: user.joinDate || "Not specified",
```

---

### 🟡 MEDIUM: Store Deletion Without Checking for Active Orders

**Location:** [ProfileScreen.tsx](ProfileScreen.tsx#L350-L390)

```typescript
{
  text: "Delete Permanently",
  style: "destructive",
  onPress: async () => {
    setDeleteLoading(true);
    try {
      await StoreService.deleteStore(store.id, userId);  // ← No preconditions checked
      onDeleteStore?.(store.id);
```

**Problem:**
- No check if store has active orders
- Could lose customer orders if deleted
- No soft-delete / archive option

**Recommendations:**
1. Check for active orders before allowing deletion
2. Soft-delete stores (mark as deleted, keep data)
3. Archive after 30-day grace period

---

### 🟡 MEDIUM: Image Selection Without Validation

**Location:** [edit.tsx](edit.tsx#L155-L180)

```typescript
const pickAvatarPhoto = useCallback(async () => {
  const allowed = await requestPermission();
  if (!allowed) return;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
    base64: false,
  });
  if (!result.canceled && result.assets.length > 0) {
    setAvatarUri(result.assets[0].uri);  // ← No size/type validation
  }
}, [requestPermission]);
```

**Problems:**
1. No file size check (could be 10MB+ image)
2. No MIME type validation (could be video with .jpg extension)
3. No image dimension validation

**Recommendations:**
```typescript
const pickAvatarPhoto = useCallback(async () => {
  const allowed = await requestPermission();
  if (!allowed) return;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
    base64: false,
  });
  if (!result.canceled && result.assets.length > 0) {
    const asset = result.assets[0];
    
    // Validate file size (max 5MB)
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert('File Too Large', 'Please choose an image smaller than 5MB');
      return;
    }
    
    // Validate dimensions
    if (asset.width && asset.height && (asset.width < 200 || asset.height < 200)) {
      Alert.alert('Image Too Small', 'Please choose an image at least 200x200 pixels');
      return;
    }
    
    setAvatarUri(asset.uri);
  }
}, [requestPermission]);
```

---

## 8. NETWORK & OFFLINE ISSUES

### 🟠 HIGH: No Network Status Detection

**Problem:**
- App doesn't check network connectivity
- Assumes network is always available for Supabase calls
- User gets generic timeout error instead of "no internet" message

**Recommendations:**
```typescript
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(!!state.isConnected);
    });

    return unsubscribe;
  }, []);

  return isConnected;
}

// Use in ProfileScreen:
const isOnline = useNetworkStatus();

useEffect(() => {
  if (!isOnline) {
    Alert.alert(
      'No Internet Connection',
      'Profile changes will be saved locally and synced when online',
      [{ text: 'OK' }]
    );
  }
}, [isOnline]);
```

---

### 🟠 HIGH: No Retry Strategy for Failed Syncs

**Problem:**
- If Supabase update fails, user is notified but no automatic retry
- Edit is lost forever if user doesn't manually save again
- No exponential backoff for transient failures

**Recommendations:**
```typescript
interface SyncQueue {
  userId: string;
  data: Partial<User>;
  attemptCount: number;
  lastAttempt: number;
  nextRetry: number;
}

class SyncQueueManager {
  private queue: Map<string, SyncQueue> = new Map();

  async addToQueue(userId: string, data: Partial<User>): Promise<void> {
    this.queue.set(userId, {
      userId,
      data,
      attemptCount: 0,
      lastAttempt: 0,
      nextRetry: Date.now(),
    });

    await this.procesQueue();
  }

  private async procesQueue(): Promise<void> {
    for (const [key, item] of this.queue) {
      if (Date.now() < item.nextRetry) continue;

      const backoffMs = Math.min(1000 * Math.pow(2, item.attemptCount), 60000);

      try {
        await ProfileService.updateProfile(item.userId, item.data);
        this.queue.delete(key);
      } catch (err) {
        item.attemptCount++;
        item.lastAttempt = Date.now();
        item.nextRetry = Date.now() + backoffMs;

        if (item.attemptCount >= 5) {
          // Give up after 5 attempts
          console.error('Failed to sync profile after 5 attempts:', key);
          // Notify user to manually retry
        }
      }
    }
  }
}
```

---

## 9. DATA PERSISTENCE ISSUES

### 🟠 HIGH: AsyncStorage Decode Errors Not Handled

**Location:** [profile.service.ts](profile.service.ts#L58-L65)

```typescript
async function loadLocalProfile(userId: string): Promise<Partial<User> | null> {
  try {
    const raw = await AsyncStorage.getItem(profileKey(userId));
    return raw ? (JSON.parse(raw) as Partial<User>) : null;  // ← Could throw if corrupted
  } catch {
    return null;
  }
}
```

**Problem:**
- If AsyncStorage data is corrupted (partially written, old format), `JSON.parse()` throws
- Silently returns null, user loses profile data
- No migration for schema changes

**Recommendations:**
```typescript
async function loadLocalProfile(userId: string): Promise<Partial<User> | null> {
  try {
    const raw = await AsyncStorage.getItem(profileKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    
    // Validate schema
    if (!parsed.id || typeof parsed.displayName !== 'string') {
      console.warn('Invalid profile schema, clearing cache:', userId);
      await AsyncStorage.removeItem(profileKey(userId));
      return null;
    }

    return parsed as Partial<User>;
  } catch (err) {
    console.error('Failed to parse cached profile:', err);
    
    // Clear corrupted data
    try {
      await AsyncStorage.removeItem(profileKey(userId));
    } catch {}
    
    return null;
  }
}
```

---

### 🟡 MEDIUM: No Storage Quota Management

**Problem:**
- App doesn't check AsyncStorage quota
- Could fail silently if quota exceeded
- No cleanup strategy for old data

**Recommendations:**
```typescript
async function checkStorageQuota(): Promise<{
  used: number;
  limit: number;
  percentUsed: number;
}> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    let totalSize = 0;

    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalSize += new Blob([value]).size;
      }
    }

    const limit = 10 * 1024 * 1024; // 10MB (varies by platform)
    return {
      used: totalSize,
      limit,
      percentUsed: (totalSize / limit) * 100,
    };
  } catch (err) {
    console.error('Failed to check storage quota:', err);
    return { used: 0, limit: 10 * 1024 * 1024, percentUsed: 0 };
  }
}

// Periodically cleanup if quota exceeds 80%
async function maybeCleanupStorage(): Promise<void> {
  const quota = await checkStorageQuota();
  if (quota.percentUsed > 80) {
    await cleanupOldCache();
  }
}
```

---

## 10. TIMEOUT & PERFORMANCE

### 🟡 MEDIUM: Hardcoded 5-Second Timeout May Be Too Short

**Location:** [profile.repository.ts](profile.repository.ts#L20-L28), [post.repository.ts](post.repository.ts#L88-L96)

```typescript
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error("Query timeout")), 5000),
);

const { data, error } = (await Promise.race([
  queryPromise,
  timeoutPromise,
])) as any;
```

**Problem:**
- 5s timeout too aggressive for:
  - Slow networks (3G, rural areas)
  - Large result sets
  - High server load
- Too lenient for:
  - Quick operations (may wait unnecessarily)

**Recommendations:**
```typescript
const NETWORK_TIMEOUTS = {
  QUICK_QUERY: 3000,      // ~1KB response
  NORMAL_QUERY: 8000,     // ~50KB response
  LARGE_QUERY: 15000,     // ~500KB response
  IMAGE_UPLOAD: 30000,    // File uploads
};

async function getUserProfile(
  userId: string,
  timeoutMs = NETWORK_TIMEOUTS.NORMAL_QUERY
): Promise<User | null> {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Query timeout")), timeoutMs)
    );

    const { data, error } = await Promise.race([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      timeoutPromise,
    ]);
    // ...
  }
}
```

---

## SUMMARY TABLE

| Severity | Category | Issue | File(s) | Impact |
|----------|----------|-------|---------|--------|
| 🔴 CRITICAL | Error Handling | Silent error swallowing in updateProfile | profile.service.ts | Users can't detect sync failures |
| 🔴 CRITICAL | Error Handling | No error handling in useProfile | useProfile.ts | Loading spinner hangs forever |
| 🔴 CRITICAL | Validation | No input validation on profile fields | edit.tsx | Storage of invalid/malicious data |
| 🔴 CRITICAL | Security | XSS via unsanitized bio/location/website | ProfileScreen.tsx | Potential injection attacks |
| 🔴 CRITICAL | Security | Unsafe URL handling in links | ProfileHeader.tsx | User can be tricked to malicious sites |
| 🔴 CRITICAL | Security | Missing permission checks on store management | ProfileScreen.tsx | Unauthorized store access |
| 🔴 CRITICAL | Security | Unvalidated file uploads | post.repository.ts | Malware uploads, storage exhaustion |
| 🔴 CRITICAL | Race Conditions | Race condition in useProfile hook | useProfile.ts | Wrong user data displayed |
| 🟠 HIGH | Error Handling | Unhandled promise rejection in EditProfileScreen | edit.tsx | Loading spinner hangs |
| 🟠 HIGH | Error Handling | Missing error boundary | ProfileScreen.tsx | App crash on component error |
| 🟠 HIGH | Security | Weak avatar color validation | profile.repository.ts | Potential injection |
| 🟠 HIGH | Security | No rate limiting on updates | profile.service.ts | DoS/storage exhaustion |
| 🟠 HIGH | Race Conditions | Optimistic update without rollback | edit.tsx | Inconsistent UI state on failure |
| 🟠 HIGH | Memory | Unbounded AsyncStorage growth | profile.service.ts | App crash when storage full |
| 🟠 HIGH | Memory | Missing image cache management | ProfileScreen.tsx, edit.tsx | Memory spikes on large images |
| 🟠 HIGH | Network | No network status detection | profile system | Generic timeout errors |
| 🟠 HIGH | Network | No retry strategy for failed syncs | profile.service.ts | Lost edits on transient failures |
| 🟠 HIGH | Persistence | AsyncStorage decode errors | profile.service.ts | Silent data loss on corruption |
| 🟡 MEDIUM | Concurrency | Concurrent AsyncStorage writes | profile.service.ts | Data overwrite on concurrent updates |
| 🟡 MEDIUM | Features | No profile caching | profile.service.ts | Wasted bandwidth |
| 🟡 MEDIUM | Features | No offline conflict resolution | profile.service.ts | Data loss on offline edits |
| 🟡 MEDIUM | Features | No profile verification system | profile.ts | Anyone can impersonate anyone |
| 🟡 MEDIUM | Features | No profile activity logging | profile system | No audit trail |
| 🟡 MEDIUM | Edge Cases | Missing data not handled in About tab | ProfileScreen.tsx | Blank values displayed |
| 🟡 MEDIUM | Edge Cases | Store deletion without order check | ProfileScreen.tsx | Lost customer data |
| 🟡 MEDIUM | Edge Cases | Image validation missing | edit.tsx | Large/wrong format images |
| 🟡 MEDIUM | Timeout | Hardcoded 5s timeout may be suboptimal | Multiple files | Timeout errors on slow networks |

---

## IMPLEMENTATION PRIORITY

### Phase 1: Critical Security (Week 1)
1. Add input validation to all profile fields
2. Sanitize bio/location/website for XSS
3. Validate file uploads (size, MIME type)
4. Add permission checks on store operations
5. Implement URL validation for links

### Phase 2: Error Handling & UX (Week 2)
1. Replace silent errors with user-facing messages
2. Add error boundary to ProfileScreen
3. Implement retry UI for failed operations
4. Show network status in UI
5. Add comprehensive error logging

### Phase 3: Performance & Stability (Week 3)
1. Fix race condition in useProfile
2. Add optimistic update rollback
3. Implement AsyncStorage locking
4. Add cache management
5. Implement rate limiting

### Phase 4: Production Features (Week 4)
1. Profile caching strategy
2. Profile activity logging
3. Email/phone verification
4. Offline conflict resolution
5. Sync queue with retry logic

---

## TESTING RECOMMENDATIONS

### Unit Tests
- Input validation for all profile fields
- XSS sanitization functions
- Error handling paths
- Race condition fixes

### Integration Tests
- Profile save/load with Supabase/offline
- Image upload with various file types/sizes
- Concurrent profile updates
- Network timeout scenarios

### Security Tests
- Penetration testing for XSS in all fields
- File upload security (malware scanning)
- Permission checks on store operations
- URL validation with malicious links

### Performance Tests
- Large post list caching (1000+ posts)
- Image memory usage (10+ large images)
- AsyncStorage size limits (50MB)
- Concurrent update stress test (100+ updates)
