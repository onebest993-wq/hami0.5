import { clientEnv } from '@/config/clientEnv';

/**
 * بريد الدعم العام — عبر `clientEnv.supportEmail` فقط (لا بريد إداري هنا).
 * المصدر: `VITE_APP_SUPPORT_EMAIL`.
 */
export const HAMI_SUPPORT_EMAIL = clientEnv.supportEmail;

export function buildHamiSupportMailtoUrl(subject = 'دعم فني - حامي'): string {
    const email = clientEnv.supportEmail;
    if (!email) return 'mailto:?subject=' + encodeURIComponent(subject);
    return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
