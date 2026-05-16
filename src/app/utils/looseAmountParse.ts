/**
 * يستخرج مبلغاً رقمياً من نص حر (د.ع، أرقام عربية، فواصل ألوف، إلخ).
 * يُجمَع الرقم من كل الأرقام المتتالية بعد تحويل الشرقي إلى لاتيني.
 */
export function parseLooseAmountFromText(raw: unknown): number {
    if (raw == null) return 0;
    let s = String(raw).trim();
    if (!s) return 0;
    const eastern = '٠١٢٣٤٥٦٧٨٩';
    const western = '0123456789';
    let norm = '';
    for (const ch of s) {
        const idx = eastern.indexOf(ch);
        norm += idx >= 0 ? western[idx] : ch;
    }
    const digits = norm.replace(/,/g, '').replace(/[^\d]/g, '');
    if (!digits) return 0;
    const n = parseInt(digits, 10);
    return Number.isFinite(n) ? n : 0;
}
