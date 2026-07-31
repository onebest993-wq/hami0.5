import type { LawyerProfileData, LawyerProfileSection, ProfileAction } from '@/app/services/profile/profileTypes';
import { normalizeProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import {
    clampProfileDisplayName,
    sanitizeProfileActions,
} from '@/app/services/profile/profileContactInputSecurity';
import { buildProfileContactTarget } from '@/app/services/profile/profileContactNavigation';
import { coerceGalleryItems } from '@/app/services/profile/profileGalleryItems';
import type { ProfileGalleryItem } from '@/app/services/cloud/lawyerProfileTypes';
import {
    sanitizeProfileMediaUrl,
    sanitizeProfileStoragePath,
} from '@/app/services/profile/profileUrlSanitize';

const PLACEHOLDER_HOST_FRAGMENTS = ['images.unsplash.com', 'picsum.photos', 'placeholder.com', 'via.placeholder'];

export function isPlaceholderImageUrl(url?: string | null): boolean {
    if (!url || typeof url !== 'string') return false;
    if (url.startsWith('data:image/')) return false;
    const lower = url.toLowerCase();
    return PLACEHOLDER_HOST_FRAGMENTS.some((h) => lower.includes(h));
}

function sanitizeGallery(data: unknown): ProfileGalleryItem[] {
    return coerceGalleryItems(data);
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
    )
        .map((a) => ({
            ...a,
            locationMode:
                a.locationMode === 'gps' || a.locationMode === 'manual' ? a.locationMode : undefined,
        }))
        .filter((a) => {
            if (!a.value.trim()) return false;
            return buildProfileContactTarget(a) != null;
        });
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

    const profilePath = sanitizeProfileStoragePath(header.profileImagePath);
    const coverPath = sanitizeProfileStoragePath(header.coverImagePath);
    header.profileImage = sanitizeProfileMediaUrl(header.profileImage) ?? '';
    header.coverImage = sanitizeProfileMediaUrl(header.coverImage) ?? '';
    /*
     * لا تحذف مسار التخزين لأن الرابط فارغ/منتهي —
     * resolve/resign يعيد بناء الرابط من المسار.
     */
    if (profilePath) header.profileImagePath = profilePath;
    else delete header.profileImagePath;
    if (coverPath) header.coverImagePath = coverPath;
    else delete header.coverImagePath;

    header.name = clampProfileDisplayName(header.name ?? '');

    const sections: LawyerProfileSection[] = (Array.isArray(profile.sections) ? profile.sections : [])
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
