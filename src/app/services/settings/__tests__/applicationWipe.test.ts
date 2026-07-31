/**
 * عقد مسح التطبيق — يضمن استدعاء مسارات التخزين/السحابة دون ثغرة صامتة.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getSession,
  signOut,
  clearRepo,
  wipeNotifClient,
  clearVault,
  isKvEnabled,
  fetchSecure,
  listKeys,
  deleteItem,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  clearRepo: vi.fn(),
  wipeNotifClient: vi.fn(),
  clearVault: vi.fn(),
  isKvEnabled: vi.fn(() => false),
  fetchSecure: vi.fn(),
  listKeys: vi.fn(async () => [] as string[]),
  deleteItem: vi.fn(async () => undefined),
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
  },
}));

vi.mock('@/app/services/SecureAPIClient', () => ({
  SecureAPIClient: { fetchSecure },
}));

vi.mock('@/app/services/kvProxyConfig', () => ({
  isKvProxyNetworkEnabled: isKvEnabled,
}));

vi.mock('@/app/services/vaultBlobStore', () => ({
  clearAllVaultBlobs: clearVault,
}));

vi.mock('@/app/services/settings', () => ({
  invalidateLawyerSettingsCache: vi.fn(),
  persistWallpaper: vi.fn(),
}));

vi.mock('@/app/services/settings/localOnlyGuard', () => ({
  runBypassingLocalOnly: async (fn: () => Promise<void>) => fn(),
}));

vi.mock('@/app/services/notifications/notificationClientWipe', () => ({
  wipeShellNotificationsClient: wipeNotifClient,
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
}));

describe('wipeAllApplicationData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    isKvEnabled.mockReturnValue(false);
    getSession.mockResolvedValue({ data: { session: null } });
    signOut.mockResolvedValue({ error: null });
    wipeNotifClient.mockResolvedValue(undefined);
    clearVault.mockResolvedValue(undefined);
    listKeys.mockResolvedValue([]);
    localStorage.clear();
    sessionStorage.clear();
  });

  it('يمسح التخزين المحلي ويستدعي reset حتى بدون جلسة', async () => {
    localStorage.setItem('lawyer_settings', '{"a":1}');
    localStorage.setItem('hami:boot', 'x');
    const reset = vi.fn();
    const { wipeAllApplicationData } = await import('@/app/services/settings/applicationWipe');
    const result = await wipeAllApplicationData(reset);

    expect(clearRepo).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
    expect(clearVault).toHaveBeenCalled();
    expect(cryptoDestroy).toHaveBeenCalled();
    expect(wipeIdb).toHaveBeenCalled();
    expect(reset).toHaveBeenCalled();
    expect(result).toEqual({ cloudAttempted: false, userId: null });
    expect(localStorage.getItem('lawyer_settings')).toBeNull();
  });

  it('مع مستخدم + KV معطّل: لا يستدعي kv-proxy ويُبلغ cloudAttempted=false', async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-abc' } } },
    });
    isKvEnabled.mockReturnValue(false);
    const reset = vi.fn();
    const { wipeAllApplicationData } = await import('@/app/services/settings/applicationWipe');
    const result = await wipeAllApplicationData(reset);

    expect(wipeNotifClient).toHaveBeenCalled();
    expect(fetchSecure).not.toHaveBeenCalled();
    expect(result.userId).toBe('user-abc');
    expect(result.cloudAttempted).toBe(false);
  });

  it('مع مستخدم + KV مفعّل: يمسح بادئات المستخدم عبر kv-proxy', async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: 'uid-1' } } },
    });
    isKvEnabled.mockReturnValue(true);
    fetchSecure.mockResolvedValue({ ok: true, deleted: 1, keys: [] });
    const reset = vi.fn();
    const { wipeAllApplicationData } = await import('@/app/services/settings/applicationWipe');
    const result = await wipeAllApplicationData(reset);

    expect(fetchSecure).toHaveBeenCalled();
    const bodies = fetchSecure.mock.calls.map(
      (c) => JSON.parse(String((c[1] as { body?: string })?.body ?? '{}')) as { action?: string; prefix?: string },
    );
    expect(bodies.some((b) => b.action === 'delByPrefix' && b.prefix === 'user:uid-1:')).toBe(true);
    expect(result.cloudAttempted).toBe(true);
  });
});
