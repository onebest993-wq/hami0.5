import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { isCloudSyncEnabled } from './cloudSyncEnv.js';

const LAWYER_SETTINGS_TABLE = 'lawyer_settings';
const LEGACY_DEV_USER_KEY = 'dev_user';

let supabasePromise = null;

async function getSupabase() {
    if (!supabasePromise) {
        supabasePromise = import('./supabaseClient.js').then((mod) => mod.supabase);
    }
    return supabasePromise;
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
 * @param {{ lawyer_settings?: unknown }} [overrides]
 */
export function collectAppData(overrides = {}) {
    return {
        lawyer_settings:
            overrides.lawyer_settings ?? persistenceRepository.load('lawyer_settings'),
        lawyer_theme: persistenceRepository.load('lawyer_theme'),
        lawyer_shape: persistenceRepository.load('lawyer_shape'),
        syncedAt: Date.now(),
    };
}

/**
 * @param {unknown} appData
 */
export function applyAppData(appData) {
    if (!appData || typeof appData !== 'object') return false;

    const record = /** @type {Record<string, unknown>} */ (appData);
    if (record.lawyer_settings != null) {
        persistenceRepository.save('lawyer_settings', record.lawyer_settings);
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
    const user_key = await resolveUserKeyOrThrow();
    const supabase = await getSupabase();
    const payload = {
        user_key,
        app_data: appData ?? {},
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from(LAWYER_SETTINGS_TABLE)
        .upsert(payload, { onConflict: 'user_key' })
        .select('user_key, app_data, updated_at')
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function loadFromCloud() {
    const user_key = await resolveCloudSyncUserKey();
    if (!user_key) return null;

    const supabase = await getSupabase();
    const { data, error } = await supabase
        .from(LAWYER_SETTINGS_TABLE)
        .select('app_data, updated_at')
        .eq('user_key', user_key)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data?.app_data ?? null;
}

/** ترحيل اختياري من dev_user إلى المستخدم الحالي */
export async function migrateLegacyDevUserCloudData() {
    const user_key = await resolveCloudSyncUserKey();
    if (!user_key) return false;

    const supabase = await getSupabase();
    const { data: legacy, error: legacyError } = await supabase
        .from(LAWYER_SETTINGS_TABLE)
        .select('app_data, updated_at')
        .eq('user_key', LEGACY_DEV_USER_KEY)
        .maybeSingle();

    if (legacyError || !legacy?.app_data) return false;

    const { data: existing } = await supabase
        .from(LAWYER_SETTINGS_TABLE)
        .select('user_key')
        .eq('user_key', user_key)
        .maybeSingle();

    if (existing?.user_key) return false;

    const { error } = await supabase.from(LAWYER_SETTINGS_TABLE).upsert(
        {
            user_key,
            app_data: legacy.app_data,
            updated_at: legacy.updated_at ?? new Date().toISOString(),
        },
        { onConflict: 'user_key' },
    );

    return !error;
}

export { isCloudSyncEnabled, LEGACY_DEV_USER_KEY };
