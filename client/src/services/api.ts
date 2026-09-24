const base = import.meta.env.VITE_API_URL ?? '/api';
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('panel_token');
  const response = await fetch(`${base}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : { success: false, message: await response.text() };
  if (!response.ok || !payload.success) throw new Error(payload.message ?? 'Request failed');
  return payload.data as T;
}
export type User = { id: string; name: string; email: string; role: string };
export type Stats = { totals: { total: number; active: number; inactive: number; linked: number; unlinked: number; blocked: number }; recentActivity: { id: string; action: string; resource: string; createdAt: string; user?: { name: string } }[]; recentSessions: { id: string; status: string; updatedAt: string; account: { username: string | null } }[]; system: { api: string; database: string } };
export type NumberItem = { id: string; country: string; countryCode: string; phoneNumber: string; provider: string; status: string; telegramLinked: boolean; createdAt: string; lastActivityAt: string | null };