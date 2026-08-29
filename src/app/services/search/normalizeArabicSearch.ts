/**
 * تطبيع عربي موحّد للبحث — خالٍ من React/DOM، آمن للـ Worker والفهرسة.
 * يشمل: همزات، تاء مربوطة، ألف مقصورة، تشكيل، أرقام هندية، وتخفيف فواصل أرقام الدعاوى.
 */
const INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

function foldDigits(text: string): string {
    let out = '';
    for (let i = 0; i < text.length; i++) {
        const ch = text[i]!;
        const indic = INDIC_DIGITS.indexOf(ch);
        if (indic >= 0) {
            out += String(indic);
            continue;
        }
        const persian = PERSIAN_DIGITS.indexOf(ch);
        if (persian >= 0) {
            out += String(persian);
            continue;
        }
        out += ch;
    }
    return out;
}

export function normalizeArabicSearch(text: string): string {
    if (!text) return '';
    return foldDigits(text)
        .toLowerCase()
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u065F]/g, '')
        .replace(/\s*\/\s*/g, '/')
        .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** هل يحتوي النص على الاستعلام بعد التطبيع؟ استعلام فارغ = تطابق الكل */
export function archiveTextMatchesQuery(haystack: string, query: string): boolean {
    const q = normalizeArabicSearch(query);
    if (!q) return true;
    return normalizeArabicSearch(haystack).includes(q);
}
