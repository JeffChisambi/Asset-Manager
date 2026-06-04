export function getApiBase(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  const domain =
    process.env.EXPO_PUBLIC_DOMAIN ||
    process.env.EXPO_PUBLIC_REPL_SLUG ||
    "";
  return domain ? `https://${domain}` : "";
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
  if (!res || !res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
