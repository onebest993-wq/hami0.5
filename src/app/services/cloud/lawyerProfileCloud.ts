import SecureStoreService from '@/app/services/SecureStoreService';
import { sanitizeLawyerProfile } from '@/app/services/profileSanitizer';
import {
    refreshProfileCustomizationMedia,
    refreshProfileMediaUrl,
} from '@/app/services/profileMediaService';
import { assertCanWriteProfile } from '@/app/services/profile/profileWriteGuard';
import { shouldPersistProfileLocally } from '@/app/services/profile/profileShellLogic';
import { redactProfileForVisitorView } from '@/app/services/profile/profileVisitorView';
import { coerceGalleryItems } from '@/app/services/profile/profileGalleryItems';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import { supabase } from '@/app/lib/supabase-client';
import { LAWYER_PROFILE_UPDATED } from '@/app/services/profile/profileEvents';
import { lawyerCloudKv } from '@/app/services/cloud/lawyerCloudKv';
import {
    DEFAULT_LAWYER_PROFILE,
    type LawyerProfileData,
    type LawyerProfileHeader,
    type LawyerProfileSection,
    type ProfileGalleryItem,
} from '@/app/services/cloud/lawyerProfileTypes';

export { LAWYER_PROFILE_UPDATED } from '@/app/services/profile/profileEvents';
export type {
    LawyerProfileHeader,
    ProfileStat,
    ProfileLocationMode,
    ProfileAction,
    LawyerProfileSection,
    LawyerProfileData,
} from '@/app/services/cloud/lawyerProfileTypes';

const PROFILE_LOCAL_KEY_PREFIX = 'hami:profile:v1:';

function getProfileLocalKey(userId: string): string {
    return `${PROFILE_LOCAL_KEY_PREFIX}${userId}`;
}

/** قراءة محلية متزامنة — للفتح الفوري بلا انتظار getProfile الكامل */
export function readLocalProfileSync(userId: string): LawyerProfileData | null {
    try {
        const uid = userId.trim();
        if (!uid || typeof window === 'undefined') return null;
        const raw = SecureStoreService.getItemSync(getProfileLocalKey(uid));
        if (!raw) return null;
        return sanitizeLawyerProfile(JSON.parse(raw) as LawyerProfileData);
    } catch {
        return null;
    }
}

async function loadLocalProfile(userId: string): Promise<LawyerProfileData | null> {
    try {
        const key = getProfileLocalKey(userId);
        if (typeof window !== 'undefined') {
            const sync = SecureStoreService.getItemSync(key);
            if (sync) return JSON.parse(sync) as LawyerProfileData;
        }
        const raw = await SecureStoreService.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as LawyerProfileData;
    } catch {
        return null;
    }
}

/** مسار متزامن على الويب — يتجنب حجب الحفظ خلف ensureWebReady الكامل (deadlock في E2E/لوحة). */
async function saveLocalProfile(userId: string, profile: LawyerProfileData): Promise<boolean> {
    const key = getProfileLocalKey(userId);
    const value = JSON.stringify(profile);
    try {
        if (typeof window !== 'undefined') {
            SecureStoreService.setItemSync(key, value);
            return true;
        }
        await SecureStoreService.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

async function resolveProfileMedia(header: LawyerProfileHeader): Promise<LawyerProfileHeader> {
    const next = { ...header };
    if (next.profileImagePath) {
        next.profileImage = await refreshProfileMediaUrl(next.profileImagePath, next.profileImage);
    }
    if (next.coverImagePath) {
        next.coverImage = await refreshProfileMediaUrl(next.coverImagePath, next.coverImage);
    }
    return next;
}

async function resolveGallerySections(sections: LawyerProfileSection[]): Promise<LawyerProfileSection[]> {
    return Promise.all(
        sections.map(async (section) => {
            if (section.type !== 'gallery' || !Array.isArray(section.data)) return section;
            const items = coerceGalleryItems(section.data);
            const nextItems: ProfileGalleryItem[] = await Promise.all(
                items.map(async (item) => {
                    if (!item.storagePath) return item;
                    const url = await refreshProfileMediaUrl(item.storagePath, item.url);
                    return url && url !== item.url ? { ...item, url } : item;
                }),
            );
            return { ...section, data: nextItems };
        }),
    );
}

const profileMemoryCache = new Map<string, LawyerProfileData>();
const profileCloudSyncAt = new Map<string, number>();
const PROFILE_CLOUD_SYNC_MIN_MS = 30_000;

function shouldSyncProfileCloud(userId: string): boolean {
    const last = profileCloudSyncAt.get(userId) ?? 0;
    if (Date.now() - last < PROFILE_CLOUD_SYNC_MIN_MS) return false;
    profileCloudSyncAt.set(userId, Date.now());
    return true;
}

function cacheProfile(userId: string, profile: LawyerProfileData): LawyerProfileData {
    const snapshot = {
        ...profile,
        header: { ...profile.header },
        sections: profile.sections.map((section) => ({ ...section })),
    };
    profileMemoryCache.set(userId, snapshot);
    return snapshot;
}

export async function resolveSessionProfileUserId(): Promise<string | null> {
    try {
        const { data } = await supabase.auth.getSession();
        const raw = data.session?.user?.id ?? null;
        if (!raw?.trim()) return null;
        return resolveCalendarUserId(raw);
    } catch {
        return null;
    }
}

async function finalizeProfile(
    raw: LawyerProfileData,
    userId: string,
    persistLocal = true,
): Promise<LawyerProfileData> {
    const cleaned = sanitizeLawyerProfile(raw);
    const header = await resolveProfileMedia(cleaned.header);
    const sections = await resolveGallerySections(cleaned.sections);
    const customization =
        (await refreshProfileCustomizationMedia(cleaned.customization)) ?? cleaned.customization;
    const profile = { ...cleaned, header, sections, customization };
    if (persistLocal) {
        await saveLocalProfile(userId, profile);
    }
    return profile;
}

async function refreshProfileFromCloud(userId: string, localBase: LawyerProfileData | null): Promise<void> {
    const viewerId = await resolveSessionProfileUserId();
    const persistLocal = shouldPersistProfileLocally(viewerId, userId);
    try {
        const res = await lawyerCloudKv.get(`profile:${userId}`);
        if (!res) return;
        const remote = res as LawyerProfileData;
        const finalized = await finalizeProfile(remote, userId, persistLocal);
        /* حدّث ذاكرة المالك الكاملة دائماً (حتى لزائر) — وإلا تبقى خصوصية قديمة من جلسة مالك */
        cacheProfile(userId, finalized);
        if (persistLocal) {
            void import('@/app/services/profile/profileWarmCache')
                .then((m) => m.setProfileWarmCache(userId, finalized))
                .catch(() => undefined);
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(LAWYER_PROFILE_UPDATED, { detail: { userId } }));
        }
    } catch {
        if (localBase && persistLocal) {
            void finalizeProfile(localBase, userId, persistLocal).then((finalized) => {
                cacheProfile(userId, finalized);
                void import('@/app/services/profile/profileWarmCache')
                    .then((m) => m.setProfileWarmCache(userId, finalized))
                    .catch(() => undefined);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent(LAWYER_PROFILE_UPDATED, { detail: { userId } }));
                }
            });
        }
    }
}

function scopeProfileForViewer(
    profile: LawyerProfileData,
    viewerId: string | null | undefined,
    ownerId: string,
): LawyerProfileData {
    if (shouldPersistProfileLocally(viewerId, ownerId)) return profile;
    return redactProfileForVisitorView(profile);
}

export const ProfileDB = {
    async getProfile(userId: string, viewerIdOverride?: string | null): Promise<LawyerProfileData> {
        const viewerId = viewerIdOverride?.trim() || (await resolveSessionProfileUserId());
        const persistLocal = shouldPersistProfileLocally(viewerId, userId);

        if (persistLocal) {
            const local = await loadLocalProfile(userId);
            if (local) {
                const cleaned = sanitizeLawyerProfile(local);
                const header = await resolveProfileMedia(cleaned.header);
                const sections = await resolveGallerySections(cleaned.sections);
                const customization =
                    (await refreshProfileCustomizationMedia(cleaned.customization)) ??
                    cleaned.customization;
                const quick = cacheProfile(userId, {
                    ...cleaned,
                    header,
                    sections,
                    customization,
                });
                if (shouldSyncProfileCloud(userId)) void refreshProfileFromCloud(userId, quick);
                return scopeProfileForViewer(
                    {
                        ...quick,
                        header: { ...quick.header },
                        sections: quick.sections.map((section) => ({ ...section })),
                    },
                    viewerId,
                    userId,
                );
            }
        }

        const cached = profileMemoryCache.get(userId);
        if (cached) {
            if (shouldSyncProfileCloud(userId)) void refreshProfileFromCloud(userId, cached);
            return scopeProfileForViewer(
                {
                    ...cached,
                    header: { ...cached.header },
                    sections: cached.sections.map((section) => ({ ...section })),
                },
                viewerId,
                userId,
            );
        }

        try {
            const res = await lawyerCloudKv.get(`profile:${userId}`);
            if (res) {
                const remote = res as LawyerProfileData;
                const finalized = await finalizeProfile(remote, userId, persistLocal);
                /* ذاكرة كاملة تحت مفتاح المالك؛ التنقيح عند الإرجاع فقط */
                cacheProfile(userId, finalized);
                return scopeProfileForViewer(finalized, viewerId, userId);
            }
        } catch {
            /* Cloud-First */
        }

        const fallback = { ...DEFAULT_LAWYER_PROFILE, header: { ...DEFAULT_LAWYER_PROFILE.header } };
        const scopedFallback = persistLocal ? cacheProfile(userId, fallback) : fallback;
        return scopeProfileForViewer(scopedFallback, viewerId, userId);
    },

    async saveProfile(
        userId: string,
        profile: LawyerProfileData,
        writerId: string,
    ): Promise<{ cloudSynced: boolean; localPersisted: boolean }> {
        assertCanWriteProfile(writerId, userId);
        const cleaned = sanitizeLawyerProfile(profile);
        const localPersisted = await saveLocalProfile(userId, cleaned);
        cacheProfile(userId, cleaned);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(LAWYER_PROFILE_UPDATED, { detail: { userId } }));
        }
        try {
            await lawyerCloudKv.set(`profile:${userId}`, cleaned);
            return { cloudSynced: true, localPersisted };
        } catch {
            if (!localPersisted) {
                throw new Error('profile-persist-failed');
            }
            return { cloudSynced: false, localPersisted };
        }
    },
};
