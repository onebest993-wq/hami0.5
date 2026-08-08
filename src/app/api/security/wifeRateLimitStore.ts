/**
 * Distributed rate limiting for WIFE (Redis ظْ in-memory fallback).
 */

const DEFAULT_WINDOW_MS = 60_000;
/** Default WIFE verify budget ظ¤ overridden per scope in wifeValidator.checkRateLimit */
export const DEFAULT_MAX_REQUESTS = 250;

type WindowCounter = { count: number; resetAt: number };

const memoryCounters = new Map<string, WindowCounter>();
const MEMORY_MAX_KEYS = 20_000;

function getEnv(name: string): string {
  const raw = process.env[name];
  return typeof raw === 'string' ? raw.trim() : '';
}

function isProduction(): boolean {
  return getEnv('NODE_ENV').toLowerCase() === 'production';
}

function hasRedisConfig(): boolean {
  return Boolean(getEnv('WIFE_REDIS_REST_URL') && getEnv('WIFE_REDIS_REST_TOKEN'));
}

function hashKeyMaterial(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function buildRedisKey(scope: string, subjectKey: string, windowStartMs: number): string {
  return encodeURIComponent(`wife:ratelimit:${scope}:${subjectKey}:${windowStartMs}`);
}

function pruneMemoryCounters(nowMs: number): void {
  if (memoryCounters.size <= MEMORY_MAX_KEYS) return;
  for (const [key, entry] of memoryCounters.entries()) {
    if (entry.resetAt <= nowMs) memoryCounters.delete(key);
    if (memoryCounters.size <= MEMORY_MAX_KEYS * 0.75) break;
  }
}

async function consumeRedisSlot(
  scope: string,
  subjectKey: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const redisUrl = getEnv('WIFE_REDIS_REST_URL');
  const redisToken = getEnv('WIFE_REDIS_REST_TOKEN');
  if (!redisUrl || !redisToken) throw new Error('Redis rate limit store is not configured.');

  const nowMs = Date.now();
  const windowStartMs = Math.floor(nowMs / windowMs) * windowMs;
  const key = buildRedisKey(scope, subjectKey, windowStartMs);
  const base = redisUrl.replace(/\/+$/, '');

  const incrRes = await fetch(`${base}/incr/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken}` },
  });
  if (!incrRes.ok) throw new Error(`Redis rate limit incr failed: ${incrRes.status}`);

  const incrBody = (await incrRes.json().catch(() => null)) as { result?: unknown } | null;
  const count = Number(incrBody?.result ?? 0);
  if (!Number.isFinite(count) || count <= 0) return false;

  if (count === 1) {
    void fetch(`${base}/pexpire/${key}/${windowMs}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${redisToken}` },
    }).catch(() => undefined);
  }

  return count <= maxRequests;
}

function consumeMemorySlot(scope: string, subjectKey: string, maxRequests: number, windowMs: number): boolean {
  const nowMs = Date.now();
  pruneMemoryCounters(nowMs);
  const mapKey = `${scope}:${subjectKey}`;
  const entry = memoryCounters.get(mapKey);
  if (!entry || nowMs > entry.resetAt) {
    memoryCounters.set(mapKey, { count: 1, resetAt: nowMs + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= maxRequests;
}

/**
 * Returns true when request is allowed under rate limit budget.
 */
export async function consumeRateLimitSlot(
  subjectKey: string,
  options?: { scope?: string; maxRequests?: number; windowMs?: number },
): Promise<boolean> {
  const scope = options?.scope ?? 'wife';
  const maxRequests = options?.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const hashedSubject = hashKeyMaterial(subjectKey);

  if (hasRedisConfig()) {
    try {
      return await consumeRedisSlot(scope, hashedSubject, maxRequests, windowMs);
    } catch {
      if (isProduction()) return false;
    }
  }

  if (isProduction()) return false;
  return consumeMemorySlot(scope, hashedSubject, maxRequests, windowMs);
}

export function resetWifeRateLimitStoreForTests(): void {
  memoryCounters.clear();
}
