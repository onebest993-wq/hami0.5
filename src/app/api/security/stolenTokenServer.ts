/**
 * Server-side stolen/cloned JWT detection for WIFE.
 * Persistence: Redis → Supabase → in-memory (see stolenTokenStores.ts).
 */
import { extractJwtSessionFields } from '@/app/security/jwtFields.ts';
import { getWifeEnv, isWifeProduction } from './wifeStoreEnv.ts';
import {
  resetStolenTokenMemoryForTests,
  withStolenTokenStore,
  type TokenSessionRecord,
} from './stolenTokenStores.ts';

const IAT_GRACE_PERIOD_MS = 45_000;
const SESSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const DEVICE_ID_RE = /^[A-Za-z0-9\-_]{8,128}$/;
/** أحكام «سليم» التي تستوجب تثبيت الجلسة في المخزن بعد إصدارها */
const REGISTERABLE_REASONS = new Set(['first-seen', 'new-session', 'refreshed']);

export type StolenTokenStatus = 'valid' | 'stolen' | 'cloned';

export interface StolenTokenVerdict {
  status: StolenTokenStatus;
  reason?: string;
}

function normalizeDeviceId(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed || !DEVICE_ID_RE.test(trimmed)) return '';
  return trimmed;
}

export function isValidWifeDeviceId(raw: string | null | undefined): boolean {
  return normalizeDeviceId(raw).length > 0;
}

export function extractDeviceIdFromRequest(req: Request): string {
  const raw =
    req.headers.get('x-wife-device-id') ??
    req.headers.get('X-WIFE-Device-Id') ??
    '';
  return normalizeDeviceId(raw);
}

export async function registerTokenSessionServer(
  token: string,
  deviceId: string,
): Promise<boolean> {
  const fields = extractJwtSessionFields(token);
  if (!fields) return false;

  const normalized = normalizeDeviceId(deviceId);
  if (!normalized) return false;

  const record: TokenSessionRecord = {
    sub: fields.sub,
    sessionId: fields.sessionId,
    iat: fields.iat,
    deviceId: normalized,
    expiresAt: fields.exp + SESSION_RETENTION_MS,
  };

  const result = await withStolenTokenStore(async (store) => {
    await store.upsertSession(record);
    return true;
  });
  return result ?? false;
}

export async function detectStolenTokenServer(
  token: string,
  deviceId: string,
): Promise<StolenTokenVerdict> {
  const fields = extractJwtSessionFields(token);
  if (!fields) return { status: 'valid', reason: 'cannot-decode' };

  const nowMs = Date.now();
  const normalizedDeviceId = normalizeDeviceId(deviceId);

  const storeResult = await withStolenTokenStore(async (store) => {
    await store.deleteExpired(nowMs);
    const activeRecords = await store.listActiveBySub(fields.sub, nowMs);

    if (activeRecords.length === 0) {
      return { status: 'valid' as const, reason: 'first-seen' };
    }

    const matchingRecord = activeRecords.find((r) => r.sessionId === fields.sessionId);
    if (matchingRecord) {
      if (matchingRecord.deviceId && matchingRecord.deviceId !== normalizedDeviceId) {
        if (
          normalizedDeviceId &&
          getWifeEnv('NODE_ENV').toLowerCase() === 'development' &&
          getWifeEnv('VITEST') !== 'true'
        ) {
          return { status: 'valid' as const, reason: 'refreshed' };
        }
        return {
          status: 'cloned' as const,
          reason: 'Same session from a different device',
        };
      }
      if (fields.iat > matchingRecord.iat) {
        return { status: 'valid' as const, reason: 'refreshed' };
      }
      return { status: 'valid' as const, reason: 'match' };
    }

    const latestRecord = activeRecords.reduce(
      (latest, r) => (r.iat > latest.iat ? r : latest),
      activeRecords[0],
    );
    if (fields.iat < latestRecord.iat - IAT_GRACE_PERIOD_MS) {
      return {
        status: 'stolen' as const,
        reason: 'Unregistered session older than an active one',
      };
    }

    return { status: 'valid' as const, reason: 'new-session' };
  });

  if (!storeResult) {
    if (isWifeProduction()) {
      return { status: 'stolen', reason: 'session-store-unavailable-fail-closed' };
    }
    return { status: 'valid', reason: 'store-unavailable' };
  }

  if (storeResult.status === 'valid' && REGISTERABLE_REASONS.has(storeResult.reason ?? '')) {
    await registerTokenSessionServer(token, normalizedDeviceId);
  }

  return storeResult;
}

export async function revokeTokenSessionsForSubject(subject: string): Promise<void> {
  const trimmed = subject.trim();
  if (!trimmed) return;
  const nowMs = Date.now();
  await withStolenTokenStore(async (store) => {
    await store.deleteActiveBySub(trimmed, nowMs);
    return true;
  });
}

export function resetStolenTokenServerForTests(): void {
  resetStolenTokenMemoryForTests();
}
