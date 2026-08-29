import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
    writeSecureAndClearLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';
import {
    readScopedDeviceStorageItem,
    scopeExecutionDeviceStorageKey,
    stripExecutionDeviceStorageUserScope,
} from '@/app/utils/executionDeviceStorageScope';

/**
 * قراءة مقيّدة بالمالك مع ترحيل leftover — دون الكتابة فوق أصل مشفّر لم يُفكّ.
 *
 * `readScopedDeviceStorageItem` وحدها تنسخ غير المقيّد إلى المقيّد. إن كان
 * المقيّد unread فإن تلك النسخة تسمّم الشيفرة الباردة. هنا نرفض القراءة كلها
 * عند unread، ونرحّل المرآة فقط عندما يكون الأصل قابلاً للفكّ.
 */
export function readScopedSecureOrDrainLegacySync(baseKey: string): string | null {
    const unscoped = stripExecutionDeviceStorageUserScope(baseKey);
    const scoped = scopeExecutionDeviceStorageKey(unscoped);
    if (!scoped) return null;
    try {
        if (SecureStoreService.isUnreadSync(scoped)) return null;
        if (unscoped !== scoped && SecureStoreService.isUnreadSync(unscoped)) {
            return readSecureOrDrainLegacySync(scoped);
        }
    } catch {
        /* fall through to drain */
    }
    return readScopedDeviceStorageItem(
        (k) => readSecureOrDrainLegacySync(k),
        unscoped,
        {
            setItem: (k, v) => writeSecureAndClearLegacySync(k, v),
            removeItem: (k) => {
                try {
                    SecureStoreService.deleteItemSync(k);
                } catch {
                    /* ignore */
                }
                clearLegacyPlaintextMirror(k);
            },
        },
    );
}

/** كتابة مقيّدة ثم محو مرآة المفتاح المنطقي والتوأم غير المقيّد. */
export function writeScopedSecureAndClearLegacySync(logicalKey: string, value: string): void {
    const base = stripExecutionDeviceStorageUserScope(logicalKey);
    const writeKey = scopeExecutionDeviceStorageKey(base);
    writeSecureAndClearLegacySync(writeKey, value);
    if (writeKey !== base) {
        try {
            SecureStoreService.deleteItemSync(base);
        } catch {
            /* ignore */
        }
        clearLegacyPlaintextMirror(base);
    }
}

export function deleteScopedSecureAndClearLegacySync(logicalKey: string): void {
    const base = stripExecutionDeviceStorageUserScope(logicalKey);
    const scoped = scopeExecutionDeviceStorageKey(base);
    try {
        SecureStoreService.deleteItemSync(scoped);
    } catch {
        /* ignore */
    }
    clearLegacyPlaintextMirror(scoped);
    if (scoped !== base) {
        try {
            SecureStoreService.deleteItemSync(base);
        } catch {
            /* ignore */
        }
        clearLegacyPlaintextMirror(base);
    }
}
