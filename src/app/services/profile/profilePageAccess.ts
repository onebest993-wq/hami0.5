import type { ProfilePageAccess, ProfilePrivacySettings } from './profilePageTypes';

export const PROFILE_PAGE_ACCESS_ORDER: readonly ProfilePageAccess[] = ['public', 'followers', 'private'];

export type ProfilePageAccessMeta = {
    id: ProfilePageAccess;
    label: string;
    shortLabel: string;
    hint: string;
};

export const PROFILE_PAGE_ACCESS_OPTIONS: readonly ProfilePageAccessMeta[] = [
    {
        id: 'public',
        label: 'السماح للجميع',
        shortLabel: 'للجميع',
        hint: 'أي محامٍ في المنتدى يمكنه زيارة صفحتك',
    },
    {
        id: 'followers',
        label: 'المتابعون فقط',
        shortLabel: 'المتابعون',
        hint: 'فقط من يتابعك في المنتدى يمكنه الدخول',
    },
    {
        id: 'private',
        label: 'منع الدخول',
        shortLabel: 'خاص',
        hint: 'لا أحد يمكنه زيارة صفحتك سواك',
    },
];

export function resolveProfilePageAccess(
    privacy: Pick<ProfilePrivacySettings, 'pageAccess'> | undefined,
): ProfilePageAccess {
    const raw = privacy?.pageAccess;
    return PROFILE_PAGE_ACCESS_ORDER.includes(raw as ProfilePageAccess) ? (raw as ProfilePageAccess) : 'public';
}

export function getProfilePageAccessMeta(access: ProfilePageAccess): ProfilePageAccessMeta {
    return PROFILE_PAGE_ACCESS_OPTIONS.find((o) => o.id === access) ?? PROFILE_PAGE_ACCESS_OPTIONS[0]!;
}

export function nextProfilePageAccess(current: ProfilePageAccess): ProfilePageAccess {
    const idx = PROFILE_PAGE_ACCESS_ORDER.indexOf(current);
    const nextIdx = idx < 0 ? 0 : (idx + 1) % PROFILE_PAGE_ACCESS_ORDER.length;
    return PROFILE_PAGE_ACCESS_ORDER[nextIdx]!;
}

export function canViewProfilePage(input: {
    pageAccess: ProfilePageAccess;
    isOwner: boolean;
    isFollowing: boolean;
}): boolean {
    if (input.isOwner) return true;
    if (input.pageAccess === 'public') return true;
    if (input.pageAccess === 'followers') return input.isFollowing;
    return false;
}
