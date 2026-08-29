/**
 * حمولة حسّاسة سقط عنها التشفير لتجاوزها حدّ الحجم — إشارة واحدة لكل مفتاح.
 *
 * `shouldEncryptValue` تعود `false` فوق الحدّ، فتُكتب أثقل الإضابير نصّاً صريحاً
 * على القرص. القرار مقصود (قرّاء `getItemSync` لا يفكّون تشفيراً) لكنّه كان
 * **صامتاً**: لا سبيل لمعرفة أي مفتاح يقع فيه، ولا بأي حجم، ولا على كم جهاز.
 *
 * والقياس شرط القرار: رفع الحدّ بلا معرفةِ ما يقع فوقه تخمينٌ، وإبقاؤه بلا معرفةٍ
 * إهمال. فتُسجَّل الواقعة مرّة لكل مفتاح — لا في كل كتابة كي لا يصير البلاغ ضجيجاً.
 *
 * مفاتيح الدعاوى المُسخَّنة (بما فيها `lawyer_files_archived|trash`) لا تصل هنا
 * أصلاً (`isLawsuitEncryptAlwaysKey`) — تُسخَّن عند فتح مساحة الدعاوى.
 */
import { isLawsuitLegalStorageKey } from './secureStorageKeys';

const reportedKeys = new Set<string>();

export function signalPlaintextFallback(key: string, valueLength: number, limit: number): void {
    if (reportedKeys.has(key)) return;
    reportedKeys.add(key);

    const overBy = valueLength - limit;
    if (import.meta.env.DEV) {
        const lawsuitTag = isLawsuitLegalStorageKey(key) ? ' [lawsuit]' : '';
        console.warn(
            `[SecureStore] plaintext size-fallback${lawsuitTag}: key=${key} len=${valueLength} limit=${limit} overBy=${overBy}`,
        );
    }

    /* استيراد ديناميّ — عميل الرصد لا يُجرّ إلى مسار المخزن لأجل بلاغ نادر */
    void import('@/app/observability/sentryClient')
        .then((m) =>
            m.sentryCaptureMessage(`storage-plaintext-fallback: ${key}`, {
                storageKey: key,
                valueLength,
                limit,
                overBy,
                lawsuitLegal: isLawsuitLegalStorageKey(key),
            }),
        )
        .catch(() => {
            /* فشل التبليغ لا يمسّ الكتابة */
        });
}

export function __resetPlaintextFallbackSignalForTests(): void {
    reportedKeys.clear();
}
