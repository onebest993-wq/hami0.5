/**
 * عقد مسح التطبيق — يضمن استدعاء مسارات التخزين/السحابة دون ثغرة صامتة.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getSession,
  signOut,
  clearRepo,
  clearVault,
  fetchSecure,
  listKeys,
  deleteItem,
  discardHeavyPersistPending,
  clearDecryptedMemoryCache,
  storageCacheClear,
  purgeExecutionLocal,
  resolveLiveUserId,
  bffEnabled,
  bffLogout,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  clearRepo: vi.fn(),
  clearVault: vi.fn(),
  fetchSecure: vi.fn(),
  listKeys: vi.fn(async () => [] as string[]),
  deleteItem: vi.fn(async () => undefined),
  discardHeavyPersistPending: vi.fn(),
  clearDecryptedMemoryCache: vi.fn(),
  storageCacheClear: vi.fn(),
  purgeExecutionLocal: vi.fn(async () => undefined),
  resolveLiveUserId: vi.fn(() => null as string | null),
  bffEnabled: vi.fn(() => false),
  bffLogout: vi.fn(async () => undefined),
}));

vi.mock('@/app/lib/supabase-client', () => ({
  supabase: {
    auth: {
      getSession: getSession,
      signOut: signOut,
    },
  },
}));

vi.mock('@/app/infrastructure/persistence/LocalStorageRepository', () => ({
  persistenceRepository: { clear: clearRepo },
}));

vi.mock('@/app/services/security/webAuthnLock', () => ({
  clearStoredBiometricCredential: vi.fn(),
}));

vi.mock('@/app/runtime/nativeBiometricBridge', () => ({
  clearNativeBiometricEnrollment: vi.fn(),
}));

vi.mock('@/app/services/SecureStoreService', () => ({
  default: {
    listKeys,
    deleteItem,
    discardHeavyPersistPending,
    clearDecryptedMemoryCache,
  },
}));

vi.mock('@/app/utils/storageCache', () => ({
  storageCache: { clear: storageCacheClear },
}));

vi.mock('@/app/utils/executionWipeRegistry', () => ({
  purgeExecutionLocalStateOnLogout: purgeExecutionLocal,
}));

vi.mock('@/app/services/settings/mutePersistedStoresForWipe', () => ({
  mutePersistedStoresForApplicationWipe: vi.fn(async () => undefined),
}));

vi.mock('@/app/services/notifications/notificationClientWipe', () => ({
  wipeShellNotificationsClient: vi.fn(async () => true),
}));

vi.mock('@/app/services/SecureAPIClient', () => ({
  SecureAPIClient: { fetchSecure },
}));

vi.mock('@/app/services/vaultBlobStore', () => ({
  clearAllVaultBlobs: clearVault,
}));

vi.mock('@/app/services/settings', () => ({
  invalidateLawyerSettingsCache: vi.fn(),
  persistWallpaper: vi.fn(),
}));

vi.mock('@/app/services/settings/localOnlyGuard', () => ({
  runBypassingLocalOnlyForUrl: async <T,>(_url: string, fn: () => Promise<T>) => fn(),
}));

vi.mock('@/app/services/notifications/notificationLocalCleanup', () => ({
  clearLocalNotificationCache: vi.fn(),
  resetNotificationStoreAfterWipe: vi.fn(async () => undefined),
}));

vi.mock('@/app/utils/authStorage', () => ({
  purgeClientAuthResidue: vi.fn(),
}));

vi.mock('@/app/utils/bffCryptoSession', () => ({
  clearBffCryptoWrapCredential: vi.fn(),
}));

vi.mock('@/app/security/csrfSession', () => ({
  clearCsrfSessionToken: vi.fn(),
}));

const { cryptoDestroy, wipeIdb } = vi.hoisted(() => ({
  cryptoDestroy: vi.fn(),
  wipeIdb: vi.fn(async () => undefined),
}));

vi.mock('@/app/services/CryptoService', () => ({
  CryptoService: { destroy: cryptoDestroy },
}));

vi.mock('@/app/services/settings/wipeIndexedDatabases', () => ({
  wipeApplicationIndexedDatabases: wipeIdb,
}));

vi.mock('@/app/utils/liveAuthUserId', () => ({
  setLiveAuthUserId: vi.fn(),
  resolveLiveAuthUserIdForStorage: resolveLiveUserId,
}));

vi.mock('@/app/utils/bffAuthClient', () => ({
  bffLogout,
  isBffAuthEnabled: bffEnabled,
}));

describe('wipeAllApplicationData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    resolveLiveUserId.mockReturnValue(null);
    bffEnabled.mockReturnValue(false);
    getSession.mockResolvedValue({ data: { session: null } });
    signOut.mockResolvedValue({ error: null });
    bffLogout.mockResolvedValue(undefined);
    fetchSecure.mockResolvedValue({
      ok: true,
      complete: true,
      receipt: { database: { totalDeleted: 4 }, storage: { deleted: 2 } },
    });
    clearVault.mockResolvedValue(undefined);
    wipeIdb.mockResolvedValue(undefined);
    listKeys.mockResolvedValue([]);
    localStorage.clear();
    sessionStorage.clear();
  });

  it('يمسح التخزين المحلي ويستدعي reset حتى بدون جلسة', async () => {
    localStorage.setItem('lawyer_settings', '{"a":1}');
    localStorage.setItem('hami:boot', 'x');
    localStorage.setItem('legal-cases-storage', '{"state":{"cases":[1]}}');
    const reset = vi.fn();
    const { wipeAllApplicationData } = await import('@/app/services/settings/applicationWipe');
    const result = await wipeAllApplicationData(reset);

    expect(clearRepo).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
    expect(clearVault).toHaveBeenCalled();
    expect(cryptoDestroy).toHaveBeenCalled();
    expect(wipeIdb).toHaveBeenCalled();
    expect(discardHeavyPersistPending).toHaveBeenCalled();
    expect(clearDecryptedMemoryCache).toHaveBeenCalled();
    expect(storageCacheClear).toHaveBeenCalled();
    expect(purgeExecutionLocal).toHaveBeenCalled();
    expect(reset).toHaveBeenCalled();
    expect(result).toEqual({
      cloudAttempted: false,
      cloudCompleted: false,
      localCompleted: true,
      failedLocalStages: [],
      userId: null,
      receipt: undefined,
    });
    expect(localStorage.getItem('lawyer_settings')).toBeNull();
    expect(localStorage.getItem('legal-cases-storage')).toBeNull();
  });

  it('يربط مسح السحابة بهوية الجلسة ويستخدم BFF واحداً حتى في local-only', async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-abc' } } },
    });
    const reset = vi.fn();
    const { wipeAllApplicationData } = await import('@/app/services/settings/applicationWipe');
    const result = await wipeAllApplicationData(reset);

    expect(fetchSecure).toHaveBeenCalledTimes(1);
    expect(fetchSecure).toHaveBeenCalledWith('/api/settings/wipe', expect.objectContaining({
      method: 'POST',
    }));
    expect(result.userId).toBe('user-abc');
    expect(result.cloudAttempted).toBe(true);
    expect(result.cloudCompleted).toBe(true);
  });

  it('يفشل مغلقاً ولا يمسح المحلي إذا فشل مسح السحابة', async () => {
    resolveLiveUserId.mockReturnValue('bff-user');
    fetchSecure.mockRejectedValueOnce(new Error('offline'));
    const reset = vi.fn();
    const { wipeAllApplicationData } = await import('@/app/services/settings/applicationWipe');

    await expect(wipeAllApplicationData(reset)).rejects.toThrow('offline');
    expect(clearRepo).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('ينتظر callback تسجيل الخروج بعد اكتمال المسح المحلي والسحابي', async () => {
    resolveLiveUserId.mockReturnValue('bff-user');
    const onLogout = vi.fn(async () => undefined);
    const reset = vi.fn();
    const { wipeAllApplicationData } = await import('@/app/services/settings/applicationWipe');

    await wipeAllApplicationData(reset, onLogout);

    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledWith({ skipLocalPurge: true });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('ينهي الجلسة ويصرح بالفشل إذا تعذر حذف مخزن محلي بعد مسح السحابة', async () => {
    resolveLiveUserId.mockReturnValue('bff-user');
    wipeIdb.mockRejectedValueOnce(new Error('blocked'));
    const onLogout = vi.fn(async () => undefined);
    const { wipeAllApplicationData } = await import('@/app/services/settings/applicationWipe');

    await expect(wipeAllApplicationData(vi.fn(), onLogout)).rejects.toThrow(
      'local_wipe_incomplete:indexed_databases',
    );
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('يحفظ موافقة الشروط عند purge الخروج ولا يبقي بيانات الحساب', async () => {
    const { markLegalTermsAccepted, hasAcceptedCurrentLegalTerms } = await import(
      '@/app/services/auth/legalTermsAcceptance'
    );
    markLegalTermsAccepted();
    localStorage.setItem('lawyer_settings', '{"a":1}');
    const { purgeLocalApplicationData } = await import('@/app/services/settings/applicationWipe');
    await purgeLocalApplicationData('user-1', undefined, { preserveLegalTerms: true });
    expect(hasAcceptedCurrentLegalTerms()).toBe(true);
    expect(localStorage.getItem('lawyer_settings')).toBeNull();
  });

  it('يمسح موافقة الشروط مع المسح الشامل للحساب/البيانات', async () => {
    const { markLegalTermsAccepted, hasAcceptedCurrentLegalTerms } = await import(
      '@/app/services/auth/legalTermsAcceptance'
    );
    markLegalTermsAccepted();
    expect(hasAcceptedCurrentLegalTerms()).toBe(true);
    const { wipeAllApplicationData } = await import('@/app/services/settings/applicationWipe');
    await wipeAllApplicationData(vi.fn());
    expect(hasAcceptedCurrentLegalTerms()).toBe(false);
  });
});
