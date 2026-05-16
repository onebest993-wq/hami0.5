/**
 * إزالة صيغ «قيد البت» من عنوان الطلب عند عرض قرار المنفذ النهائي
 * حتى لا يظهر مثلاً: «موافقة المنفذ: طلب حجز عقار — قيد البت لدى المنفذ».
 */
export function stripPendingLabelsFromExecutorSubject(title: string): string {
    let s = String(title || '').trim();
    if (!s) return '';
    // توحيد الشرطات (— – - −) لمعالجة النصوص القادمة من واجهات أو لصق
    s = s.replace(/[\u2014\u2013\u2212]/g, '—');
    s = s.replace(/\s*[—\-]\s*قيد\s*البت\s*لدى\s*المنفذ\s*/gi, '');
    s = s.replace(/\s*[—\-]\s*قيد\s*البت\s*/gi, '');
    s = s.replace(/\(\s*قيد\s*البت\s*\)/gi, '');
    s = s.replace(/\s*قيد\s*البت\s*لدى\s*المنفذ\s*/gi, '');
    s = s.replace(/\s*قيد\s*البت\s*/gi, '');
    s = s.replace(/\s*لدى\s*المنفذ\s*$/gi, '');
    s = s.replace(/\s+/g, ' ').trim();
    return s || String(title).trim();
}
