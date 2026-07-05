import type { ProfileAction } from '@/app/services/profile/profileTypes';
import type { ProfilePrivacySettings } from './profilePageTypes';

export type BuildProfileShareTextInput = {
    displayName: string;
    title?: string;
    /** بريد الجلسة — للمالك فقط */
    ownerAuthEmail?: string;
    phone?: string;
    city?: string;
    isOwner: boolean;
    privacy: ProfilePrivacySettings;
    visibleActions: ProfileAction[];
};

function pushVisibleEmailLines(lines: string[], actions: ProfileAction[]): void {
    for (const action of actions) {
        if (action.type !== 'email') continue;
        const value = action.value?.trim();
        if (value) lines.push(value);
    }
}

/** نص المشاركة — يحترم إعدادات الخصوصية للزوار */
export function buildProfileShareText(input: BuildProfileShareTextInput): string {
    const lines: string[] = [];
    const name = input.displayName.trim();
    if (name) lines.push(name);

    const title = input.title?.trim();
    if (title) lines.push(title);

    if (input.isOwner) {
        const authEmail = input.ownerAuthEmail?.trim();
        if (authEmail) lines.push(authEmail);
    } else {
        pushVisibleEmailLines(lines, input.visibleActions);
    }

    const phone = input.phone?.trim();
    if (phone && (input.isOwner || input.privacy.showPhoneMeta)) {
        lines.push(`هاتف: ${phone}`);
    }

    const city = input.city?.trim();
    if (city && (input.isOwner || input.privacy.showCityMeta)) {
        lines.push(`المدينة: ${city}`);
    }

    return lines.join('\n');
}
