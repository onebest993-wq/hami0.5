/** Shared env helpers for WIFE server stores. */

export function getWifeEnv(name: string): string {
  const raw = process.env[name];
  return typeof raw === 'string' ? raw.trim() : '';
}

export function isWifeProduction(): boolean {
  return getWifeEnv('NODE_ENV').toLowerCase() === 'production';
}

export function getWifeRedisConfig(): { baseUrl: string; token: string } | null {
  const url = getWifeEnv('WIFE_REDIS_REST_URL');
  const token = getWifeEnv('WIFE_REDIS_REST_TOKEN');
  if (!url || !token) return null;
  return { baseUrl: url.replace(/\/+$/, ''), token };
}

export function hasWifeRedisConfig(): boolean {
  return getWifeRedisConfig() !== null;
}
