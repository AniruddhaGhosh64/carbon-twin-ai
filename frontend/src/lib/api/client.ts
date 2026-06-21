import { getSession } from "next-auth/react";

export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  userId?: string;
}

/**
 * Standardized API request handler with retry logic, timeouts, and auth injection.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { timeout = 8000, retries = 2, userId, ...rest } = options;

  // Resolve active API Base URL. On client-side (browser), use relative URLs so requests are proxied via Next.js rewrites.
  // On server-side, use the direct API URL.
  const API_BASE_URL = typeof window !== "undefined"
    ? ""
    : (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${cleanPath}`;

  const headers = new Headers(rest.headers);
  if (!headers.has("Content-Type") && !(rest.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Inject user session context on client-side requests if userId isn't explicitly supplied
  let activeUserId = userId;
  if (!activeUserId && typeof window !== "undefined") {
    try {
      const session = await getSession();
      activeUserId = session?.user?.id || session?.user?.email || undefined;
    } catch {
      // Gracefully ignore session fetch issues on client during initial load
    }
  }

  if (activeUserId) {
    headers.set("X-User-Id", activeUserId);
  }

  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...rest,
        headers,
        signal: controller.signal,
      });
      clearTimeout(id);

      if (!response.ok) {
        let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errorDetail = typeof errData.detail === "string" 
              ? errData.detail 
              : JSON.stringify(errData.detail);
          }
        } catch {
          // Failed to parse JSON error, fall back to default HTTP string
        }
        
        throw new Error(errorDetail);
      }

      if (response.status === 204) {
        return null as unknown as T;
      }

      return await response.json();
    } catch (err: unknown) {
      clearTimeout(id);

      const isAbort = err instanceof Error && err.name === "AbortError";
      const isNetwork = err instanceof TypeError;

      if ((isAbort || isNetwork) && attempt < retries) {
        attempt++;
        // Wait before retrying (exponential backoff: 500ms, 1000ms...)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 500));
        continue;
      }

      throw err;
    }
  }
}

export const api = {
  get: <T = unknown>(path: string, options?: RequestOptions) => 
    request<T>(path, { ...options, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) => 
    request<T>(path, { ...options, method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) => 
    request<T>(path, { ...options, method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T = unknown>(path: string, options?: RequestOptions) => 
    request<T>(path, { ...options, method: "DELETE" }),
};
export default api;
