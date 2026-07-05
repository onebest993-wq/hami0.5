import type { ProfileAction } from '@/app/services/profile/profileTypes';

export const MAX_PROFILE_CONTACT_LABEL_LENGTH = 48;
export const MAX_PROFILE_CONTACT_VALUE_LENGTH = 240;
export const MAX_PROFILE_DISPLAY_NAME_LENGTH = 80;

export function clampProfileContactLabel(raw: string): string {
    return raw.trim().slice(0, MAX_PROFILE_CONTACT_LABEL_LENGTH);
}

export function clampProfileContactValue(raw: string): string {
    return raw.replace(/[\r\n\t]/g, ' ').trim().slice(0, MAX_PROFILE_CONTACT_VALUE_LENGTH);
}

export function clampProfileDisplayName(raw: string): string {
    return raw.trim().slice(0, MAX_PROFILE_DISPLAY_NAME_LENGTH);
}

export function sanitizeProfileAction(action: ProfileAction): ProfileAction {
    return {
        ...action,
        label: clampProfileContactLabel(action.label || ''),
        value: clampProfileContactValue(action.value || ''),
    };
}

export function sanitizeProfileActions(actions: ProfileAction[]): ProfileAction[] {
    return actions.map(sanitizeProfileAction).filter((a) => a.label.length > 0 || a.value.length > 0);
}
