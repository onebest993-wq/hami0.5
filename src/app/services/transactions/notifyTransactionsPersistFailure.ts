import { StorageEncryptionError } from '@/app/services/SecureStoreService';

/**
 * بلاغ ظاهر بعد فشل تثبيت المعاملات على القرص.
 * الاستيراد ديناميّ حتى لا تجرّ طبقة المرآة/السحابة SmartToast إلى الإقلاع.
 */
export function notifyTransactionsPersistFailure(error: unknown): void {
    const encryptionFailed = error instanceof StorageEncryptionError;
    void import('@/app/components/ui/SmartToast')
        .then(({ SmartToast }) => {
            if (encryptionFailed) {
                SmartToast.error('تعذّر التشفير قبل الحفظ — أعد تحميل الصفحة ثم حاول مجدداً');
                return;
            }
            SmartToast.error('تعذّر حفظ المعاملة على الجهاز');
        })
        .catch(() => {
            /* فشل البلاغ لا يُخفي فشل الحفظ */
        });
}
