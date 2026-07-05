/**
 * Client-side stolen/cloned JWT radar (IndexedDB).
 * الفحص الحاسم على الخادم: stolenTokenServer.ts ضمن verifyWifeSignature.
 */
import { extractJwtSessionFields } from '@/app/security/jwtFields';
import { getOrCreateDeviceId } from '@/app/security/deviceId';
import SecureStoreService from '@/app/services/SecureStoreService';

const DB_NAME = 'HamiStolenTokenRegistry';
const STORE = 'tokenSessions';
const IAT_GRACE_PERIOD_MS = 45_000;
const SESSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

interface TokenSessionRecord {
  sub: string;
  jti: string;
  iat: number;
  deviceId: string;
  expiresAt: number;
}

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onerror = () => resolve(null);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const objectStore = db.createObjectStore(STORE, { keyPath: ['sub', 'jti'] });
          objectStore.createIndex('sub', 'sub', { unique: false });
          objectStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    } catch {
      resolve(null);
    }
  });
}

export async function registerTokenSession(token: string): Promise<boolean> {
  const fields = extractJwtSessionFields(token);
  if (!fields) return false;

  const db = await openDB();
  if (!db) return true;

  const deviceId = getOrCreateDeviceId();
  if (!deviceId) return true;

  try {
    const record: TokenSessionRecord = {
      sub: fields.sub,
      jti: fields.jti,
      iat: fields.iat,
      deviceId,
      expiresAt: fields.exp + SESSION_RETENTION_MS,
    };
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.commit();
    return true;
  } catch {
    return false;
  } finally {
    db.close();
  }
}

export async function detectStolenToken(
  token: string,
): Promise<{ status: 'valid' | 'stolen' | 'cloned'; reason?: string }> {
  const fields = extractJwtSessionFields(token);
  if (!fields) return { status: 'valid', reason: 'cannot-decode' };

  const db = await openDB();
  if (!db) return { status: 'valid', reason: 'no-db' };

  try {
    const allRecords = await new Promise<TokenSessionRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).index('sub').getAll(fields.sub);
      req.onsuccess = () => resolve(req.result as TokenSessionRecord[]);
      req.onerror = () => reject(req.error);
    });

    const now = Date.now();
    const activeRecords = allRecords.filter((r) => r.expiresAt > now);
    const expiredRecords = allRecords.filter((r) => r.expiresAt <= now);

    if (expiredRecords.length > 0) {
      const tx = db.transaction(STORE, 'readwrite');
      const objectStore = tx.objectStore(STORE);
      for (const row of expiredRecords) {
        objectStore.delete([row.sub, row.jti]);
      }
      tx.commit();
    }

    if (activeRecords.length === 0) {
      return { status: 'valid', reason: 'first-seen' };
    }

    const currentDeviceId = getOrCreateDeviceId() ?? '';
    const matchingRecord = activeRecords.find((r) => r.jti === fields.jti);

    if (matchingRecord) {
      if (currentDeviceId && matchingRecord.deviceId !== currentDeviceId) {
        await logStolenTokenAttempt(token, 'cloned', 'same jti from different device');
        return { status: 'cloned', reason: 'Token cloned — same jti from different device' };
      }
      return { status: 'valid', reason: 'match' };
    }

    const latestRecord = activeRecords.reduce(
      (latest, row) => (row.iat > latest.iat ? row : latest),
      activeRecords[0],
    );
    if (fields.iat < latestRecord.iat - IAT_GRACE_PERIOD_MS) {
      await logStolenTokenAttempt(token, 'stolen', 'older jti than active session');
      return { status: 'stolen', reason: 'Stolen token — older jti than active session' };
    }

    await registerTokenSession(token);
    return { status: 'valid', reason: 'new-token-registered' };
  } catch {
    return { status: 'valid', reason: 'check-failed' };
  } finally {
    db.close();
  }
}

async function logStolenTokenAttempt(token: string, type: string, reason: string): Promise<void> {
  try {
    const fields = extractJwtSessionFields(token);
    const { securityAudit } = await import('@/app/services/SecurityAuditService');
    securityAudit.logEvent('auth', 'critical', `Stolen Token Attempt [${type}]`, {
      sub: fields?.sub ?? 'unknown',
      jti: fields?.jti ?? 'unknown',
      reason,
      timestamp: new Date().toISOString(),
    });
    await SecureStoreService.setItem(
      'security_stolen_token_flag',
      JSON.stringify({ type, sub: fields?.sub, timestamp: Date.now() }),
    );
  } catch {
    /* best effort */
  }
}
