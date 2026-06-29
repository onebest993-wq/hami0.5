export const HAMI_SUPPORT_EMAIL = 'support@hami.app';

/** رقم واتساب الدعم الفني — بدون + في التخزين */
export const HAMI_SUPPORT_WHATSAPP_DIGITS = '9647811102199';

export const HAMI_SUPPORT_WHATSAPP_DISPLAY = '+964 781 110 2199';

export function buildHamiSupportWhatsAppUrl(text?: string): string {
    const base = `https://wa.me/${HAMI_SUPPORT_WHATSAPP_DIGITS}`;
    if (!text?.trim()) return base;
    return `${base}?text=${encodeURIComponent(text.trim())}`;
}

export function buildHamiSupportMailtoUrl(subject = 'دعم فني - حامي'): string {
    return `mailto:${HAMI_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
