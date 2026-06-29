import SecureStoreService from '@/app/services/SecureStoreService';
import { sanitizeLawyerProfile } from '@/app/services/profileSanitizer';
import { refreshProfileMediaUrl } from '@/app/services/profileMediaService';
import { assertCanWriteProfile } from '@/app/services/profile/profileWriteGuard';
import { shouldPersistProfileLocally } from '@/app/services/profile/profileShellLogic';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { supabase } from '@/app/lib/supabase-client';
import { LAWYER_PROFILE_UPDATED } from '@/app/services/profile/profileEvents';
import { lawyerCloudKv } from '@/app/services/cloud/lawyerCloudKv';
import {
    DEFAULT_LAWYER_PROFILE,
    type LawyerProfileData,
    type LawyerProfileHeader,
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
async function saveLocalProfile(userId: string, profile: LawyerProfileData): Promise<void> {
    const key = getProfileLocalKey(userId);
    const value = JSON.stringify(profile);
    try {
        if (typeof window !== 'undefined') {
            SecureStoreService.setItemSync(key, value);
            return;
        }
        await SecureStoreService.setItem(key, value);
    } catch {
        /* ignore */
    }
}

async function resolveProfileMedia(header: LawyerProfileHeader): Promise<LawyerProfileHeader> {
    const next = { ...header };
    if (next.profileImagePath && !next.profileImage) {
        next.profileImage = await refreshProfileMediaUrl(next.profileImagePath, next.profileImage);
    }
    if (next.coverImagePath && !next.coverImage) {
        next.coverImage = await refreshProfileMediaUrl(next.coverImagePath, next.coverImage);
    }
    return next;
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

async function resolveSessionProfileUserId(): Promise<string | null> {
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
    const profile = { ...cleaned, header };
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
        cacheProfile(userId, finalized);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(LAWYER_PROFILE_UPDATED, { detail: { userId } }));
        }
    } catch {
        if (localBase) {
            void finalizeProfile(localBase, userId, persistLocal).then((finalized) => {
                cacheProfile(userId, finalized);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent(LAWYER_PROFILE_UPDATED, { detail: { userId } }));
                }
            });
        }
    }
}

export const ProfileDB = {
    async getProfile(userId: string): Promise<LawyerProfileData> {
        const viewerId = await resolveSessionProfileUserId();
        const persistLocal = shouldPersistProfileLocally(viewerId, userId);

        const cached = profileMemoryCache.get(userId);
        if (cached) {
            if (shouldSyncProfileCloud(userId)) void refreshProfileFromCloud(userId, cached);
            return {
                ...cached,
                header: { ...cached.header },
                sections: cached.sections.map((section) => ({ ...section })),
            };
        }

        if (persistLocal) {
            const local = await loadLocalProfile(userId);
            if (local) {
                const cleaned = sanitizeLawyerProfile(local);
                const quick = cacheProfile(userId, { ...cleaned, header: { ...cleaned.header } });
                if (shouldSyncProfileCloud(userId)) void refreshProfileFromCloud(userId, quick);
                return {
                    ...quick,
                    header: { ...quick.header },
                    sections: quick.sections.map((section) => ({ ...section })),
                };
            }
        }

        try {
            const res = await lawyerCloudKv.get(`profile:${userId}`);
            if (res) {
                const remote = res as LawyerProfileData;
                return cacheProfile(userId, await finalizeProfile(remote, userId, persistLocal));
            }
        } catch {
            /* Cloud-First */
        }

        const fallback = { ...DEFAULT_LAWYER_PROFILE, header: { ...DEFAULT_LAWYER_PROFILE.header } };
        return cacheProfile(userId, fallback);
    },

    async saveProfile(userId: string, profile: LawyerProfileData, writerId: string): Promise<void> {
        assertCanWriteProfile(writerId, userId);
        const cleaned = sanitizeLawyerProfile(profile);
        try {
            await lawyerCloudKv.set(`profile:${userId}`, cleaned);
        } catch {
            /* Cloud-First */
        }
        await saveLocalProfile(userId, cleaned);
        cacheProfile(userId, cleaned);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(LAWYER_PROFILE_UPDATED, { detail: { userId } }));
        }
    },
};
