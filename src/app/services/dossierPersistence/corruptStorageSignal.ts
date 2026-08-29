import { isUnreadableProtectedValue } from './dossierWipeGuard';

/**
 * تلف مخزون على مفتاح محمي — إشارة واحدة لكل مفتاح في العمر.
 *
 * الحارس يمنع الكتابة فوق البيانات التالفة، لكن المنع وحده صمت: المحامي يفتح
 * التطبيق فيرى شاشة خالية ولا يعلم أن أضابيره ما تزال على الجهاز، ولا يعلم بها
 * أحد في أي لوحة. الفشل الصامت هنا لا يقلّ سوءاً عن الفقد نفسه.
 *
 * القراءة تُشير كما تُشير الكتابة: مَن يفتح ولا يحفظ لن يمرّ بمسار الكتابة أبداً.
 */
const reportedKeys = new Set<string>();

const ENCRYPTED_PREFIX = 'hami_enc_v2:';

export type CorruptStoragePhase = 'read' | 'write';

export function signalUnreadableStoredValue(
    key: string,
    raw: string,
    phase: CorruptStoragePhase,
): void {
    if (reportedKeys.has(key)) return;
    reportedKeys.add(key);

    /*
     * استيراد ديناميّ: هذه السلسلة تُقلع مع المخزن، وربط عميل الرصد بها ثابتاً
     * يجرّه إلى مسار الإقلاع لأجل بلاغ لا يقع إلا عند عطل.
     */
    void import('@/app/observability/sentryClient')
        .then((m) =>
            m.sentryCaptureMessage(`storage-unreadable: ${key}`, {
                storageKey: key,
                phase,
                storedLength: raw.length,
                looksEncrypted: raw.startsWith(ENCRYPTED_PREFIX),
            }),
        )
        .catch(() => {
            /* فشل التبليغ لا يجوز أن يمسّ القراءة أو الكتابة */
        });
}

/** يُشير فقط حين يكون المفتاح محميّاً والمحتوى غير مفهوم */
export function signalIfUnreadableProtected(
    key: string,
    raw: string | null | undefined,
    phase: CorruptStoragePhase,
): void {
    if (!raw) return;
    if (!isUnreadableProtectedValue(key, raw)) return;
    signalUnreadableStoredValue(key, raw, phase);
}

export function __resetCorruptStorageSignalForTests(): void {
    reportedKeys.clear();
}
