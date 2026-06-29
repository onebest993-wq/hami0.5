/** تطبيع عربي للبحث — خالٍ من React/DOM، آمن للـ Worker */
export function normalizeArabicSearch(text: string): string {
    if (!text) return '';
    return text
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u065F]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
