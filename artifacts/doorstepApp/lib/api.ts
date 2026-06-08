export function getApiBase(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return window.location.origin.replace(/:\d+$/, ':3000');
    }
    return window.location.origin;
  }
  
  const domain =
    process.env.EXPO_PUBLIC_DOMAIN ||
    process.env.EXPO_PUBLIC_REPL_SLUG ||
    "";
  if (!domain) {
    console.warn("[api] API URL not configured — API calls will fail on native");
  }
  return domain ? `https://${domain}` : "http://localhost:3000";
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15000,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
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
    return await fetchWithTimeout(`${base}${path}`, {
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
