import type { LawyerProfileData, LawyerProfileSection, ProfileAction } from '@/app/services/lawyer-cloud';

const PLACEHOLDER_HOST_FRAGMENTS = ['images.unsplash.com', 'picsum.photos', 'placeholder.com', 'via.placeholder'];

const DEMO_BIO_SNIPPETS = [
    'محامٍ متخصص في القانون المدني',
    'خبرة واسعة في التقاضي',
    'نبذة تجريبية',
];

export function isPlaceholderImageUrl(url?: string | null): boolean {
    if (!url || typeof url !== 'string') return false;
    if (url.startsWith('data:image/')) return false;
    const lower = url.toLowerCase();
    return PLACEHOLDER_HOST_FRAGMENTS.some((h) => lower.includes(h));
}

function isDemoBio(text: string): boolean {
    const t = text.trim();
    if (!t) return false;
    return DEMO_BIO_SNIPPETS.some((s) => t.includes(s));
}

function sanitizeGallery(data: unknown): string[] {
    if (!Array.isArray(data)) return [];
    return data.filter((u): u is string => typeof u === 'string' && u.trim() !== '' && !isPlaceholderImageUrl(u));
}

function sanitizeActions(data: unknown): ProfileAction[] {
    if (!Array.isArray(data)) return [];
    return data.filter(
        (a): a is ProfileAction =>
            Boolean(a) &&
            typeof a === 'object' &&
            typeof (a as ProfileAction).value === 'string' &&
            (a as ProfileAction).value.trim().length > 0,
    );
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

    const sections: LawyerProfileSection[] = profile.sections
        .filter((s) => s.type !== 'stats')
        .map((s) => {
            if (s.type === 'gallery') {
                return { ...s, data: sanitizeGallery(s.data) };
            }
            if (s.type === 'actions') {
                return { ...s, data: sanitizeActions(s.data) };
            }
            if (s.type === 'bio' && typeof s.data === 'string' && isDemoBio(s.data)) {
                return { ...s, data: '' };
            }
            return s;
        });

    return { header, sections };
}
