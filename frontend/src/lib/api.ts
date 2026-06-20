export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/**
 * Helper to build backend API URLs cleanly.
 * @param path The endpoint path (e.g., '/api/v1/auth/login' or 'api/v1/auth/login')
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
