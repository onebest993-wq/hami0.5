const __DEV__ = import.meta.env.DEV;
const _log = (...a: unknown[]) => { if (__DEV__) console.log(...a); };
const _warn = (...a: unknown[]) => { if (__DEV__) console.warn(...a); };
const _err = (...a: unknown[]) => { if (__DEV__) console.error(...a); };

const SESSION_KEY_STORAGE_KEY = 'hami-crypto-session-key';
const KEY_SALT = 'hami-crypto-key-salt-v2';

async function getToken(): Promise<string | null> {
  try {
    const { supabase } = await import('@/app/lib/supabase-client');
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token?.trim() ?? null;
  } catch {
    return null;
  }
}

async function deriveWrappingKey(token: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`hami-crypto-wrap:${token}`),
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

  static setMasterKey(key: CryptoKey): void {
    this.masterKey = key;
    this.isInitialized = true;
  }

  static async generateMasterKey(): Promise<CryptoKey> {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
    this.masterKey = key;
    this.isInitialized = true;
    return key;
  }

  static async initialize(_userCredential?: string): Promise<void> {
    if (this.isInitialized && this.masterKey) return;

    const restored = await this.tryRestoreKeyFromSession();
    if (restored) return;

    await this.generateMasterKey();
    await this.persistKeyToSession();
  }

  private static async tryRestoreKeyFromSession(): Promise<boolean> {
    try {
      const token = await getToken();
      if (!token) return false;

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

      const wrappingKey = await deriveWrappingKey(token);
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
      _warn('[CryptoService] Session key restore failed, will generate new key:', error);
      sessionStorage.removeItem(SESSION_KEY_STORAGE_KEY);
      return false;
    }
  }

  private static async persistKeyToSession(): Promise<void> {
    try {
      if (!this.masterKey) return;
      const token = await getToken();
      if (!token) return;

      const wrappingKey = await deriveWrappingKey(token);
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
