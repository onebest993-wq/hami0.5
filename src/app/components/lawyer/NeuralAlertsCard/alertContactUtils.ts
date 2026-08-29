/** تنظيف رقم للاتصال */
export function normalizeClientPhone(raw?: string | null): string | null {
    if (raw == null) return null;
    const t = String(raw).trim();
    if (!t || t === 'undefined' || t === 'null' || t === '—') return null;
    const digits = t.replace(/[^\d+]/g, '');
    if (digits.length < 9) return null;
    return digits.startsWith('+') ? digits : digits.replace(/^0+/, '0');
}

export function buildTelUrl(phone: string): string {
    const digits = phone.replace(/[^\d+]/g, '');
    return `tel:${digits}`;
}
