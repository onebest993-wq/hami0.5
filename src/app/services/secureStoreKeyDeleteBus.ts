/**
 * ناقل إشعار حذف مفاتيح SecureStore — وحدة مستقلة بلا استيرادات
 * لكسر الدورة بين SecureStoreService و storageCache.
 * بدونها كان fast-path «اللمسة الحديثة» في storageCache.get يعيد قيمة
 * محذوفة لمدة تصل إلى ثانيتين بعد deleteItemSync.
 */
type SecureStoreKeyDeleteListener = (key: string) => void;

const keyDeleteListeners = new Set<SecureStoreKeyDeleteListener>();

export function registerSecureStoreKeyDeleteListener(
    listener: SecureStoreKeyDeleteListener,
): void {
    keyDeleteListeners.add(listener);
}

export function notifySecureStoreKeyDeleted(key: string): void {
    keyDeleteListeners.forEach((listener) => {
        try {
            listener(key);
        } catch {
            /* ignore */
        }
    });
}
