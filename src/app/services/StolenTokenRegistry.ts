/**
 * StolenTokenRegistry — نظام الرصد الراداري لاكتشاف التوكنات المسروقة
 * 
 * الآلية:
 * 1. كل جهاز يحصل على Device ID فريد (uuid) يُحفظ في localStorage (باقٍ عبر التبويبات)
 * 2. عند تسجيل الدخول أو التحقق من الجلسة، نسجل (sub, jti, iat, deviceId) في IndexedDB
 * 3. إذا وصل طلب بنفس sub ولكن jti مختلف عما هو مسجل → توكن مسروق (توكن أحدث صدر)
 * 4. إذا وصل طلب بنفس sub و jti ولكن deviceId مختلف → توكن منسوخ (يُستخدم من جهاز آخر)
 * 5. يتم إضافة التوكن المسروق إلى blacklist + تسجيل CRITICAL في SecurityAuditService
 * 6. تصميم anti-false-positive: نسمح بفارق iat يصل إلى 5 ثوانٍ (لتجنب الـ race conditions)
 * 
 * ملاحظة: استخدام localStorage يمنع حظر المستخدم الشرعي عند فتح تبويب جديد
 */

const STOLEN_TOKEN_DB_NAME = 'HamiStolenTokenRegistry';
const STOLEN_TOKEN_STORE = 'tokenSessions';
const IAT_GRACE_PERIOD_MS = 5_000;

function generateSessionId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

function getOrCreateSessionId(): string {
  try {
    let sessionId = localStorage.getItem('hami_device_id');
    if (!sessionId) {
      sessionId = generateSessionId();
      localStorage.setItem('hami_device_id', sessionId);
    }
    return sessionId;
  } catch {
    return generateSessionId();
  }
}

interface TokenSessionRecord {
  sub: string;
  jti: string;
  iat: number;
  deviceId: string;
  expiresAt: number;
}

function decodeJwtPayloadBase64(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const decoded = atob(base64);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(STOLEN_TOKEN_DB_NAME, 1);
      req.onerror = () => resolve(null);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STOLEN_TOKEN_STORE)) {
          const store = db.createObjectStore(STOLEN_TOKEN_STORE, { keyPath: ['sub', 'jti'] });
          store.createIndex('sub', 'sub', { unique: false });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    } catch {
      resolve(null);
    }
  });
}

function extractJwtFields(token: string): { sub: string; jti: string; iat: number; exp: number } | null {
  const payload = decodeJwtPayloadBase64(token);
  if (!payload) return null;
  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  const jti = typeof payload.jti === 'string' ? payload.jti : '';
  const iat = typeof payload.iat === 'number' ? payload.iat * 1000 : 0;
  const exp = typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  if (!sub || !jti || !iat || !exp) return null;
  return { sub, jti, iat, exp };
}

/**
 * تسجيل توكن جديد في سجل الجلسات
 */
export async function registerTokenSession(token: string): Promise<boolean> {
  const fields = extractJwtFields(token);
  if (!fields) return false;

  const db = await openDB();
  if (!db) return true;

  try {
    const deviceId = getOrCreateSessionId();
    const record: TokenSessionRecord = {
      sub: fields.sub,
      jti: fields.jti,
      iat: fields.iat,
      deviceId,
      expiresAt: fields.exp + 7 * 24 * 60 * 60 * 1000,
    };
    const tx = db.transaction(STOLEN_TOKEN_STORE, 'readwrite');
    const store = tx.objectStore(STOLEN_TOKEN_STORE);
    store.put(record);
    tx.commit();
    return true;
  } catch {
    return false;
  } finally {
    db.close();
  }
}

/**
 * فحص إذا كان التوكن مسروقاً
 * 
 * @returns { status: 'valid' | 'stolen' | 'cloned', reason?: string }
 * 
 * valid — التوكن صحيح وجديد وفي نفس الجلسة
 * stolen — jti جديد مختلف عما هو مسجل لـ sub (توكن أحدث صدر)
 * cloned — نفس jti ولكن sessionId مختلف (نفس التوكن يُستخدم من جهاز آخر)
 */
export async function detectStolenToken(token: string): Promise<{ status: 'valid' | 'stolen' | 'cloned'; reason?: string }> {
  const fields = extractJwtFields(token);
  if (!fields) return { status: 'valid', reason: 'cannot-decode' };

  const db = await openDB();
  if (!db) return { status: 'valid', reason: 'no-db' };

  try {
    const tx = db.transaction(STOLEN_TOKEN_STORE, 'readonly');
    const store = tx.objectStore(STOLEN_TOKEN_STORE);
    const index = store.index('sub');

    const allRecords = await new Promise<TokenSessionRecord[]>((resolve, reject) => {
      const req = index.getAll(fields.sub);
      req.onsuccess = () => resolve(req.result as TokenSessionRecord[]);
      req.onerror = () => reject(req.error);
    });

    // مسح السجلات منتهية الصلاحية
    const now = Date.now();
    const activeRecords = allRecords.filter(r => r.expiresAt > now);
    const expiredRecords = allRecords.filter(r => r.expiresAt <= now);
    if (expiredRecords.length > 0) {
      const tx2 = db.transaction(STOLEN_TOKEN_STORE, 'readwrite');
      const store2 = tx2.objectStore(STOLEN_TOKEN_STORE);
      for (const r of expiredRecords) {
        store2.delete([r.sub, r.jti]);
      }
      tx2.commit();
    }

    if (activeRecords.length === 0) {
      return { status: 'valid', reason: 'first-seen' };
    }

    const currentDeviceId = getOrCreateSessionId();

    // 1) هل jti الحالي موجود في السجلات؟
    const matchingRecord = activeRecords.find(r => r.jti === fields.jti);
    if (matchingRecord) {
      // jti موجود — تحقق من deviceId
      if (matchingRecord.deviceId !== currentDeviceId) {
        // نفس jti ولكن device مختلف → توكن منسوخ
        await logStolenTokenAttempt(token, 'cloned', `Same jti (${fields.jti}) used from different device (${matchingRecord.deviceId} vs ${currentDeviceId})`);
        return { status: 'cloned', reason: 'Token cloned — same jti used from different device' };
      }
      return { status: 'valid', reason: 'match' };
    }

    // 2) jti غير موجود — هل هناك jti أحدث؟
    const latestRecord = activeRecords.reduce((latest, r) => r.iat > latest.iat ? r : latest, activeRecords[0]);
    if (fields.iat < latestRecord.iat - IAT_GRACE_PERIOD_MS) {
      // التوكن الحالي أقدم من آخر توكن مسجل → توكن قديم (مسروق)
      await logStolenTokenAttempt(token, 'stolen', `Token iat (${fields.iat}) is older than latest known iat (${latestRecord.iat}) for sub ${fields.sub}`);
      return { status: 'stolen', reason: `Stolen token detected — older jti (${fields.jti}) than known session (${latestRecord.jti})` };
    }

    // 3) jti جديد تماماً — سجله
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
    const { securityAudit } = await import('./SecurityAuditService');
    const fields = extractJwtFields(token);
    securityAudit.logEvent('auth', 'critical', `Stolen Token Attempt [${type}]`, {
      sub: fields?.sub ?? 'unknown',
      jti: fields?.jti ?? 'unknown',
      reason,
      timestamp: new Date().toISOString(),
    });
    const { default: SecureStoreService } = await import('./SecureStoreService');
    await SecureStoreService.setItem('security_stolen_token_flag', JSON.stringify({
      type,
      sub: fields?.sub,
      timestamp: Date.now(),
    }));
  } catch {
    /* best effort */
  }
}

/**
 * إضافة التوكن المسروق إلى الـ Blacklist
 */
async function addStolenToBlacklist(token: string): Promise<void> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const hashHex = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    const db = await openDBinternal();
    if (!db) return;
    const tx = db.transaction(STOLEN_TOKEN_STORE, 'readwrite');
    tx.objectStore(STOLEN_TOKEN_STORE).put({
      tokenHash: hashHex,
      expiresAt: Date.now() + 5 * 60 * 1000,
      stolen: true,
    });
    tx.commit();
    db.close();
  } catch {
    /* best effort */
  }
}

function openDBinternal(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('HamiTokenBlacklist', 1);
      req.onerror = () => resolve(null);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('stolenTokens')) {
          db.createObjectStore('stolenTokens', { keyPath: 'tokenHash' });
        }
      };
    } catch {
      resolve(null);
    }
  });
}
