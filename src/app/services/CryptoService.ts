import { getOrCreateDeviceId } from '@/app/security/deviceId';
import { signalPersistenceFailure } from '@/app/services/persistenceFailureSignal';
import { getBffCryptoWrapCredential } from '@/app/utils/bffCryptoSession';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';
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
/** ضيف الشِل / التجريبي — قفزة إلى حساب موقَّع تُبقي نفس مفتاح القرص. */
const TRANSIENT_STORAGE_USER_IDS = new Set<string>([GUEST_LAWYER_ID, 'demo_user']);

function isTransientStorageUserId(uid: string | null | undefined): boolean {
  const id = String(uid ?? '').trim();
  if (!id) return true;
  return TRANSIENT_STORAGE_USER_IDS.has(id);
}

function scopedMasterKeyRecordId(uid: string | null | undefined): string {
  const id = String(uid ?? '').trim();
  return id ? `${MASTER_KEY_RECORD_ID}:u:${id}` : MASTER_KEY_RECORD_ID;
}

/** وميض هوية الشِل (ضيف↔فارغ) لا يجوز أن يُعمي ciphertext قائم. تبديل حسابين حقيقيين يبقى إسقاطاً. */
function shouldHoldMasterKeyAcrossUidFlicker(
  previousUid: string | null | undefined,
  nextUid: string | null,
): boolean {
  if (isTransientStorageUserId(previousUid) && isTransientStorageUserId(nextUid)) {
    return true;
  }
  return !isTransientStorageUserId(previousUid) && isTransientStorageUserId(nextUid);
}

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

type MasterKeyRecord = {
  id?: string;
  key?: unknown;
  raw?: unknown;
  v?: unknown;
};

export class CryptoService {
  private static masterKey: CryptoKey | null = null;
  /** مادة AES خام لإعادة الكتابة بعد Reload — CryptoKey داخل كائن IDB لا ينجو من structured clone. */
  private static masterKeyBits: ArrayBuffer | null = null;
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
      /*
       * onblocked ≠ فشل. إرجاع null هنا كان يسكت persist فيُعمَى القرص بعد Reload.
       * ننتظر onsuccess بعد إغلاق الاتصال الحاجب.
       */
    });
  }

  private static resolveMasterKeyRecordId(): string {
    return scopedMasterKeyRecordId(this.boundStorageUserId);
  }

  private static async readMasterKeyRecord(recordId: string): Promise<MasterKeyRecord | null> {
    const db = await this.openCryptoDatabase();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(CRYPTO_KEY_STORE, 'readonly');
        const req = tx.objectStore(CRYPTO_KEY_STORE).get(recordId);
        req.onsuccess = () => {
          resolve((req.result as MasterKeyRecord | undefined) ?? null);
        };
        req.onerror = () => resolve(null);
        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
        tx.onabort = () => db.close();
      } catch {
        try {
          db.close();
        } catch {
          /* ignore */
        }
        resolve(null);
      }
    });
  }

  private static async adoptMasterKeyFromBits(bits: ArrayBuffer): Promise<boolean> {
    if (this.restorePinnedMasterKey()) return true;
    try {
      /*
       * importKey قد يفصل (detach) الـ ArrayBuffer الممرَّر.
       * نسخة ثابتة للمادة، ونسخة أخرى للاستيراد حتى لا تُعمَى البتات بعد COMMIT.
       */
      const persistent = bits.slice(0);
      const forImport = persistent.slice(0);
      const imported = await crypto.subtle.importKey(
        'raw',
        forImport,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );
      if (this.restorePinnedMasterKey()) return true;
      this.masterKey = imported;
      this.masterKeyBits = persistent;
      this.isInitialized = true;
      return true;
    } catch {
      return false;
    }
  }

  private static async adoptMasterKeyFromRecord(record: MasterKeyRecord | null): Promise<boolean> {
    if (!record) return false;
    if (typeof record.raw === 'string' && record.raw.trim()) {
      return this.adoptMasterKeyFromBits(fromBase64Url(record.raw.trim()));
    }
    if (record.key instanceof CryptoKey) {
      if (record.key.extractable) {
        try {
          const legacyBits = await crypto.subtle.exportKey('raw', record.key);
          return this.adoptMasterKeyFromBits(legacyBits);
        } catch {
          return false;
        }
      }
      this.masterKey = record.key;
      this.isInitialized = true;
      this.masterKeyBits = null;
      return true;
    }
    return false;
  }

  private static async tryRestoreKeyFromPersistentStore(): Promise<boolean> {
    if (
      await this.adoptMasterKeyFromRecord(
        await this.readMasterKeyRecord(this.resolveMasterKeyRecordId()),
      )
    ) {
      return true;
    }
    if (await this.tryAdoptAndRebindTransientMasterKey()) {
      return true;
    }
    if (await this.tryRestoreTransientScopedMasterKey()) {
      return true;
    }
    return this.tryRestoreSolePersistentMasterKey();
  }

  private static async readAllMasterKeyRecords(): Promise<MasterKeyRecord[]> {
    const db = await this.openCryptoDatabase();
    if (!db) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(CRYPTO_KEY_STORE, 'readonly');
        const req = tx.objectStore(CRYPTO_KEY_STORE).getAll();
        req.onsuccess = () => {
          resolve(Array.isArray(req.result) ? (req.result as MasterKeyRecord[]) : []);
        };
        req.onerror = () => resolve([]);
        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
        tx.onabort = () => db.close();
      } catch {
        try {
          db.close();
        } catch {
          /* ignore */
        }
        resolve([]);
      }
    });
  }

  private static async persistRestoredKeyForTransientUid(): Promise<void> {
    if (!String(this.boundStorageUserId ?? '').trim()) {
      this.boundStorageUserId = GUEST_LAWYER_ID;
    }
    await this.persistKeyToPersistentStore();
  }

  /**
   * ضيف الشِل بعد أن نُقل السجل إلى uid الحساب — سجل واحد على الجهاز = نفس المفتاح.
   *
   * والسجلّ يجب أن يكون **عابر المالك** (ضيف/تجريبي) أو إرثياً بلا نطاق. فالجلسة
   * العابرة تقع على مسار الدخول العادي — `initialize()` تسبق ضبط الهوية بسطر — وبعد
   * خروج محامٍ يكون سجلّه هو الوحيد على الجهاز. فتبنّيه يسلّم مفتاحه للمحامي التالي.
   * `FINDING-022`.
   */
  private static async tryRestoreSolePersistentMasterKey(): Promise<boolean> {
    if (!isTransientStorageUserId(this.boundStorageUserId)) return false;
    const usable = (await this.readAllMasterKeyRecords()).filter(
      (row) =>
        isTransientStorageUserId(String(row.id ?? '').split(':u:')[1]) &&
        ((typeof row.raw === 'string' && row.raw.trim().length > 0) ||
          (typeof CryptoKey !== 'undefined' && row.key instanceof CryptoKey)),
    );
    if (usable.length !== 1) return false;
    const restored = await this.adoptMasterKeyFromRecord(usable[0]);
    if (!restored) return false;
    await this.persistRestoredKeyForTransientUid();
    return true;
  }

  /** uid فارغ/ضيف بعد Reload — المفتاح ما زال تحت guest-lawyer-1. */
  private static async tryRestoreTransientScopedMasterKey(): Promise<boolean> {
    if (!isTransientStorageUserId(this.boundStorageUserId)) return false;
    for (const transientId of TRANSIENT_STORAGE_USER_IDS) {
      const restored = await this.adoptMasterKeyFromRecord(
        await this.readMasterKeyRecord(scopedMasterKeyRecordId(transientId)),
      );
      if (!restored) continue;
      this.boundStorageUserId = transientId;
      return true;
    }
    return false;
  }

  /**
   * Reload بعد قفزة الضيف→الحساب إن بقي السجل تحت guest-lawyer-1.
   * لا يرث حساب حقيقي مفتاح حساب حقيقي آخر.
   */
  private static async tryAdoptAndRebindTransientMasterKey(): Promise<boolean> {
    const uid = String(this.boundStorageUserId ?? '').trim();
    if (!uid || isTransientStorageUserId(uid)) return false;
    const claimedBy = this.readLegacyKeyClaimedBy();
    if (claimedBy && claimedBy !== uid && !isTransientStorageUserId(claimedBy)) {
      return false;
    }
    for (const transientId of TRANSIENT_STORAGE_USER_IDS) {
      const recordId = scopedMasterKeyRecordId(transientId);
      const restored = await this.adoptMasterKeyFromRecord(
        await this.readMasterKeyRecord(recordId),
      );
      if (!restored) continue;
      await this.persistKeyToPersistentStore();
      await this.deleteMasterKeyRecord(recordId);
      this.writeLegacyKeyClaimedBy(uid);
      return true;
    }
    return false;
  }

  private static async rebindMasterKeyFromTransientUid(
    previousUid: string | null | undefined,
    nextUid: string | null,
    incomingWrap: string | null,
  ): Promise<boolean> {
    if (
      !this.masterKey ||
      !isTransientStorageUserId(previousUid) ||
      isTransientStorageUserId(nextUid)
    ) {
      return false;
    }
    this.boundStorageUserId = nextUid;
    this.sessionWrapCredential = incomingWrap;
    this.isInitialized = true;
    await this.persistKeyToPersistentStore();
    /* لا يُترك السجلّ العابر خلفه: محامٍ لاحق على الجهاز نفسه يرثه عبر نافذة الهوية */
    const priorTransient = String(previousUid ?? '').trim();
    if (priorTransient) await this.deleteMasterKeyRecord(scopedMasterKeyRecordId(priorTransient));
    const claimed = String(nextUid ?? '').trim();
    if (claimed) this.writeLegacyKeyClaimedBy(claimed);
    return true;
  }

  private static buildPersistPayload(recordId: string): MasterKeyRecord | null {
    if (this.masterKeyBits) {
      return {
        id: recordId,
        raw: this.bytesToBase64(new Uint8Array(this.masterKeyBits.slice(0))),
        v: 4,
      };
    }
    if (this.masterKey) {
      return {
        id: recordId,
        key: this.masterKey,
        v: 3,
      };
    }
    return null;
  }

  private static async persistKeyToPersistentStore(): Promise<void> {
    const recordId = this.resolveMasterKeyRecordId();
    const payload = this.buildPersistPayload(recordId);
    if (!payload) return;
    const db = await this.openCryptoDatabase();
    /* مفتاح لم يبلغ القرص: كل ما يُشفَّر به يصير غير مقروء عند الإقلاع التالي */
    if (!db) {
      signalPersistenceFailure(recordId, 'db-unavailable', 'master key not persisted');
      return;
    }
    await new Promise<void>((resolve) => {
      const done = (detail?: string) => {
        try { db.close(); } catch { /* قد تكون أُغلقت */ }
        if (detail) signalPersistenceFailure(recordId, 'transaction-failed', detail);
        resolve();
      };
      try {
        const tx = db.transaction(CRYPTO_KEY_STORE, 'readwrite');
        tx.objectStore(CRYPTO_KEY_STORE).put(payload);
        /* الإتمام وحده حفظ — والإجهاض غالب سببه امتلاء الحصّة */
        tx.oncomplete = () => done();
        tx.onerror = () => done(tx.error?.name ?? 'master key write errored');
        tx.onabort = () => done(tx.error?.name ?? 'master key write aborted');
      } catch (error) {
        done(error instanceof Error ? error.name : 'master key put threw');
      }
    });
  }

  static async generateMasterKey(): Promise<CryptoKey> {
    if (this.restorePinnedMasterKey() && this.masterKey) {
      return this.masterKey;
    }
    const extractable = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
    if (this.restorePinnedMasterKey() && this.masterKey) {
      return this.masterKey;
    }
    const bits = await crypto.subtle.exportKey('raw', extractable);
    const adopted = await this.adoptMasterKeyFromBits(bits);
    if (!adopted || !this.masterKey) {
      throw new Error('[services_cryptoservice_t:cryptoservicefaile] CryptoService failed to adopt master key');
    }
    return this.masterKey;
  }

  private static async deleteMasterKeyRecord(recordId: string): Promise<void> {
    const db = await this.openCryptoDatabase();
    /* سجلٌّ مشترك لم يُمحَ قد يرثه حساب لاحق على الجهاز نفسه — الصمت هنا أمنيّ */
    if (!db) {
      signalPersistenceFailure(recordId, 'db-unavailable', 'key record not deleted');
      return;
    }
    await new Promise<void>((resolve) => {
      const done = (detail?: string) => {
        try { db.close(); } catch { /* قد تكون أُغلقت */ }
        if (detail) signalPersistenceFailure(recordId, 'transaction-failed', detail);
        resolve();
      };
      try {
        const tx = db.transaction(CRYPTO_KEY_STORE, 'readwrite');
        tx.objectStore(CRYPTO_KEY_STORE).delete(recordId);
        tx.oncomplete = () => done();
        tx.onerror = () => done(tx.error?.name ?? 'key record delete errored');
        tx.onabort = () => done(tx.error?.name ?? 'key record delete aborted');
      } catch (error) {
        done(error instanceof Error ? error.name : 'key record delete threw');
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

    const restored = await this.adoptMasterKeyFromRecord(
      await this.readMasterKeyRecord(MASTER_KEY_RECORD_ID),
    );
    if (restored) {
      this.writeLegacyKeyClaimedBy(uid);
    }
    return restored;
  }

  private static masterKeyPinCount = 0;
  private static pinnedMasterKey: CryptoKey | null = null;
  private static pinnedMasterKeyBits: ArrayBuffer | null = null;
  private static initializeInFlight: Promise<void> | null = null;

  static pinMasterKeyForAtomicWrite(): void {
    this.masterKeyPinCount += 1;
    if (this.masterKeyPinCount === 1 && this.masterKey) {
      this.pinnedMasterKey = this.masterKey;
      this.pinnedMasterKeyBits = this.masterKeyBits ? this.masterKeyBits.slice(0) : null;
    }
  }

  static unpinMasterKeyForAtomicWrite(): void {
    this.masterKeyPinCount = Math.max(0, this.masterKeyPinCount - 1);
    if (this.masterKeyPinCount === 0) {
      this.pinnedMasterKey = null;
      this.pinnedMasterKeyBits = null;
    }
  }

  static hasMasterKey(): boolean {
    return Boolean(this.activeMasterKey());
  }

  private static activeMasterKey(): CryptoKey | null {
    if (this.masterKeyPinCount > 0 && this.pinnedMasterKey) return this.pinnedMasterKey;
    return this.masterKey;
  }

  /** تهيئة معلّقة بعد pin لا يجوز أن تستبدل مفتاح الكتابة. */
  private static restorePinnedMasterKey(): boolean {
    if (this.masterKeyPinCount <= 0) return false;
    if (this.pinnedMasterKey) {
      this.masterKey = this.pinnedMasterKey;
      this.masterKeyBits = this.pinnedMasterKeyBits;
      this.isInitialized = true;
    }
    return Boolean(this.masterKey);
  }

  /** تشخيص E2E/التحقق — لا يُسرّب مادة المفتاح */
  static probeKeyState(): { has: boolean; pin: number; bound: string; bits: number } {
    return {
      has: Boolean(this.masterKey),
      pin: this.masterKeyPinCount,
      bound: String(this.boundStorageUserId ?? ''),
      bits: this.masterKeyBits ? this.masterKeyBits.byteLength : 0,
    };
  }

  static async ensureMasterKeyObjectFromBits(): Promise<boolean> {
    if (this.restorePinnedMasterKey()) return true;
    if (!this.masterKeyBits) return Boolean(this.masterKey);
    return this.adoptMasterKeyFromBits(this.masterKeyBits);
  }

  /**
   * أعد تحميل AES من IDB حتى لو كانت الذاكرة تحمل مفتاحاً آخر.
   * فكّ ciphertext كُتب بمفتاح القرص يفشل بـ OperationError إذا قفزت الذاكرة.
   */
  static async rehydrateMasterKeyFromDisk(): Promise<boolean> {
    if (this.masterKeyPinCount > 0 && this.masterKey) return true;
    const previousKey = this.masterKey;
    const previousBits = this.masterKeyBits;
    const previousInit = this.isInitialized;
    const previousBound = this.boundStorageUserId;
    this.masterKey = null;
    this.masterKeyBits = null;
    this.isInitialized = false;
    const restored =
      (await this.tryRestoreKeyFromPersistentStore()) ||
      (await this.tryClaimLegacySharedMasterKey());
    if (restored) return true;
    this.masterKey = previousKey;
    this.masterKeyBits = previousBits;
    this.isInitialized = previousInit;
    this.boundStorageUserId = previousBound;
    return Boolean(this.masterKey);
  }

  static async persistInMemoryMasterKey(): Promise<void> {
    await this.persistKeyToPersistentStore();
  }

  static async initialize(userCredential?: string): Promise<void> {
    for (;;) {
      const uid = resolveLiveAuthUserIdForStorage();
      const incomingWrap =
        normalizeExplicitCredential(userCredential) ?? getBffCryptoWrapCredential();
      if (this.isInitialized && this.activeMasterKey() && this.boundStorageUserId === uid) {
        this.sessionWrapCredential = incomingWrap;
        return;
      }
      if (this.restorePinnedMasterKey()) {
        this.sessionWrapCredential = incomingWrap;
        return;
      }
      if (this.initializeInFlight) {
        await this.initializeInFlight;
        continue;
      }
      const run = this.initializeInner(userCredential);
      this.initializeInFlight = run;
      try {
        await run;
      } finally {
        if (this.initializeInFlight === run) this.initializeInFlight = null;
      }
      return;
    }
  }

  private static async initializeInner(userCredential?: string): Promise<void> {
    const uid = resolveLiveAuthUserIdForStorage();
    const incomingWrap =
      normalizeExplicitCredential(userCredential) ?? getBffCryptoWrapCredential();

    if (this.restorePinnedMasterKey()) {
      this.sessionWrapCredential = incomingWrap;
      return;
    }
    if (this.isInitialized && this.masterKey && this.boundStorageUserId === uid) {
      this.sessionWrapCredential = incomingWrap;
      return;
    }
    if (this.boundStorageUserId !== uid) {
      const rebound = await this.rebindMasterKeyFromTransientUid(
        this.boundStorageUserId,
        uid,
        incomingWrap,
      );
      if (this.restorePinnedMasterKey()) {
        this.sessionWrapCredential = incomingWrap;
        return;
      }
      if (rebound) return;
      if (
        this.masterKey &&
        shouldHoldMasterKeyAcrossUidFlicker(this.boundStorageUserId, uid)
      ) {
        this.sessionWrapCredential = incomingWrap;
        return;
      }
      this.masterKey = null;
      this.masterKeyBits = null;
      this.isInitialized = false;
    }
    this.boundStorageUserId = uid;
    this.sessionWrapCredential = incomingWrap;

    /*
     * IDB أولاً — مفتاح AES غير قابل للاستخراج بلا PBKDF2.
     * سابقاً: مسار الجلسة (600k) يسبق حتى مع وجود المفتاح في IDB.
     */
    const restoredPersistent = await this.tryRestoreKeyFromPersistentStore();
    if (this.restorePinnedMasterKey()) return;
    if (restoredPersistent) return;

    const restoredLegacyShared = await this.tryClaimLegacySharedMasterKey();
    if (this.restorePinnedMasterKey()) return;
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
    if (this.restorePinnedMasterKey()) return;
    if (restoredSession) {
      await this.persistKeyToPersistentStore();
      return;
    }

    const restoredLegacyDevice = await this.tryRestoreLegacyDeviceKey();
    if (this.restorePinnedMasterKey()) return;
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
      if (this.restorePinnedMasterKey()) return;
      if (hasCipher) {
        _err('[CryptoService] Encrypted data on disk but key restore failed — refusing to mint');
        this.reportKeylessSession('ciphertext on disk and no key could be restored');
        return;
      }
    } catch (error) {
      /* فشل الفحص ≠ «لا بيانات»: السكّ هنا يُعمي ciphertext قائماً، فيُرفض ويُبلَّغ */
      _err('[CryptoService] Ciphertext probe failed — refusing to mint a new key:', error);
      this.reportKeylessSession('ciphertext probe failed, minting refused');
      return;
    }

    if (this.restorePinnedMasterKey()) return;
    await this.generateMasterKey();
    if (this.restorePinnedMasterKey()) return;
    await this.persistKeyToPersistentStore();
  }

  /** جلسة بلا مفتاح فوق ciphertext تصير مرصودة. **إبلاغ لا علاج** — العلاج في hami-audit */
  private static reportKeylessSession(detail: string): void {
    const id = scopedMasterKeyRecordId(resolveLiveAuthUserIdForStorage());
    signalPersistenceFailure(id, 'encrypt-or-write-failed', detail);
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
        true,
        ['encrypt', 'decrypt'],
      );

      const bits = await crypto.subtle.exportKey('raw', unwrapped);
      if (!(await this.adoptMasterKeyFromBits(bits))) return false;
      if (uid) this.writeLegacyKeyClaimedBy(uid);
      return true;
    } catch (error) {
      /* لا محو هنا: فشلٌ عابر ليس عطباً، وهذا آخر مسار استعادة — التعليل في FINDING-015 */
      _warn('[CryptoService] Legacy device key restore failed:', error);
      return false;
    }
  }

  private static async tryRestoreKeyFromSession(): Promise<boolean> {
    try {
      if (typeof sessionStorage === 'undefined') return false;
      const sessionData = sessionStorage.getItem(SESSION_KEY_STORAGE_KEY);
      if (!sessionData) return false;

      const credential = this.sessionWrapCredential ?? (await getWrapCredential());
      if (!credential) return false;

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
        true,
        ['encrypt', 'decrypt']
      );

      const bits = await crypto.subtle.exportKey('raw', unwrapped);
      return this.adoptMasterKeyFromBits(bits);
    } catch (error) {
      /* لا محو هنا كذلك — والسكّ ليس النتيجة: السلسلة ترفضه إن وُجد ciphertext */
      _warn('[CryptoService] Session key restore failed:', error);
      return false;
    }
  }

  static async encryptData(plainText: string): Promise<string> {
    const key = this.activeMasterKey();
    if (!key) {
      throw new Error('[services_cryptoservice_t:cryptoservicenotin] CryptoService not initialized. Call initialize() first.');
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ivCopy = new Uint8Array(iv);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivCopy }, key, data);
    const ivB64 = this.bytesToBase64(ivCopy);
    const cipherB64 = this.bytesToBase64(new Uint8Array(ciphertext));
    return `${ivB64}:${cipherB64}`;
  }

  static async decryptData(encryptedData: string): Promise<string> {
    if (!this.activeMasterKey()) {
      throw new Error('[services_cryptoservice_t:cryptoservicenotin] CryptoService not initialized. Call initialize() first.');
    }
    const trimmed = encryptedData.trim();
    if (!trimmed) return '';
    if (!this.isValidEncryptedData(trimmed)) {
      throw new Error('[CryptoService] Data does not appear to be encrypted or is corrupted');
    }
    try {
      return await this.decryptDataOnce(trimmed);
    } catch (error) {
      if (this.masterKeyBits && this.isCryptoOperationError(error)) {
        if (await this.adoptMasterKeyFromBits(this.masterKeyBits)) {
          return await this.decryptDataOnce(trimmed);
        }
      }
      throw error;
    }
  }

  private static isCryptoOperationError(error: unknown): boolean {
    return (
      (typeof DOMException !== 'undefined' &&
        error instanceof DOMException &&
        error.name === 'OperationError') ||
      (error instanceof Error && error.name === 'OperationError')
    );
  }

  private static async decryptDataOnce(trimmed: string): Promise<string> {
    const key = this.activeMasterKey();
    if (!key) {
      throw new Error('[services_cryptoservice_t:cryptoservicenotin] CryptoService not initialized. Call initialize() first.');
    }

    if (trimmed.includes(':')) {
      const [ivB64, cipherB64] = trimmed.split(':', 2);
      if (!ivB64 || !cipherB64) throw new Error('[CryptoService] Tampered data: invalid IV/ciphertext format');
      const ivBuf = this.base64ToArrayBuffer(ivB64);
      const cipherBuf = this.base64ToArrayBuffer(cipherB64);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(ivBuf) },
        key,
        cipherBuf,
      );
      return new TextDecoder().decode(decrypted);
    }

    const combined = this.base64ToArrayBuffer(trimmed);
    const combinedArray = new Uint8Array(combined);
    const iv = combinedArray.slice(0, 12);
    const cipher = combinedArray.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
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
    if (this.masterKeyPinCount > 0) return;
    try {
      sessionStorage.removeItem(SESSION_KEY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    wrappingKeyCache.clear();
    this.masterKey = null;
    this.masterKeyBits = null;
    this.isInitialized = false;
    this.sessionWrapCredential = null;
    this.boundStorageUserId = undefined;
  }

  private static bytesToBase64(bytes: Uint8Array): string {
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    return this.bytesToBase64(new Uint8Array(buffer));
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
