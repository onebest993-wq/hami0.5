/**
 * فشل التثبيت على القرص — أخطر صمت في طبقة التخزين.
 *
 * `webDbSetItem` كانت تعود صامتة في كل مسار فشل: القاعدة محجوبة، أو الحصّة
 * ممتلئة (`QuotaExceededError`)، أو المعاملة أُجهضت. و`setItem` تُرجع `void`، فلا
 * سبيل للمتصل أن يعرف. والذاكرة (`webFallbackStore`) تحتفظ بالقيمة فتبدو الجلسة
 * سليمة تماماً: الواجهة تُظهر «حُفِظ»، والقراءة اللاحقة تُرجع ما كُتب.
 *
 * ثم يُقلع المحامي في الغد فلا يجد شيئاً. لا سطر في سجلّ، ولا بلاغ في لوحة، ولا
 * أثر يدلّ على أن الكتابة لم تبلغ القرص قطّ. وهذا أسوأ من عطل ظاهر: العطل الظاهر
 * يُوقف العمل قبل أن يُبنى عليه، والصمت يدع المحامي يبني يومه على وعدٍ كاذب.
 *
 * لا تغيير في الواجهة هنا — القاعدة الذهبية تمنعه بلا إذن. لكن الحالة تُسجَّل
 * وتُصبح مقروءة، فمن أراد إظهارها لاحقاً وجدها جاهزة.
 */
const reportedKeys = new Set<string>();

export type PersistenceFailureReason =
    /** `indexedDB.open` لم يُرجع قاعدة — محجوبة أو غير مدعومة */
    | 'db-unavailable'
    /** المعاملة أُجهضت أو أخطأت — الحصّة الممتلئة أشهر أسبابها */
    | 'transaction-failed'
    /** فشل التشفير أو setItem بعد أن بدت الذاكرة «محفوظة» */
    | 'encrypt-or-write-failed';

let lastFailure: { key: string; reason: PersistenceFailureReason; at: number } | null = null;
let failureCount = 0;

export function signalPersistenceFailure(
    key: string,
    reason: PersistenceFailureReason,
    detail?: string,
): void {
    failureCount += 1;
    lastFailure = { key, reason, at: Date.now() };

    /* بلاغ واحد لكل مفتاح: الحصّة الممتلئة تُفشل كل كتابة، فالتبليغ بلا حدٍّ يغرق الرصد */
    if (reportedKeys.has(key)) return;
    reportedKeys.add(key);

    /*
     * استيراد ديناميّ: هذه السلسلة تُقلع مع المخزن، وربط عميل الرصد بها ثابتاً
     * يجرّه إلى مسار الإقلاع لأجل بلاغ لا يقع إلا عند عطل.
     */
    void import('@/app/observability/sentryClient')
        .then((m) =>
            m.sentryCaptureMessage(`storage-persist-failed: ${reason}`, {
                storageKey: key,
                reason,
                detail: detail ?? '',
                failureCount,
            }),
        )
        .catch(() => {
            /* فشل التبليغ لا يجوز أن يمسّ الكتابة */
        });
}

/** هل تعذّر التثبيت في هذه الجلسة؟ يقرأها من أراد إظهار الحال أو منع عملٍ مُدمِّر */
export function hasPersistenceFailed(): boolean {
    return failureCount > 0;
}

export function getLastPersistenceFailure(): {
    key: string;
    reason: PersistenceFailureReason;
    at: number;
} | null {
    return lastFailure;
}

export function __resetPersistenceFailureSignalForTests(): void {
    reportedKeys.clear();
    lastFailure = null;
    failureCount = 0;
}
