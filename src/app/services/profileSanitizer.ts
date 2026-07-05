import type { LawyerProfileData, LawyerProfileSection, ProfileAction } from '@/app/services/profile/profileTypes';
import { normalizeProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import {
    clampProfileDisplayName,
    sanitizeProfileActions,
} from '@/app/services/profile/profileContactInputSecurity';

const PLACEHOLDER_HOST_FRAGMENTS = ['images.unsplash.com', 'picsum.photos', 'placeholder.com', 'via.placeholder'];

export function isPlaceholderImageUrl(url?: string | null): boolean {
    if (!url || typeof url !== 'string') return false;
    if (url.startsWith('data:image/')) return false;
    const lower = url.toLowerCase();
    return PLACEHOLDER_HOST_FRAGMENTS.some((h) => lower.includes(h));
}

function sanitizeGallery(data: unknown): string[] {
    if (!Array.isArray(data)) return [];
    return data.filter((u): u is string => typeof u === 'string' && u.trim() !== '' && !isPlaceholderImageUrl(u));
}

function sanitizeActions(data: unknown): ProfileAction[] {
    if (!Array.isArray(data)) return [];
    const allowedTypes = new Set<ProfileAction['type']>([
        'whatsapp',
        'call',
        'email',
        'website',
        'location',
    ]);
    return sanitizeProfileActions(
        data.filter(
            (a): a is ProfileAction =>
                Boolean(a) &&
                typeof a === 'object' &&
                typeof (a as ProfileAction).id === 'string' &&
                typeof (a as ProfileAction).label === 'string' &&
                typeof (a as ProfileAction).value === 'string' &&
                allowedTypes.has((a as ProfileAction).type),
        ),
    ).map((a) => ({
        ...a,
        locationMode:
            a.locationMode === 'gps' || a.locationMode === 'manual' ? a.locationMode : undefined,
    }));
}

/** يزيل صور/أقسام تجريبية مخزّنة من إصدارات سابقة */
export function sanitizeLawyerProfile(profile: LawyerProfileData): LawyerProfileData {
    const header = { ...profile.header };

    if (isPlaceholderImageUrl(header.profileImage)) {
        header.profileImage = '';
        delete header.profileImagePath;
    }
    if (isPlaceholderImageUrl(header.coverImage)) {
        header.coverImage = '';
        delete header.coverImagePath;
    }
    header.name = clampProfileDisplayName(header.name ?? '');

    const sections: LawyerProfileSection[] = profile.sections
        .filter((s) => s.type !== 'stats' && s.type !== 'bio')
        .map((s) => {
            if (s.type === 'gallery') {
                return { ...s, data: sanitizeGallery(s.data) };
            }
            if (s.type === 'actions') {
                return { ...s, data: sanitizeActions(s.data) };
            }
            return s;
        });

    return {
        header,
        sections,
        customization: normalizeProfilePageCustomization(profile.customization),
    };
}
