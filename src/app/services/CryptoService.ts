import { getOrCreateDeviceId } from '@/app/security/deviceId';
import { getBffCryptoWrapCredential } from '@/app/utils/bffCryptoSession';
import { resolveLiveAuthUserIdForStorage } from '@/app/utils/liveAuthUserId';

const __DEV__ = import.meta.env.DEV;
const _warn = (...a: unknown[]) => {
  if (__DEV__) console.warn(...a);
};
const _err = (...a: unknown[]) => {
  if (__DEV__) console.error(...a);
};

const SESSION_KEY_STORAGE_KEY = 'hami-crypto-session-key';
const DEVICE_KEY_STORAGE_KEY = 'hami-crypto-device-wrapped-key';
const KEY_SALT = 'hami-crypto-key-salt-v2';
const DEVICE_WRAP_PREFIX = 'hami-crypto-device:';
const CRYPTO_DB_NAME = 'hami-crypto-keystore';
const CRYPTO_DB_VERSION = 1;
const CRYPTO_KEY_STORE = 'crypto_keys';
const MASTER_KEY_RECORD_ID = 'master-key-v3';

/**
 * PBKDF2 لـ AES-KW حول مفتاح عشوائي (ليس تجزئة كلمة مرور مستخدم).
 * الإرث: 600k. اللفّ الجديد: 310k — يُخزَّن `iterations` مع اللفّة لفكّ مزدوج.
 */
export const WRAP_KDF_ITERATIONS_LEGACY = 600_000;
export const WRAP_KDF_ITERATIONS = 310_000;

/** كاش جلسة لـ deriveWrappingKey — يمنع تكرار PBKDF2 لنفس الاعتمادية */
const wrappingKeyCache = new Map<string, CryptoKey>();

async function getWrapCredential(): Promise<string | null> {
  try {
    const bffCredential = getBffCryptoWrapCredential();
    if (bffCredential) return bffCredential;

    // ديناميكي — يمنع سحب vendor-supabase (~200KB) إلى مسار الإقلاع عبر SecureStore
    const { supabase } = await import('@/app/lib/supabase-client');
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token?.trim() ?? null;
  } catch {
    return null;
  }
}

function normalizeExplicitCredential(credential: string | undefined): string | null {
  const normalized = credential?.trim() ?? '';
  return normalized || null;
}

async function deriveWrappingKey(
  credential: string,
  iterations: number = WRAP_KDF_ITERATIONS,
): Promise<CryptoKey> {
  const cacheKey = `${iterations}\0${credential}`;
  const cached = wrappingKeyCache.get(cacheKey);
  if (cached) return cached;

  const wrapInput = credential.startsWith('bff:')
    ? credential
    : `hami-crypto-wrap:${credential}`;
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(wrapInput),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(KEY_SALT),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-KW', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  );
  wrappingKeyCache.set(cacheKey, key);
  return key;
}

function resolveStoredWrapIterations(parsed: { iterations?: unknown; v?: unknown }): number {
  if (
    typeof parsed.iterations === 'number' &&
    Number.isSafeInteger(parsed.iterations) &&
    parsed.iterations >= 100_000 &&
    parsed.iterations <= 2_000_000
  ) {
    return parsed.iterations;
  }
  return WRAP_KDF_ITERATIONS_LEGACY;
}

function fromBase64Url(data: string): ArrayBuffer {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export class CryptoService {
  private static masterKey: CryptoKey | null = null;
  private static isInitialized = false;
  private static sessionWrapCredential: string | null = null;
  /** معرّف المستخدم الذي رُبط به المفتاح في الذاكرة — يمنع فك تشفير حساب آخر */
  private static boundStorageUserId: string | null | undefined = undefined;

  private static openCryptoDatabase(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    return new Promise((resolve) => {
      const req = indexedDB.open(CRYPTO_DB_NAME, CRYPTO_DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(CRYPTO_KEY_STORE)) {
          db.createObjectStore(CRYPTO_KEY_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    });
  }

  private static resolveMasterKeyRecordId(): string {
    const uid = String(this.boundStorageUserId ?? '').trim();
    return uid ? `${MASTER_KEY_RECORD_ID}:u:${uid}` : MASTER_KEY_RECORD_ID;
  }

  private static async tryRestoreKeyFromPersistentStore(): Promise<boolean> {
    const db = await this.openCryptoDatabase();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(CRYPTO_KEY_STORE, 'readonly');
        const req = tx.objectStore(CRYPTO_KEY_STORE).get(this.resolveMasterKeyRecordId());
        req.onsuccess = () => {
          const record = req.result as { key?: unknown } | undefined;
          if (record?.key instanceof CryptoKey) {
            this.masterKey = record.key;
            this.isInitialized = true;
            resolve(true);
            return;
          }
          resolve(false);
        };
        req.onerror = () => resolve(false);
        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
        tx.onabort = () => db.close();
      } catch {
        db.close();
        resolve(false);
      }
    });
  }

  private static async persistKeyToPersistentStore(): Promise<void> {
    if (!this.masterKey) return;
    const db = await this.openCryptoDatabase();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(CRYPTO_KEY_STORE, 'readwrite');
        tx.objectStore(CRYPTO_KEY_STORE).put({
          id: this.resolveMasterKeyRecordId(),
          key: this.masterKey,
          v: 3,
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => {
          db.close();
          resolve();
        };
      } catch {
        db.close();
        resolve();
      }
    });
  }

  static async generateMasterKey(): Promise<CryptoKey> {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
    this.masterKey = key;
    this.isInitialized = true;
    return key;
  }

  private static async deleteMasterKeyRecord(recordId: string): Promise<void> {
    const db = await this.openCryptoDatabase();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(CRYPTO_KEY_STORE, 'readwrite');
        tx.objectStore(CRYPTO_KEY_STORE).delete(recordId);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => {
          db.close();
          resolve();
        };
      } catch {
        db.close();
        resolve();
      }
    });
  }

  private static readLegacyKeyClaimedBy(): string {
    try {
      return String(localStorage.getItem('hami-crypto-legacy-key-claimed-by') ?? '').trim();
    } catch {
      return '';
    }
  }

  private static writeLegacyKeyClaimedBy(uid: string): void {
    try {
      localStorage.setItem('hami-crypto-legacy-key-claimed-by', uid);
    } catch {
      /* ignore */
    }
  }

  private static async tryClaimLegacySharedMasterKey(): Promise<boolean> {
    const uid = String(this.boundStorageUserId ?? '').trim();
    if (!uid) return false;
    const claimedBy = this.readLegacyKeyClaimedBy();
    if (claimedBy && claimedBy !== uid) return false;

    const db = await this.openCryptoDatabase();
    if (!db) return false;
    const restored = await new Promise<boolean>((resolve) => {
      try {
        const tx = db.transaction(CRYPTO_KEY_STORE, 'readonly');
        const req = tx.objectStore(CRYPTO_KEY_STORE).get(MASTER_KEY_RECORD_ID);
        req.onsuccess = () => {
          const record = req.result as { key?: unknown } | undefined;
          if (record?.key instanceof CryptoKey) {
            this.masterKey = record.key;
            this.isInitialized = true;
            resolve(true);
            return;
          }
          resolve(false);
        };
        req.onerror = () => resolve(false);
        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
        tx.onabort = () => db.close();
      } catch {
        db.close();
        resolve(false);
      }
    });
    if (restored) {
      this.writeLegacyKeyClaimedBy(uid);
    }
    return restored;
  }

  static hasMasterKey(): boolean {
    return Boolean(this.masterKey);
  }

  static async initialize(userCredential?: string): Promise<void> {
    const uid = resolveLiveAuthUserIdForStorage();
    const incomingWrap =
      normalizeExplicitCredential(userCredential) ?? getBffCryptoWrapCredential();
    const wrapChanged = Boolean(incomingWrap) && incomingWrap !== this.sessionWrapCredential;

    if (this.isInitialized && this.masterKey && this.boundStorageUserId === uid && !wrapChanged) {
      return;
    }
    if (this.boundStorageUserId !== uid || wrapChanged) {
      this.masterKey = null;
      this.isInitialized = false;
    }
    this.boundStorageUserId = uid;
    this.sessionWrapCredential = incomingWrap;

    /*
     * IDB أولاً — مفتاح AES غير قابل للاستخراج بلا PBKDF2.
     * سابقاً: مسار الجلسة (600k) يسبق حتى مع وجود المفتاح في IDB.
     */
    const restoredPersistent = await this.tryRestoreKeyFromPersistentStore();
    if (restoredPersistent) return;

    const restoredLegacyShared = await this.tryClaimLegacySharedMasterKey();
    if (restoredLegacyShared) {
      await this.persistKeyToPersistentStore();
      // امسح السجل المشترك حتى لا يرثه حساب لاحق على نفس الجهاز
      await this.deleteMasterKeyRecord(MASTER_KEY_RECORD_ID);
      return;
    }

    /*
     * لفّ جلسة قديم في sessionStorage — الكتابة متوقفة (المفتاح في IDB غير قابل
     * للاستخراج). الإبقاء على القراءة يفكّ أجهزة ما زالت تحمل اللفّة القديمة.
     */
    const restoredSession = await this.tryRestoreKeyFromSession();
    if (restoredSession) {
      await this.persistKeyToPersistentStore();
      return;
    }

    const restoredLegacyDevice = await this.tryRestoreLegacyDeviceKey();
    if (restoredLegacyDevice) {
      await this.persistKeyToPersistentStore();
      this.purgeLegacyDeviceWrappedKey();
      return;
    }

    /*
     * لا تسكّ مفتاحاً جديداً إن وُجدت إضابير مشفّرة على القرص — وإلا تُعمى البيانات
     * ويظهر الأرشيف فارغاً بعد كل إعادة تحميل.
     */
    try {
      const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
      const {
        LAWSUIT_SEGMENT_WARM_KEYS,
        EXECUTION_FILES_STORAGE_KEY,
        EXECUTION_FILES_STORAGE_KEYS_LEGACY,
      } = await import('@/app/services/dossierPersistence/dossierStorageKeys');
      const probeKeys = new Set<string>([
        ...LAWSUIT_SEGMENT_WARM_KEYS,
        EXECUTION_FILES_STORAGE_KEY,
        ...EXECUTION_FILES_STORAGE_KEYS_LEGACY,
      ]);
      try {
        const allKeys = await SecureStoreService.listKeys();
        for (const key of allKeys) {
          if (key.startsWith(`${EXECUTION_FILES_STORAGE_KEY}:`)) probeKeys.add(key);
        }
      } catch {
        /* فهرس المفاتيح اختياري — المفاتيح الثابتة تكفي للمسار الشائع */
      }
      const hasCipher = await SecureStoreService.hasEncryptedCiphertextOnDisk([...probeKeys]);
      if (hasCipher) {
        _err(
          '[CryptoService] Encrypted dossier data on disk but master key restore failed — refusing to mint a new key',
        );
        return;
      }
    } catch (error) {
      /*
       * فشل الفحص ≠ «لا بيانات». سكّ مفتاح جديد هنا يُعمي ciphertext قائماً.
       * نرفض السكّ؛ المستخدم يُبقي بياناته حتى تُستعاد الجلسة/المفتاح.
       */
      _err('[CryptoService] Ciphertext probe failed — refusing to mint a new key:', error);
      return;
    }

    await this.generateMasterKey();
    await this.persistKeyToPersistentStore();
  }

  private static purgeLegacyDeviceWrappedKey(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(DEVICE_KEY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  private static async tryRestoreLegacyDeviceKey(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const uid = String(this.boundStorageUserId ?? '').trim();
      const claimedBy = this.readLegacyKeyClaimedBy();
      // مفتاح الجهاز مشترك — لا يُستعاد لحساب غير صاحب الادعاء
      if (claimedBy && uid && claimedBy !== uid) {
        this.purgeLegacyDeviceWrappedKey();
        return false;
      }

      const deviceId = getOrCreateDeviceId();
      if (!deviceId) return false;

      const stored = localStorage.getItem(DEVICE_KEY_STORAGE_KEY);
      if (!stored) return false;

      let parsed: { wrapped?: string };
      try {
        parsed = JSON.parse(stored) as { wrapped?: string };
      } catch {
        this.purgeLegacyDeviceWrappedKey();
        return false;
      }

      if (!parsed.wrapped) {
        this.purgeLegacyDeviceWrappedKey();
        return false;
      }

      /* إرث الجهاز دائماً 600k — لا نغيّر صيغة التخزين القديمة */
      const wrappingKey = await deriveWrappingKey(
        `${DEVICE_WRAP_PREFIX}${deviceId}`,
        WRAP_KDF_ITERATIONS_LEGACY,
      );
      const wrappedKeyBuffer = fromBase64Url(parsed.wrapped);
      const unwrapped = await crypto.subtle.unwrapKey(
        'raw',
        wrappedKeyBuffer,
        wrappingKey,
        { name: 'AES-KW' },
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );

      this.masterKey = unwrapped;
      this.isInitialized = true;
      if (uid) this.writeLegacyKeyClaimedBy(uid);
      return true;
    } catch (error) {
      _warn('[CryptoService] Legacy device key restore failed:', error);
      this.purgeLegacyDeviceWrappedKey();
      return false;
    }
  }

  private static async tryRestoreKeyFromSession(): Promise<boolean> {
    try {
      const credential = this.sessionWrapCredential ?? (await getWrapCredential());
      if (!credential) return false;

      const sessionData = sessionStorage.getItem(SESSION_KEY_STORAGE_KEY);
      if (!sessionData) return false;

      let parsed: { wrapped?: string; iterations?: unknown; v?: unknown };
      try {
        parsed = JSON.parse(sessionData) as { wrapped?: string; iterations?: unknown; v?: unknown };
      } catch {
        sessionStorage.removeItem(SESSION_KEY_STORAGE_KEY);
        return false;
      }

      if (!parsed.wrapped) {
        sessionStorage.removeItem(SESSION_KEY_STORAGE_KEY);
        return false;
      }

      const wrappingKey = await deriveWrappingKey(
        credential,
        resolveStoredWrapIterations(parsed),
      );
      const wrappedKeyBuffer = fromBase64Url(parsed.wrapped);

      const unwrapped = await crypto.subtle.unwrapKey(
        'raw',
        wrappedKeyBuffer,
        wrappingKey,
        { name: 'AES-KW' },
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      this.masterKey = unwrapped;
      this.isInitialized = true;
      return true;
    } catch (error) {
      _warn('[CryptoService] Session key restore failed, will generate a new key:', error);
      sessionStorage.removeItem(SESSION_KEY_STORAGE_KEY);
      return false;
    }
  }

  static async encryptData(plainText: string): Promise<string> {
    if (!this.masterKey) {
      throw new Error('CryptoService not initialized. Call initialize() first.');
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.masterKey, data);
    const ivB64 = this.arrayBufferToBase64(iv.buffer);
    const cipherB64 = this.arrayBufferToBase64(ciphertext);
    return `${ivB64}:${cipherB64}`;
  }

  static async decryptData(encryptedData: string): Promise<string> {
    if (!this.masterKey) {
      throw new Error('CryptoService not initialized. Call initialize() first.');
    }
    const trimmed = encryptedData.trim();
    if (!trimmed) return '';

    if (!this.isValidEncryptedData(trimmed)) {
      throw new Error('[CryptoService] Data does not appear to be encrypted or is corrupted');
    }

    if (trimmed.includes(':')) {
      const [ivB64, cipherB64] = trimmed.split(':', 2);
      if (!ivB64 || !cipherB64) throw new Error('[CryptoService] Tampered data: invalid IV/ciphertext format');
      const ivBuf = this.base64ToArrayBuffer(ivB64);
      const cipherBuf = this.base64ToArrayBuffer(cipherB64);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(ivBuf) }, this.masterKey, cipherBuf);
      return new TextDecoder().decode(decrypted);
    }

    const combined = this.base64ToArrayBuffer(trimmed);
    const combinedArray = new Uint8Array(combined);
    const iv = combinedArray.slice(0, 12);
    const cipher = combinedArray.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, this.masterKey, cipher);
    return new TextDecoder().decode(decrypted);
  }

  static async generateDataSignature(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return this.arrayBufferToHex(hashBuffer);
  }

  /** يطابق SHA-256(encrypted_data) الذي يولّده generateDataSignature — رفض عبث الحمولة */
  static async verifyDataSignature(data: string, expectedSignature: string): Promise<boolean> {
    try {
      const current = await this.generateDataSignature(data);
      const expected = String(expectedSignature ?? '').trim().toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(current) || !/^[0-9a-f]{64}$/.test(expected)) return false;
      return current === expected;
    } catch {
      return false;
    }
  }

  static async encrypt(plaintext: string): Promise<string> {
    return await this.encryptData(plaintext);
  }

  static async decrypt(ciphertext: string): Promise<string> {
    return await this.decryptData(ciphertext);
  }

  static destroy(): void {
    try {
      sessionStorage.removeItem(SESSION_KEY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    wrappingKeyCache.clear();
    this.masterKey = null;
    this.isInitialized = false;
    this.sessionWrapCredential = null;
    this.boundStorageUserId = undefined;
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private static arrayBufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private static isValidEncryptedData(data: string): boolean {
    try {
      const base64Regex = /^[A-Za-z0-9+/=]+(:[A-Za-z0-9+/=]+)?$/;
      if (!base64Regex.test(data)) return false;
      if (data.includes(':')) {
        const parts = data.split(':');
        if (parts.length !== 2) return false;
        return parts[0].length > 0 && parts[1].length > 0;
      }
      return data.length > 16;
    } catch {
      return false;
    }
  }
}
