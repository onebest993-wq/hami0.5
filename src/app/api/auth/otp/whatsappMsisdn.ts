import { normalizeIraqiPhoneInput } from '../../../services/auth/registrationCredentialsSecurity.ts';

/** MSISDN واتساب العراقي بدون + — 9647xxxxxxxx */
export function toIraqWhatsAppMsisdn(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const local = normalizeIraqiPhoneInput(raw);
    if (!/^07[5789]\d{8}$/.test(local)) return null;
    return `964${local.slice(1)}`;
}

/** آخر رقمين فقط — لا يُكشف الرقم كاملاً */
export function phoneLastTwoDigits(raw: string | null | undefined): string | null {
    const msisdn = toIraqWhatsAppMsisdn(raw);
    if (!msisdn || msisdn.length < 2) return null;
    return msisdn.slice(-2);
}
