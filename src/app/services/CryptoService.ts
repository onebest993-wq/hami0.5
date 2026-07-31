import { getOrCreateDeviceId } from '@/app/security/deviceId';
import { getBffCryptoWrapCredential } from '@/app/utils/bffCryptoSession';

const __DEV__ = import.meta.env.DEV;
const _log = (...a: unknown[]) => {
  if (__DEV__) console.warn(...a);
};
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

async function deriveWrappingKey(credential: string): Promise<CryptoKey> {
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
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(KEY_SALT),
      iterations: 600000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-KW', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  );
}

function toBase64Url(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
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

  private static async tryRestoreKeyFromPersistentStore(): Promise<boolean> {
    const db = await this.openCryptoDatabase();
    if (!db) return false;
    return new Promise((resolve) => {
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
  }

  private static async persistKeyToPersistentStore(): Promise<void> {
    if (!this.masterKey) return;
    const db = await this.openCryptoDatabase();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(CRYPTO_KEY_STORE, 'readwrite');
        tx.objectStore(CRYPTO_KEY_STORE).put({
          id: MASTER_KEY_RECORD_ID,
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

  static setMasterKey(key: CryptoKey): void {
    this.masterKey = key;
    this.isInitialized = true;
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

  static async initialize(userCredential?: string): Promise<void> {
    if (this.isInitialized && this.masterKey) return;

    this.sessionWrapCredential = normalizeExplicitCredential(userCredential);

    const restoredPersistent = await this.tryRestoreKeyFromPersistentStore();
    if (restoredPersistent) return;

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

      const wrappingKey = await deriveWrappingKey(`${DEVICE_WRAP_PREFIX}${deviceId}`);
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

      let parsed: { wrapped: string };
      try {
        parsed = JSON.parse(sessionData);
      } catch {
        sessionStorage.removeItem(SESSION_KEY_STORAGE_KEY);
        return false;
      }

      if (!parsed.wrapped) {
        sessionStorage.removeItem(SESSION_KEY_STORAGE_KEY);
        return false;
      }

      const wrappingKey = await deriveWrappingKey(credential);
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

  private static async persistKeyToSession(): Promise<void> {
    try {
      if (!this.masterKey) return;
      if (!this.masterKey.extractable) return;
      const credential = this.sessionWrapCredential ?? (await getWrapCredential());
      if (!credential) return;

      const wrappingKey = await deriveWrappingKey(credential);
      const wrapped = await crypto.subtle.wrapKey(
        'raw',
        this.masterKey,
        wrappingKey,
        { name: 'AES-KW' }
      );

      sessionStorage.setItem(SESSION_KEY_STORAGE_KEY, JSON.stringify({
        wrapped: toBase64Url(wrapped),
        v: 2,
      }));
    } catch (error) {
      _warn('[CryptoService] Session key persist failed:', error);
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

  static async encrypt(plaintext: string): Promise<string> {
    return await this.encryptData(plaintext);
  }

  static async decrypt(ciphertext: string): Promise<string> {
    return await this.decryptData(ciphertext);
  }

  static async generateSignature(data: Record<string, unknown>): Promise<string> {
    const cleanedEntries = Object.entries(data).filter(([, v]) => v !== undefined && v !== null && v !== '');
    const criticalFields = cleanedEntries
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join('|');
    return await this.generateDataSignature(criticalFields);
  }

  static async verifySignature(
    data: Record<string, unknown>,
    expectedSignature: string
  ): Promise<boolean> {
    try {
      const currentSignature = await this.generateSignature(data);
      return currentSignature === expectedSignature;
    } catch {
      return false;
    }
  }

  static async encryptObject(obj: Record<string, unknown>): Promise<{
    encrypted: Record<string, unknown>;
    signature: string;
  }> {
    const encrypted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.trim()) {
        encrypted[key] = await this.encryptData(value);
      } else {
        encrypted[key] = value;
      }
    }
    const signature = await this.generateSignature(obj);
    return { encrypted, signature };
  }

  static async decryptObject(
    encryptedObj: Record<string, unknown>,
    expectedSignature?: string
  ): Promise<{
    decrypted: Record<string, unknown>;
    isIntegrityValid: boolean;
    needsReEncryption?: boolean;
  }> {
    if (!encryptedObj || typeof encryptedObj !== 'object') {
      _warn('[CryptoService] Invalid input - expected object, got:', typeof encryptedObj);
      return {
        decrypted: {},
        isIntegrityValid: false,
        needsReEncryption: false
      };
    }

    const decrypted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(encryptedObj)) {
      if (typeof value !== 'string') {
        decrypted[key] = value;
        continue;
      }
      const trimmed = value.trim();
      if (!trimmed) {
        decrypted[key] = value;
        continue;
      }
      if (trimmed.includes(':')) {
        try {
          decrypted[key] = await this.decryptData(trimmed);
        } catch (error) {
          _warn('[CryptoService] Field decrypt failed:', key, error);
          decrypted[key] = '[DECRYPT_FAILED]';
        }
        continue;
      }
      if (/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed) && trimmed.length >= 24) {
        try {
          decrypted[key] = await this.decryptData(trimmed);
        } catch {
          _warn('[CryptoService] Field decrypt failed (base64 but not encrypted):', key);
          decrypted[key] = value;
        }
        continue;
      }
      decrypted[key] = value;
    }

    let isIntegrityValid = true;
    let needsReEncryption = false;

    if (expectedSignature) {
      isIntegrityValid = await this.verifySignature(decrypted, expectedSignature);
      if (!isIntegrityValid) {
        needsReEncryption = true;
      }
    }

    return { decrypted, isIntegrityValid, needsReEncryption };
  }

  static async reEncryptObject(
    oldEncryptedObj: Record<string, unknown>,
    oldSignature: string
  ): Promise<{
    encrypted: Record<string, unknown>;
    signature: string;
  } | null> {
    try {
      const { decrypted } = await this.decryptObject(oldEncryptedObj, oldSignature);
      return await this.encryptObject(decrypted);
    } catch (error) {
      _err('[CryptoService] Re-encryption failed:', error);
      return null;
    }
  }

  static destroy(): void {
    try {
      sessionStorage.removeItem(SESSION_KEY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    this.masterKey = null;
    this.isInitialized = false;
    this.sessionWrapCredential = null;
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
