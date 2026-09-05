import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { isCloudSyncEnabled } from './cloudSyncEnv.js';
import {
    mergeRemoteLawyerSettingsPreservingDeviceLock,
    sealCloudSyncedAppData,
    sealCloudSyncedLawyerSettings,
} from '@/app/services/settings/sealCloudSyncedPreferences';

const CLOUD_SYNC_PATH = '/api/settings/cloud-sync';
const LEGACY_DEV_USER_KEY = 'dev_user';

/**
 * @param {'GET' | 'POST' | 'PATCH'} method
 * @param {unknown} [body]
 */
async function bffCloudSyncRequest(method, body) {
    const { SecureAPIClient } = await import('@/app/services/SecureAPIClient');
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) {
        options.body = JSON.stringify(body);
    }
    return SecureAPIClient.fetchSecure(CLOUD_SYNC_PATH, options);
}

/**
 * مفتاح السحابة = معرّف المستخدم المصادق (Supabase UUID).
 * يُستبعد الضيف التجريبي وجلسات dev mock.
 * @returns {Promise<string | null>}
 */
export async function resolveCloudSyncUserKey() {
    try {
        const [{ supabase }, { readPersistedSupabaseAuth, isDevMockAccessToken }, { GUEST_LAWYER_ID }] =
            await Promise.all([
                import('./supabaseClient.js'),
                import('@/app/utils/authStorage'),
                import('@/app/utils/guestLawyerSession'),
            ]);

        const { data } = await supabase.auth.getSession();
        const sessionUserId = data?.session?.user?.id?.trim() ?? '';
        const sessionToken = data?.session?.access_token?.trim() ?? '';
        if (
            sessionUserId &&
            sessionUserId !== GUEST_LAWYER_ID &&
            sessionToken &&
            !isDevMockAccessToken(sessionToken)
        ) {
            return sessionUserId;
        }

        const persisted = readPersistedSupabaseAuth();
        const persistedId = persisted.user?.id?.trim() ?? '';
        const persistedToken = persisted.session?.access_token?.trim() ?? '';
        if (
            persistedId &&
            persistedId !== GUEST_LAWYER_ID &&
            persistedToken &&
            !isDevMockAccessToken(persistedToken)
        ) {
            return persistedId;
        }
    } catch {
        /* ignore */
    }

    return null;
}

async function resolveUserKeyOrThrow() {
    const key = await resolveCloudSyncUserKey();
    if (!key) {
        const err = new Error('يجب تسجيل الدخول بحساب حقيقي للمزامنة السحابية');
        err.code = 'CLOUD_SYNC_AUTH_REQUIRED';
        throw err;
    }
    return key;
}

/**
 * كيس BFF لجدول lawyer_settings.app_data — إرث المسح/الترحيل.
 * يُختم قبل الرفع: قاطع الجهاز ومفتاح المزامنة لا يُنقلان.
 * مزامنة العمل عبر runCloudSyncAllNow / KV المختوم لا عبر هذا الكيس.
 * @param {{ lawyer_settings?: unknown }} [overrides]
 */
export function collectAppData(overrides = {}) {
    return {
        lawyer_settings: sealCloudSyncedLawyerSettings(
            overrides.lawyer_settings ?? persistenceRepository.load('lawyer_settings'),
        ),
        lawyer_theme: persistenceRepository.load('lawyer_theme'),
        lawyer_shape: persistenceRepository.load('lawyer_shape'),
        syncedAt: Date.now(),
    };
}

/**
 * يدمج التفضيلات البعيدة دون المساس بقفل الجهاز أو مفتاح المزامنة المحلي.
 * @param {unknown} appData
 */
export function applyAppData(appData) {
    if (!appData || typeof appData !== 'object') return false;

    const record = /** @type {Record<string, unknown>} */ (appData);
    if (record.lawyer_settings != null) {
        const local = persistenceRepository.load('lawyer_settings');
        persistenceRepository.save(
            'lawyer_settings',
            mergeRemoteLawyerSettingsPreservingDeviceLock(record.lawyer_settings, local),
        );
    }
    if (record.lawyer_theme != null) {
        persistenceRepository.save('lawyer_theme', record.lawyer_theme);
    }
    if (record.lawyer_shape != null) {
        persistenceRepository.save('lawyer_shape', record.lawyer_shape);
    }
    return true;
}

/**
 * @param {unknown} appData
 */
export async function saveToCloud(appData) {
    await resolveUserKeyOrThrow();
    return bffCloudSyncRequest('POST', { app_data: sealCloudSyncedAppData(appData) ?? {} });
}

export async function loadFromCloud() {
    const user_key = await resolveCloudSyncUserKey();
    if (!user_key) return null;

    const res = await bffCloudSyncRequest('GET');
    const raw = res?.app_data ?? null;
    if (raw == null) return null;
    return sealCloudSyncedAppData(raw);
}

/** ترحيل اختياري من dev_user إلى المستخدم الحالي */
export async function migrateLegacyDevUserCloudData() {
    const user_key = await resolveCloudSyncUserKey();
    if (!user_key) return false;

    const res = await bffCloudSyncRequest('PATCH', { action: 'migrateLegacy' });
    return Boolean(res?.migrated);
}

export { isCloudSyncEnabled, LEGACY_DEV_USER_KEY };
