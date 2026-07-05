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
    async getProfile(userId: string, viewerIdOverride?: string | null): Promise<LawyerProfileData> {
        const viewerId = viewerIdOverride?.trim() || (await resolveSessionProfileUserId());
        const persistLocal = shouldPersistProfileLocally(viewerId, userId);
        //#region debug-point profile-db-get-start
        fetch('http://127.0.0.1:7777/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: 'profile-edit-persist',
                runId: 'post-fix',
                hypothesisId: 'C',
                location: 'lawyerProfileCloud.ts:getProfile:start',
                msg: '[DEBUG] ProfileDB.getProfile resolved viewer scope',
                data: {
                    userId,
                    viewerId,
                    persistLocal,
                    memoryCached: profileMemoryCache.has(userId),
                },
                ts: Date.now(),
            }),
        }).catch(() => undefined);
        //#endregion debug-point profile-db-get-start

        if (persistLocal) {
            const local = await loadLocalProfile(userId);
            //#region debug-point profile-db-get-local
            fetch('http://127.0.0.1:7777/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: 'profile-edit-persist',
                    runId: 'post-fix',
                    hypothesisId: 'C',
                    location: 'lawyerProfileCloud.ts:getProfile:local',
                    msg: '[DEBUG] ProfileDB.getProfile checked local storage',
                    data: {
                        userId,
                        hasLocal: Boolean(local),
                        localName: local?.header?.name ?? null,
                    },
                    ts: Date.now(),
                }),
            }).catch(() => undefined);
            //#endregion debug-point profile-db-get-local
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

        const cached = profileMemoryCache.get(userId);
        if (cached) {
            if (shouldSyncProfileCloud(userId)) void refreshProfileFromCloud(userId, cached);
            return {
                ...cached,
                header: { ...cached.header },
                sections: cached.sections.map((section) => ({ ...section })),
            };
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
        //#region debug-point profile-db-save-start
        fetch('http://127.0.0.1:7777/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: 'profile-edit-persist',
                runId: 'post-fix',
                hypothesisId: 'B',
                location: 'lawyerProfileCloud.ts:saveProfile:start',
                msg: '[DEBUG] ProfileDB.saveProfile received payload',
                data: {
                    userId,
                    writerId,
                    cleanedName: cleaned.header?.name ?? null,
                    cleanedImagePath: cleaned.header?.profileImagePath ?? null,
                    sectionsCount: cleaned.sections.length,
                },
                ts: Date.now(),
            }),
        }).catch(() => undefined);
        //#endregion debug-point profile-db-save-start
        await saveLocalProfile(userId, cleaned);
        //#region debug-point profile-db-save-local-done
        fetch('http://127.0.0.1:7777/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: 'profile-edit-persist',
                runId: 'post-fix',
                hypothesisId: 'C',
                location: 'lawyerProfileCloud.ts:saveProfile:local-done',
                msg: '[DEBUG] ProfileDB.saveProfile wrote local profile',
                data: {
                    userId,
                    cleanedName: cleaned.header?.name ?? null,
                },
                ts: Date.now(),
            }),
        }).catch(() => undefined);
        //#endregion debug-point profile-db-save-local-done
        cacheProfile(userId, cleaned);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(LAWYER_PROFILE_UPDATED, { detail: { userId } }));
        }
        void lawyerCloudKv.set(`profile:${userId}`, cleaned).catch(() => undefined);
    },
};
