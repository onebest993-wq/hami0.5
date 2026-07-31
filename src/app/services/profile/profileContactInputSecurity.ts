import type { ProfileAction } from '@/app/services/profile/profileTypes';
import {
    buildProfileContactTarget,
    normalizeAsciiDigits,
    normalizeTelHref,
} from '@/app/services/profile/profileContactNavigation';

export const MAX_PROFILE_CONTACT_LABEL_LENGTH = 48;
export const MAX_PROFILE_CONTACT_VALUE_LENGTH = 240;
export const MAX_PROFILE_DISPLAY_NAME_LENGTH = 80;

export class ProfileContactValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ProfileContactValidationError';
    }
}

/** أثناء الكتابة — يحافظ على المسافات الطرفية حتى يمكن إدخال كلمات متعددة */
export function clampProfileContactLabelLive(raw: string): string {
    return raw.replace(/[\r\n\t]/g, ' ').slice(0, MAX_PROFILE_CONTACT_LABEL_LENGTH);
}

/** أثناء الكتابة — لا يقصّ المسافات الطرفية */
export function clampProfileContactValueLive(raw: string): string {
    return raw.replace(/[\r\n\t]/g, ' ').slice(0, MAX_PROFILE_CONTACT_VALUE_LENGTH);
}

export function clampProfileContactLabel(raw: string): string {
    return clampProfileContactLabelLive(raw).trim();
}

export function clampProfileContactValue(raw: string): string {
    return clampProfileContactValueLive(raw).trim();
}

export function clampProfileDisplayName(raw: string): string {
    return raw.replace(/[\r\n\t]/g, ' ').slice(0, MAX_PROFILE_DISPLAY_NAME_LENGTH).trim();
}

export function sanitizeProfileAction(action: ProfileAction): ProfileAction {
    let value = clampProfileContactValue(action.value || '');
    if (action.type === 'call' || action.type === 'whatsapp') {
        value = normalizeAsciiDigits(value);
    }
    return {
        ...action,
        label: clampProfileContactLabel(action.label || ''),
        value,
    };
}

export function sanitizeProfileActions(actions: ProfileAction[]): ProfileAction[] {
    return actions.map(sanitizeProfileAction).filter((a) => a.label.length > 0 || a.value.length > 0);
}

/** هاتف الهيدر: يُقبل فارغاً أو رقماً قابلاً للاتصال؛ غير ذلك يُفرَّغ */
export function sanitizeProfileHeaderPhone(raw: string | undefined | null): string {
    const trimmed = normalizeAsciiDigits(clampProfileContactValue(raw ?? ''));
    if (!trimmed) return '';
    return normalizeTelHref(trimmed) ? trimmed : '';
}

/**
 * يتحقق أن كل قناة ذات قيمة غير فارغة تُنتج هدفاً صالحاً (tel/mailto/https…).
 * يرمي ProfileContactValidationError عند أول قيمة غير صالحة.
 */
export function assertProfileContactsValid(actions: ProfileAction[]): void {
    for (const action of sanitizeProfileActions(actions)) {
        if (!action.value.trim()) continue;
        if (buildProfileContactTarget(action) == null) {
            const label = action.label || action.type;
            throw new ProfileContactValidationError(`قيمة «${label}» غير صالحة — صحّحها قبل الحفظ`);
        }
    }
}

/** يصفّي القنوات الفارغة ويتحقق من صلاحية الباقي قبل Persist */
export function sanitizeProfileActionsForPersist(actions: ProfileAction[]): ProfileAction[] {
    const cleaned = sanitizeProfileActions(actions).filter((a) => a.value.trim().length > 0);
    assertProfileContactsValid(cleaned);
    return cleaned;
}
