import { getSupabaseAdminClient } from './supabaseAdminClient.ts';

const DEFAULT_WIFE_SESSION_TABLE = 'wife_session_store';
const WIFE_SESSION_TTL_MS = 30 * 60 * 1000;
const EMPTY_DEVICE_ID = '-';

type WifeSessionRecord = {
  sessionId: string;
  subject: string;
  secret: string;
  deviceId: string;
  expiresAtMs: number;
};

type WifeSessionStoreRow = {
  session_id: string;
  subject: string;
  secret: string;
  device_id: string;
  expires_at_ms: number;
};

const memoryStore = new Map<string, WifeSessionRecord>();

function getEnv(name: string): string {
  const raw = process.env[name];
  return typeof raw === 'string' ? raw.trim() : '';
}

function isProduction(): boolean {
  return getEnv('NODE_ENV').toLowerCase() === 'production';
}

function isTestRuntime(): boolean {
  return getEnv('VITEST') === 'true';
}

function allowMemoryFallback(): boolean {
  return !isProduction() || isTestRuntime();
}

function hasRedisConfig(): boolean {
  return Boolean(getEnv('WIFE_REDIS_REST_URL') && getEnv('WIFE_REDIS_REST_TOKEN'));
}

function redisKey(sessionId: string): string {
  return encodeURIComponent(`wife:session:${sessionId}`);
}

function normalizeDeviceId(deviceId: string): string {
  return deviceId.trim();
}

function redisSubjectDeviceKey(subject: string, deviceId: string): string {
  return encodeURIComponent(`wife:subject-device:${subject}:${deviceId || EMPTY_DEVICE_ID}`);
}

function redisSubjectDevicePattern(subject: string): string {
  return encodeURIComponent(`wife:subject-device:${subject}:`) + '*';
}

function pruneMemory(nowMs: number): void {
  for (const [sessionId, row] of memoryStore.entries()) {
    if (row.expiresAtMs <= nowMs) memoryStore.delete(sessionId);
  }
}

function isActiveRecord(record: WifeSessionRecord | null | undefined, nowMs = Date.now()): record is WifeSessionRecord {
  return Boolean(record && record.expiresAtMs > nowMs);
}

function toIssuedSession(record: WifeSessionRecord): IssuedWifeSession {
  return {
    sessionId: record.sessionId,
    sessionSecret: record.secret,
    expiresAtMs: record.expiresAtMs,
  };
}

function toBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomSecret(bytesLength: number): string {
  const bytes = new Uint8Array(bytesLength);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

async function redisGetValue(key: string): Promise<string | null> {
  if (!hasRedisConfig()) return null;
  const redisUrl = getEnv('WIFE_REDIS_REST_URL');
  const redisToken = getEnv('WIFE_REDIS_REST_TOKEN');
  const endpoint = `${redisUrl.replace(/\/+$/, '')}/get/${key}`;
  const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${redisToken}` } });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as { result?: unknown } | null;
  return typeof body?.result === 'string' && body.result ? body.result : null;
}

async function redisSetValue(key: string, value: string, ttlMs: number): Promise<boolean> {
  if (!hasRedisConfig()) return false;
  const redisUrl = getEnv('WIFE_REDIS_REST_URL');
  const redisToken = getEnv('WIFE_REDIS_REST_TOKEN');
  const endpoint =
    `${redisUrl.replace(/\/+$/, '')}/set/${key}/${encodeURIComponent(value)}` +
    `?PX=${Math.max(60_000, ttlMs)}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken}` },
  });
  return res.ok;
}

async function redisDeleteKey(key: string): Promise<void> {
  if (!hasRedisConfig()) return;
  const redisUrl = getEnv('WIFE_REDIS_REST_URL');
  const redisToken = getEnv('WIFE_REDIS_REST_TOKEN');
  const endpoint = `${redisUrl.replace(/\/+$/, '')}/del/${key}`;
  await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken}` },
  });
}

async function redisListKeys(pattern: string): Promise<string[]> {
  if (!hasRedisConfig()) return [];
  const redisUrl = getEnv('WIFE_REDIS_REST_URL');
  const redisToken = getEnv('WIFE_REDIS_REST_TOKEN');
  const endpoint = `${redisUrl.replace(/\/+$/, '')}/keys/${pattern}`;
  const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${redisToken}` } });
  if (!res.ok) return [];
  const body = (await res.json().catch(() => null)) as { result?: unknown } | null;
  return Array.isArray(body?.result) ? body.result.filter((key): key is string => typeof key === 'string') : [];
}

function findReusableMemorySession(subject: string, deviceId: string, nowMs: number): WifeSessionRecord | null {
  let match: WifeSessionRecord | null = null;
  for (const record of memoryStore.values()) {
    if (record.subject !== subject) continue;
    if (record.deviceId !== deviceId) continue;
    if (!isActiveRecord(record, nowMs)) continue;
    if (!match || record.expiresAtMs > match.expiresAtMs) {
      match = record;
    }
  }
  return match;
}

async function persistSession(record: WifeSessionRecord): Promise<boolean> {
  if (hasRedisConfig()) {
    try {
      const ttlMs = Math.max(60_000, record.expiresAtMs - Date.now());
      const sessionStored = await redisSetValue(redisKey(record.sessionId), JSON.stringify(record), ttlMs);
      if (sessionStored) {
        await redisSetValue(redisSubjectDeviceKey(record.subject, record.deviceId), record.sessionId, ttlMs).catch(() => false);
        return true;
      }
    } catch {
      if (!allowMemoryFallback()) return false;
    }
  }

  const admin = getSupabaseAdminClient();
  if (admin) {
    try {
      const table = getEnv('WIFE_SESSION_TABLE') || DEFAULT_WIFE_SESSION_TABLE;
      const { error } = await admin.from(table).upsert(
        {
          session_id: record.sessionId,
          subject: record.subject,
          secret: record.secret,
          device_id: record.deviceId,
          expires_at_ms: record.expiresAtMs,
        },
        { onConflict: 'session_id' },
      );
      if (!error) return true;
    } catch {
      if (!allowMemoryFallback()) return false;
    }
  }

  if (!allowMemoryFallback()) return false;
  memoryStore.set(record.sessionId, record);
  return true;
}

async function readSession(sessionId: string): Promise<WifeSessionRecord | null> {
  const nowMs = Date.now();
  pruneMemory(nowMs);

  if (hasRedisConfig()) {
    try {
      const raw = await redisGetValue(redisKey(sessionId));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<WifeSessionRecord>;
        if (
          typeof parsed.sessionId === 'string' &&
          typeof parsed.subject === 'string' &&
          typeof parsed.secret === 'string' &&
          Number(parsed.expiresAtMs) > nowMs
        ) {
          return {
            sessionId: parsed.sessionId,
            subject: parsed.subject,
            secret: parsed.secret,
            deviceId: typeof parsed.deviceId === 'string' ? parsed.deviceId : '',
            expiresAtMs: Number(parsed.expiresAtMs),
          };
        }
      }
    } catch {
      if (!allowMemoryFallback()) return null;
    }
  }

  const admin = getSupabaseAdminClient();
  if (admin) {
    try {
      const table = getEnv('WIFE_SESSION_TABLE') || DEFAULT_WIFE_SESSION_TABLE;
      const query = await admin
        .from(table)
        .select('session_id, subject, secret, device_id, expires_at_ms')
        .eq('session_id', sessionId)
        .maybeSingle();
      const data = query.data as WifeSessionStoreRow | null;
      const { error } = query;
      if (!error && data && Number(data.expires_at_ms) > nowMs) {
        return {
          sessionId: String(data.session_id ?? ''),
          subject: String(data.subject ?? ''),
          secret: String(data.secret ?? ''),
          deviceId: String(data.device_id ?? ''),
          expiresAtMs: Number(data.expires_at_ms),
        };
      }
    } catch {
      if (!allowMemoryFallback()) return null;
    }
  }

  const cached = memoryStore.get(sessionId);
  if (cached && cached.expiresAtMs > nowMs) return cached;
  return null;
}

async function readReusableSessionBySubjectDevice(subject: string, deviceId: string): Promise<WifeSessionRecord | null> {
  const normalizedDeviceId = normalizeDeviceId(deviceId);
  const nowMs = Date.now();
  pruneMemory(nowMs);

  if (hasRedisConfig()) {
    try {
      const indexedSessionId = await redisGetValue(redisSubjectDeviceKey(subject, normalizedDeviceId));
      if (indexedSessionId?.trim()) {
        const indexedRecord = await readSession(indexedSessionId.trim());
        if (indexedRecord && indexedRecord.subject === subject && indexedRecord.deviceId === normalizedDeviceId) {
          return indexedRecord;
        }
      }
    } catch {
      if (!allowMemoryFallback()) return null;
    }
  }

  const admin = getSupabaseAdminClient();
  if (admin) {
    try {
      const table = getEnv('WIFE_SESSION_TABLE') || DEFAULT_WIFE_SESSION_TABLE;
      const query = await admin
        .from(table)
        .select('session_id, subject, secret, device_id, expires_at_ms')
        .eq('subject', subject)
        .eq('device_id', normalizedDeviceId)
        .gt('expires_at_ms', nowMs)
        .order('expires_at_ms', { ascending: false })
        .limit(1)
        .maybeSingle();
      const data = query.data as WifeSessionStoreRow | null;
      const { error } = query;
      if (!error && data && Number(data.expires_at_ms) > nowMs) {
        return {
          sessionId: String(data.session_id ?? ''),
          subject: String(data.subject ?? ''),
          secret: String(data.secret ?? ''),
          deviceId: String(data.device_id ?? ''),
          expiresAtMs: Number(data.expires_at_ms),
        };
      }
    } catch {
      if (!allowMemoryFallback()) return null;
    }
  }

  return findReusableMemorySession(subject, normalizedDeviceId, nowMs);
}

async function listSessionsForSubject(subject: string): Promise<WifeSessionRecord[]> {
  const nowMs = Date.now();
  pruneMemory(nowMs);
  const dedup = new Map<string, WifeSessionRecord>();

  if (hasRedisConfig()) {
    try {
      const keys = await redisListKeys(redisSubjectDevicePattern(subject));
      for (const key of keys) {
        const sessionId = await redisGetValue(encodeURIComponent(key)).catch(() => null);
        if (!sessionId?.trim()) continue;
        const record = await readSession(sessionId.trim());
        if (record && record.subject === subject && record.expiresAtMs > nowMs) {
          dedup.set(record.sessionId, record);
        }
      }
    } catch {
      if (!allowMemoryFallback()) return [];
    }
  }

  const admin = getSupabaseAdminClient();
  if (admin) {
    try {
      const table = getEnv('WIFE_SESSION_TABLE') || DEFAULT_WIFE_SESSION_TABLE;
      const query = await admin
        .from(table)
        .select('session_id, subject, secret, device_id, expires_at_ms')
        .eq('subject', subject)
        .gt('expires_at_ms', nowMs);
      const data = (query.data as WifeSessionStoreRow[] | null) ?? [];
      const { error } = query;
      if (!error) {
        for (const row of data) {
          const record: WifeSessionRecord = {
            sessionId: String(row.session_id ?? ''),
            subject: String(row.subject ?? ''),
            secret: String(row.secret ?? ''),
            deviceId: String(row.device_id ?? ''),
            expiresAtMs: Number(row.expires_at_ms ?? 0),
          };
          if (record.sessionId && record.subject === subject && record.expiresAtMs > nowMs) {
            dedup.set(record.sessionId, record);
          }
        }
      }
    } catch {
      if (!allowMemoryFallback()) return [];
    }
  }

  for (const record of memoryStore.values()) {
    if (record.subject === subject && record.expiresAtMs > nowMs) {
      dedup.set(record.sessionId, record);
    }
  }

  return [...dedup.values()];
}

async function deleteSessions(records: WifeSessionRecord[]): Promise<void> {
  const seen = new Set<string>();
  for (const record of records) {
    if (!record.sessionId || seen.has(record.sessionId)) continue;
    seen.add(record.sessionId);
    await deleteSession(record.sessionId);
  }
}

async function deleteSession(sessionId: string): Promise<void> {
  const existing = await readSession(sessionId).catch(() => null);
  memoryStore.delete(sessionId);

  if (hasRedisConfig()) {
    try {
      await redisDeleteKey(redisKey(sessionId));
      if (existing) {
        await redisDeleteKey(redisSubjectDeviceKey(existing.subject, existing.deviceId));
      }
    } catch {
      /* best effort */
    }
  }

  const admin = getSupabaseAdminClient();
  if (admin) {
    try {
      const table = getEnv('WIFE_SESSION_TABLE') || DEFAULT_WIFE_SESSION_TABLE;
      await admin.from(table).delete().eq('session_id', sessionId);
    } catch {
      /* best effort */
    }
  }
}

export type IssuedWifeSession = {
  sessionId: string;
  sessionSecret: string;
  expiresAtMs: number;
};

export async function issueWifeSessionForSubject(
  subject: string,
  deviceId: string,
): Promise<IssuedWifeSession | null> {
  if (!subject) return null;
  const normalizedDeviceId = normalizeDeviceId(deviceId);
  const existing = await readReusableSessionBySubjectDevice(subject, normalizedDeviceId);
  if (existing) {
    return toIssuedSession(existing);
  }
  const record: WifeSessionRecord = {
    sessionId: randomSecret(18),
    subject,
    secret: randomSecret(32),
    deviceId: normalizedDeviceId,
    expiresAtMs: Date.now() + WIFE_SESSION_TTL_MS,
  };
  const ok = await persistSession(record);
  if (!ok) return null;
  return toIssuedSession(record);
}

export async function resolveWifeSessionSecretForSubject(
  sessionId: string,
  subject: string,
  deviceId: string,
): Promise<string | null> {
  if (!sessionId || !subject) return null;
  const record = await readSession(sessionId);
  if (!record) return null;
  if (record.subject !== subject) return null;
  if (record.deviceId && deviceId && record.deviceId !== deviceId) return null;
  if (record.deviceId && !deviceId) return null;
  return record.secret;
}

export async function invalidateWifeSession(sessionId: string): Promise<void> {
  if (!sessionId) return;
  await deleteSession(sessionId);
}

export async function invalidateWifeSessionsForSubject(subject: string): Promise<void> {
  if (!subject.trim()) return;
  const records = await listSessionsForSubject(subject.trim());
  await deleteSessions(records);
}

export async function invalidateWifeSessionsForSubjectDevice(subject: string, deviceId: string): Promise<void> {
  if (!subject.trim()) return;
  const normalizedDeviceId = normalizeDeviceId(deviceId);
  const records = await listSessionsForSubject(subject.trim());
  await deleteSessions(
    normalizedDeviceId
      ? records.filter((record) => record.deviceId === normalizedDeviceId)
      : records.filter((record) => !record.deviceId),
  );
}

export function resetWifeSessionStoreForTests(): void {
  memoryStore.clear();
}
