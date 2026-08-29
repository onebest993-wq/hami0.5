/** تنظيف نص العرض في نتائج البحث — بدون إيموجي/رموز زخرفية */
export function sanitizeSearchDisplayText(text: string | undefined | null): string {
    if (!text) return '';
    return text
        .replace(/[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
        .replace(/[✨⭐🌟💫🔷🔹▪️•]+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

const EVENT_TYPE_AR: Record<string, string> = {
    appointment: 'موعد',
    hearing: 'جلسة',
    decision: 'قرار',
    document: 'مستند',
    note: 'ملاحظة',
    task: 'مهمة',
    pleading: 'مرافعة',
    judgment: 'حكم',
    appeal: 'طعن',
    cassation: 'تمييز',
    notification: 'تبليغ',
    procedure: 'إجراء',
};

export function searchEventTypeLabel(type: string | undefined | null): string {
    const key = String(type ?? '')
        .trim()
        .toLowerCase();
    if (!key) return '';
    return EVENT_TYPE_AR[key] || '';
}

/** مسار موقع واضح للعرض في نتيجة البحث */
export function formatSearchLocationPath(parts: Array<string | undefined | null>): string {
    return parts
        .map((p) => sanitizeSearchDisplayText(p))
        .filter(Boolean)
        .join(' · ');
}
