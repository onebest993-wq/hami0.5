/**
 * تطبيع تاريخ YYYY-MM-DD — بدائية بلا اعتماديات.
 *
 * كانت ساكنة في `lawsuitArchiveHearing`، وذاك الملفّ يستورد محرّك سجلّ الجلسات
 * وبوّابة الطعون غير العادية وأنواع الأحكام من `smart-modal`. فبطاقة الأرشيف
 * الجزائي، وكل ما احتاج تطبيع تاريخ، كان يشحن ٩٥ كيلوبايت من منطق الأحكام
 * ليقصّ عشرة محارف من نصّ.
 */

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** يقبل `YYYY-MM-DD` أو أي ISO يبدأ به، وما عداه `null` */
export function normalizeLawsuitArchiveYmd(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (YMD_RE.test(trimmed)) return trimmed;
    const isoPrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    return isoPrefix ? isoPrefix[1] : null;
}
