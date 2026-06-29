/** حد أقصى لطول رقم الهاتف المُدخل يدوياً */
export const MAX_CLIENT_PHONE_INPUT_LENGTH = 20;

const IRAQI_E164 = /^\+964\d{9,10}$/;

export function clampClientPhoneInput(raw: string): string {
    return raw.trim().slice(0, MAX_CLIENT_PHONE_INPUT_LENGTH);
}

/**
 * يُطبّع رقم موكل عراقي إلى E.164 (+964…) أو يُرجع null إن كان غير صالح.
 */
export function normalizeClientPhoneInput(raw: string): string | null {
    const cleaned = clampClientPhoneInput(raw).replace(/[\s\-()]/g, '');
    if (!cleaned) return null;

    let normalized = cleaned;
    if (normalized.startsWith('00')) normalized = `+${normalized.slice(2)}`;
    else if (normalized.startsWith('0')) normalized = `+964${normalized.slice(1)}`;
    else if (!normalized.startsWith('+')) normalized = `+964${normalized}`;

    if (!IRAQI_E164.test(normalized)) return null;
    return normalized;
}
