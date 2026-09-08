import { supabase } from '@/app/lib/supabase-client';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { clearStoredBiometricCredential } from '@/app/services/security/webAuthnLock';
import { clearNativeBiometricEnrollment } from '@/app/runtime/nativeBiometricBridge';
import { clearBiometricWorkspaceUnlock } from '@/app/services/security/biometricWorkspaceGate';
import SecureStoreService from '@/app/services/SecureStoreService';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { clearAllVaultBlobs } from '@/app/services/vaultBlobStore';
import { invalidateLawyerSettingsCache, persistWallpaper } from '@/app/services/settings';
import { runBypassingLocalOnlyForUrl } from '@/app/services/settings/localOnlyGuard';
import {
    clearLocalNotificationCache,
    resetNotificationStoreAfterWipe,
} from '@/app/services/notifications/notificationLocalCleanup';
import { purgeClientAuthResidue } from '@/app/utils/authStorage';
import { clearBffCryptoWrapCredential } from '@/app/utils/bffCryptoSession';
import { clearCsrfSessionToken } from '@/app/security/csrfSession';
import { clearPersistedDeviceId } from '@/app/security/deviceId';
import { CryptoService } from '@/app/services/CryptoService';
import { wipeApplicationIndexedDatabases } from '@/app/services/settings/wipeIndexedDatabases';
import {
    resolveLiveAuthUserIdForStorage,
    setLiveAuthUserId,
} from '@/app/utils/liveAuthUserId';
import { bffLogout, isBffAuthEnabled } from '@/app/utils/bffAuthClient';
import {
    captureLegalTermsAcceptance,
    clearLegalTermsAcceptance,
    restoreLegalTermsAcceptance,
    type LegalTermsAcceptanceRecord,
} from '@/app/services/auth/legalTermsAcceptance';

const SETTINGS_WIPE_URL = '/api/settings/wipe';
const SETTINGS_WIPE_CONFIRMATION = 'WIPE_ALL_APPLICATION_DATA_V1';

type CloudWipeResponse = {
    ok?: boolean;
    complete?: boolean;
    receipt?: {
        database?: Record<string, number>;
        storage?: { deleted?: number; buckets?: Record<string, number> };
    };
};

async function wipeCloudDataForCurrentUser(): Promise<CloudWipeResponse> {
    return runBypassingLocalOnlyForUrl(SETTINGS_WIPE_URL, async () => {
        const result = await SecureAPIClient.fetchSecure<CloudWipeResponse>(SETTINGS_WIPE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                confirmation: SETTINGS_WIPE_CONFIRMATION,
                version: 1,
            }),
        });
        if (!result?.ok || !result.complete) {
            throw new Error('[settings:wipe-cloud-incomplete] cloud_wipe_incomplete');
        }
        return result;
    });
}

function clearBrowserStorage(): void {
    try {
        localStorage.clear();
    } catch {
        /* private mode */
    }
    try {
        sessionStorage.clear();
    } catch {
        /* private mode */
    }

    purgeClientAuthResidue();
    clearBffCryptoWrapCredential();
    clearCsrfSessionToken();
    clearPersistedDeviceId();
}

/**
 * ذاكرة فقط — لا تلمس قرصاً، فتعمل في الوضعين.
 *
 * `clearDecryptedMemoryCache` هي **جوهر** عزل الحسابين: `decryptedCache` خريطة
 * على مستوى الوحدة (SecureStoreService.ts:51) تعيش ما دامت الصفحة حيّة،
 * والخروج لا يُعيد تحميل الصفحة. لو بقيت لقرأ الحساب الثاني نصوص الأول
 * المفكوكة من الذاكرة — وهو تحديداً ما توثّق هذه الدالة أنها تمنعه.
 * كانت مدفونة داخل الطور المُتلِف، فوجب فصلها كي لا يُسقطها وضع `'session'`.
 *
 * والكتابات المؤجّلة: `discard` يُلغي المؤقّتات بلا كتابة. كان ذلك مقبولاً حين
 * يُمحى كل شيء بعده مباشرةً، أمّا والخروج يحفظ البيانات فإلغاؤها يفقد آخر
 * تعديلات المستخدم. لذلك `flush` عند الخروج (يكتبها فعلاً عبر
 * queueDurableSetItem) و`discard` عند المسح الكامل.
 */
async function clearSecureStoreMemory(scope: 'all' | 'session'): Promise<void> {
    if (scope === 'session') {
        SecureStoreService.flushHeavyPersistPending();
    } else {
        SecureStoreService.discardHeavyPersistPending();
    }
    SecureStoreService.clearDecryptedMemoryCache();
    try {
        const { storageCache } = await import('@/app/utils/storageCache');
        storageCache.clear();
    } catch {
        /* best effort */
    }
}

/**
 * الشقّ المُتلِف وحده — يُحذف مفاتيح محفوظة، فلا يعمل إلا في `'all'`.
 * `purgeExecutionLocalStateOnLogout` رغم اسمه يحذف مفاتيح `execution_` و
 * `garnishment_` و`hami_unified_funds_ledger_` — بيانات إضبارات حقيقية.
 */
async function wipeLocalSecureStore(): Promise<void> {
    try {
        const { purgeExecutionLocalStateOnLogout } = await import(
            '@/app/utils/executionWipeRegistry'
        );
        await purgeExecutionLocalStateOnLogout();
    } catch {
        /* best effort */
    }
    try {
        if (__HAMI_CLIENT_PRODUCT__ !== 'hq') {
            const { mutePersistedStoresForApplicationWipe } = await import(
                '@/app/services/settings/mutePersistedStoresForWipe'
            );
            await mutePersistedStoresForApplicationWipe();
        }
    } catch {
        /* best effort */
    }
    const keys = await SecureStoreService.listKeys();
    await Promise.all(keys.map((key) => SecureStoreService.deleteItem(key)));
}

type LocalApplicationPurgeResult = {
    complete: boolean;
    failedStages: string[];
};

async function runLocalPurgeStage(
    failedStages: string[],
    stage: string,
    operation: () => void | Promise<void>,
): Promise<void> {
    try {
        await operation();
    } catch {
        failedStages.push(stage);
    }
}

type LocalApplicationPurgeOptions = {
    /** موافقة الشروط على الجهاز — تُحفظ عند الخروج، وتُمسح عند مسح الحساب/البيانات */
    preserveLegalTerms?: boolean;
    /**
     * `'all'` (الافتراضي): مسح مُتلِف — لحذف الحساب و«امسح كل بياناتي».
     * `'session'`: تسجيل خروج — يعزل الجلسة ولا يمسّ أي بيانات محفوظة.
     *
     * الفرق ليس تفصيلاً. الغرض المعلَن لاستدعاء الخروج — كما يقوله تعليق هذه
     * الدالة نفسه — هو ألّا يرث حساب ثانٍ الكاش المفكوك للأول. وهذا شأن ذاكرة.
     * لكن التنفيذ كان يمضي إلى `wipeApplicationIndexedDatabases` فيحذف
     * `hami-crypto-keystore` و`hami-secure-store` و`hami-vault-blobs` و
     * `hami-dossier-backups`. أي أن ضغطة «تسجيل الخروج» — وحوارها لا يَعِد إلا
     * بإنهاء الجلسات — كانت تمحو كل إضبارة وملاحظة وموعد ومستند على الجهاز،
     * **ومعها المفتاح الوحيد الذي يفكّ الأرشيف السحابي المشفَّر**. الدخول ثانيةً
     * يولّد مفتاحاً جديداً، فيصير ما في السحابة غير قابل للقراءة إلى الأبد.
     *
     * العزل بين الحسابين محفوظ في وضع `'session'`: مفتاح التشفير منطَّق بالمعرّف
     * (`master-key-v3:u:<uid>`)، فالحساب الثاني لا يستطيع فكّ بيانات الأول أصلاً؛
     * والكاش المفكوك وlocalStorage والبصمة والإشعارات تُمسح كما كانت.
     */
    scope?: 'all' | 'session';
};

/** الأطوار المُتلِفة — تعمل في `'all'` وحدها */
const DESTRUCTIVE_PURGE_STAGES = new Set([
    'persistence_repository',
    'secure_store',
    'vault_blobs',
    'indexed_databases',
]);

/**
 * Clears user-scoped client state.
 *
 * scope 'all'     — destructive: also drops every persisted store and IndexedDB
 *                   database. Used by delete-account and wipe-all-data.
 * scope 'session' — logout: clears the decrypted cache, in-memory keys, browser
 *                   storage, biometric enrolment and notification cache, and
 *                   leaves persisted user data untouched.
 */
export async function purgeLocalApplicationData(
    userId: string | null,
    resetToDefaults?: () => void,
    options?: LocalApplicationPurgeOptions,
): Promise<LocalApplicationPurgeResult> {
    const failedStages: string[] = [];
    const sessionScoped = options?.scope === 'session';
    const runStage = (stage: string, operation: () => void | Promise<void>): Promise<void> => {
        if (sessionScoped && DESTRUCTIVE_PURGE_STAGES.has(stage)) return Promise.resolve();
        return runLocalPurgeStage(failedStages, stage, operation);
    };
    const termsSnapshot: LegalTermsAcceptanceRecord | null = options?.preserveLegalTerms
        ? captureLegalTermsAcceptance()
        : null;

    const restorePreservedTerms = () => {
        if (termsSnapshot) restoreLegalTermsAcceptance(termsSnapshot);
    };

    if (resetToDefaults) {
        await runLocalPurgeStage(failedStages, 'settings_ui_reset', resetToDefaults);
    }
    await runStage('persistence_repository', () => persistenceRepository.clear());
    await runLocalPurgeStage(failedStages, 'biometric_credentials', () => {
        clearStoredBiometricCredential();
        clearNativeBiometricEnrollment();
        clearBiometricWorkspaceUnlock();
    });
    await runLocalPurgeStage(failedStages, 'wallpaper', () => {
        persistWallpaper(undefined);
    });
    await runLocalPurgeStage(failedStages, 'browser_storage', () => {
        clearBrowserStorage();
        restorePreservedTerms();
    });
    await runLocalPurgeStage(failedStages, 'notification_cache', async () => {
        clearLocalNotificationCache(userId);
        await resetNotificationStoreAfterWipe();
    });
    /* ذاكرة فقط — يعمل قبل الطور المُتلِف تماماً كما كان داخله، وفي الوضعين */
    await runLocalPurgeStage(failedStages, 'secure_store_memory', () =>
        clearSecureStoreMemory(sessionScoped ? 'session' : 'all'),
    );
    await runStage('secure_store', wipeLocalSecureStore);
    await runStage('vault_blobs', clearAllVaultBlobs);
    /* ذاكرة فقط — destroy() لا يلمس IndexedDB، فهو مطلوب في الوضعين */
    await runLocalPurgeStage(failedStages, 'crypto_memory', () => {
        CryptoService.destroy();
    });
    await runStage('indexed_databases', wipeApplicationIndexedDatabases);

    restorePreservedTerms();
    if (!options?.preserveLegalTerms) {
        clearLegalTermsAcceptance();
    }

    setLiveAuthUserId(null);
    invalidateLawyerSettingsCache();
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('hami:data-cleared'));
    }

    return {
        complete: failedStages.length === 0,
        failedStages,
    };
}

type ApplicationWipeResult = {
    cloudAttempted: boolean;
    cloudCompleted: boolean;
    localCompleted: boolean;
    failedLocalStages: string[];
    userId: string | null;
    receipt?: CloudWipeResponse['receipt'];
};

/** مسح شامل fail-closed: لا يعلن النجاح ولا يمسح النسخة المحلية إذا فشل مسح السحابة. */
export async function wipeAllApplicationData(
    resetToDefaults: () => void,
    onLogout?: (options?: { skipLocalPurge?: boolean }) => void | Promise<void>,
): Promise<ApplicationWipeResult> {
    const { data } = await supabase.auth.getSession();
    const userId =
        resolveLiveAuthUserIdForStorage() ??
        data.session?.user?.id?.trim() ??
        null;

    const cloudAttempted = Boolean(userId);
    const cloud = cloudAttempted
        ? await wipeCloudDataForCurrentUser()
        : undefined;

    /* KV/legacy inbox — يكمّل RPC مسح الإعدادات إن بقيت بقايا خارج الجداول */
    if (cloudAttempted) {
        try {
            const { wipeShellNotificationsClient } = await import(
                '@/app/services/notifications/notificationClientWipe'
            );
            await wipeShellNotificationsClient();
        } catch {
            /* best effort — المسح الشامل للجداول تم عبر wipe_user_application_data */
        }
    }

    const local = await purgeLocalApplicationData(userId, resetToDefaults);
    let logoutError: unknown;
    try {
        if (onLogout) {
            await onLogout({ skipLocalPurge: true });
        } else if (isBffAuthEnabled()) {
            if (!(await bffLogout())) {
                throw new Error('[settings:wipe-bff-logout-failed] bff_logout_failed');
            }
        } else {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        }
    } catch (error) {
        logoutError = error;
    }

    // Cloud deletion cannot be rolled back. Always attempt to terminate the
    // session even when one local store resisted deletion, then report honestly.
    if (!local.complete) {
        throw new Error(`[settings:wipe-local-incomplete] local_wipe_incomplete:${local.failedStages.join(',')}`);
    }
    if (logoutError) throw logoutError;

    return {
        cloudAttempted,
        cloudCompleted: cloudAttempted ? cloud?.complete === true : false,
        localCompleted: local.complete,
        failedLocalStages: local.failedStages,
        userId,
        receipt: cloud?.receipt,
    };
}
