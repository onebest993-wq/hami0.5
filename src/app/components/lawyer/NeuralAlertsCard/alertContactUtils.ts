/** تنظيف رقم للاتصال أو واتساب */
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

export function buildWhatsAppUrl(phone: string): string {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = `964${digits.slice(1)}`;
    else if (!digits.startsWith('964')) digits = `964${digits}`;
    return `https://wa.me/${digits}`;
}
