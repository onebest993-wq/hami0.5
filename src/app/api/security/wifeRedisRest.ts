import { getWifeRedisConfig } from './wifeStoreEnv.ts';

export type WifeRedisJsonResult = {
  ok: boolean;
  status: number;
  result: unknown;
};

/** Upstash REST call. URL path must match the existing store callers byte-for-byte. */
export async function wifeRedisJson(
  path: string,
  method: 'GET' | 'POST' = 'GET',
): Promise<WifeRedisJsonResult> {
  const cfg = getWifeRedisConfig();
  if (!cfg) throw new Error('Redis is not configured.');
  const url = `${cfg.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${cfg.token}` },
  });
  const body = (await res.json().catch(() => null)) as { result?: unknown } | null;
  return { ok: res.ok, status: res.status, result: body?.result };
}
