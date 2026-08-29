import { clientEnv } from '@/config/clientEnv';
import { normalizeIraqiPhoneInput } from '@/app/services/auth/registrationCredentialsSecurity';

const SUPPORT_TEXT = 'استعادة كلمة المرور — حامي';

/** MSISDN واتساب الإدارة بدون + */
export function toSupportWhatsAppMsisdn(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const local = normalizeIraqiPhoneInput(trimmed);
    if (/^07[5789]\d{8}$/.test(local)) return `964${local.slice(1)}`;
    const digits = trimmed.replace(/\D/g, '');
    if (/^9647[5789]\d{8}$/.test(digits)) return digits;
    if (/^7[5789]\d{8}$/.test(digits)) return `964${digits}`;
    return null;
}

export function buildHamiSupportWhatsAppUrlFromRaw(raw: string, text = SUPPORT_TEXT): string | null {
    const msisdn = toSupportWhatsAppMsisdn(raw);
    if (!msisdn) return null;
    const url = new URL(`https://wa.me/${msisdn}`);
    if (text) url.searchParams.set('text', text);
    return url.toString();
}

export function readClientSupportWhatsAppUrl(): string | null {
    return buildHamiSupportWhatsAppUrlFromRaw(clientEnv.supportWhatsapp);
}

export function isAllowedSupportWhatsAppUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') return false;
        if (parsed.hostname !== 'wa.me' && parsed.hostname !== 'api.whatsapp.com') return false;
        if (parsed.hostname === 'wa.me' && !/^\/\d{11,15}$/.test(parsed.pathname)) return false;
        return true;
    } catch {
        return false;
    }
}
