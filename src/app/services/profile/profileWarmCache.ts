import type { LawyerProfileData } from '@/app/services/profile/profileTypes';
import { readLocalProfileSync, isLawyerProfileLocalUnread, lawyerProfileLocalRecordExists } from '@/app/services/profile/lawyerProfileLocalRead';
import { DEFAULT_LAWYER_PROFILE } from '@/app/services/cloud/lawyerProfileTypes';
import {
    preferRicherLawyerDisplayName,
    resolveFirstPaintLawyerDisplayName,
} from '@/app/services/profile/resolveLawyerDisplayName';
import { LAWYER_PROFILE_UPDATED } from '@/app/services/profile/profileEvents';
import {
    hasProfileWarmCache,
    invalidateProfileWarmCache,
    peekProfileWarmCache,
    setProfileWarmCache,
    type ProfileWarmCachePeekOptions,
} from '@/app/services/profile/profileWarmCacheCore';
import {
    isProfilePaintReady,
    shouldAwaitCloudProfileSettle,
} from '@/app/services/profile/profileSparseDetect';
import { isLawyerProfileBootWarmPending } from '@/app/services/profile/profileBootWarmPending';
import { sanitizeProfileMediaUrl } from '@/app/services/profile/profileUrlSanitize';
import { getUserIdentityUiState } from '@/app/services/profile/userIdentityUiState';

export type { ProfileWarmCachePeekOptions };
export {
    hasProfileWarmCache,
    invalidateProfileWarmCache,
    peekProfileWarmCache,
    setProfileWarmCache,
};

export { subscribeProfileWarmCache } from '@/app/services/profile/profileWarmCacheStore';

const inflight = new Map<string, Promise<LawyerProfileData>>();

/**
 * يملأ الكاش الدافئ متزامناً من التخزين المحلي أو بذرة الاسم من الجلسة —
 * قبل fetchLawyerProfile/async getProfile.
 */
export function hydrateProfileWarmCachePeekSync(
    userId?: string | null,
    userMeta?: Record<string, unknown> | null,
    viewerId?: string | null,
): LawyerProfileData | null {
    const uid = userId?.trim();
    if (!uid || typeof window === 'undefined') return null;

    const viewer = viewerId?.trim() || uid;
    const existing = peekProfileWarmCache(uid);
    const local = viewer === uid ? readLocalProfileSync(uid) : null;

    if (local) {
        const resolved =
            resolveFirstPaintLawyerDisplayName(local.header?.name, uid, userMeta ?? {}).trim() ||
            local.header?.name?.trim() ||
            '';
        const mergedName = preferRicherLawyerDisplayName(existing?.header?.name ?? '', resolved);
        const next: LawyerProfileData = {
            ...local,
            header: { ...local.header, name: mergedName || local.header.name },
        };
        setProfileWarmCache(uid, next);
        return peekProfileWarmCache(uid) ?? next;
    }

    const localUnread = viewer === uid && isLawyerProfileLocalUnread(uid);
    const warmPending = viewer === uid && isLawyerProfileBootWarmPending();
    const hasLocalRecord = viewer === uid && lawyerProfileLocalRecordExists(uid);

    if (localUnread || warmPending || hasLocalRecord) {
        return existing ?? null;
    }

    if (existing?.header?.name?.trim() && viewer === uid) {
        const name = resolveFirstPaintLawyerDisplayName(existing.header?.name, uid, userMeta ?? {}).trim();
        if (name && name !== existing.header?.name?.trim()) {
            const enriched: LawyerProfileData = {
                ...existing,
                header: { ...existing.header, name },
            };
            setProfileWarmCache(uid, enriched);
            return peekProfileWarmCache(uid) ?? enriched;
        }
        return existing;
    }

    if (viewer !== uid) return null;

    /* بلا ملف محلي: بذرة الاسم والصورة من الجلسة/الهوية — لا حقل JWT القصير `name`. */
    const name = resolveFirstPaintLawyerDisplayName(undefined, uid, userMeta ?? {}).trim();
    if (!name) return null;

    const metaAvatarRaw =
        userMeta &&
        (typeof userMeta.avatar_url === 'string'
            ? userMeta.avatar_url
            : typeof userMeta.avatarUrl === 'string'
              ? userMeta.avatarUrl
              : typeof userMeta.picture === 'string'
                ? userMeta.picture
                : '');
    const profileImage =
        getUserIdentityUiState(uid)?.avatarUrl ||
        (typeof metaAvatarRaw === 'string' ? sanitizeProfileMediaUrl(metaAvatarRaw) ?? '' : '') ||
        '';

    const stub: LawyerProfileData = {
        ...DEFAULT_LAWYER_PROFILE,
        header: { ...DEFAULT_LAWYER_PROFILE.header, name, profileImage },
        sections: DEFAULT_LAWYER_PROFILE.sections.map((section) => ({ ...section })),
    };
    setProfileWarmCache(uid, stub);
    return peekProfileWarmCache(uid) ?? stub;
}

function writeWarmPreferRich(uid: string, data: LawyerProfileData): LawyerProfileData {
    const existing = peekProfileWarmCache(uid);
    if (
        existing &&
        isProfilePaintReady(existing) &&
        shouldAwaitCloudProfileSettle(data)
    ) {
        return existing;
    }
    setProfileWarmCache(uid, data);
    return peekProfileWarmCache(uid) ?? data;
}

/** تحميل مسبق — لا يُرجع stub شحيح كـ «جاهز» إن وُجد أغنى.
 * لا يكتب كاشاً دافئاً لملف الغير (يمنع تسميم كاش المالك بعرض زائر منقّح).
 */
export function warmProfileDataCache(
    userId?: string | null,
    viewerId?: string | null,
): Promise<LawyerProfileData | null> {
    const uid = userId?.trim();
    if (!uid || typeof window === 'undefined') return Promise.resolve(null);

    const existing = peekProfileWarmCache(uid);
    if (existing && isProfilePaintReady(existing)) {
        return Promise.resolve(existing);
    }

    const pending = inflight.get(uid);
    if (pending) return pending.catch(() => null);

    const run = import('@/app/services/auth/lawyerAccountStatus')
        .then(async ({ canUseServerBackedNetworkFeatures }) => {
            if (!canUseServerBackedNetworkFeatures(uid)) {
                return peekProfileWarmCache(uid);
            }
            const m = await import('@/app/services/cloud/lawyerProfileCloud');
            const data = await m.ProfileDB.getProfile(uid, viewerId);
            let viewer = viewerId?.trim() || '';
            if (!viewer) {
                try {
                    viewer = (await m.resolveSessionProfileUserId())?.trim() || '';
                } catch {
                    viewer = '';
                }
            }
            if (!viewer || viewer !== uid) {
                /* زائر أو جلسة مجهولة — لا تُسمّم كاش المالك بعرض منقّح */
                return data;
            }
            return writeWarmPreferRich(uid, data);
        })
        .finally(() => {
            inflight.delete(uid);
        });

    inflight.set(uid, run);
    return run.catch(() => null);
}

export function prefetchProfileData(userId?: string | null): void {
    void warmProfileDataCache(userId).catch(() => undefined);
}

function waitForProfileUpdated(userId: string, timeoutMs: number): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            if (typeof window === 'undefined') {
                resolve();
                return;
            }
            try {
                window.clearTimeout(timer);
            } catch {
                /* jsdom teardown */
            }
            try {
                window.removeEventListener(LAWYER_PROFILE_UPDATED, onUpdated);
            } catch {
                /* jsdom teardown */
            }
            resolve();
        };
        const onUpdated = (e: Event) => {
            const uid = (e as CustomEvent<{ userId?: string }>).detail?.userId?.trim();
            if (uid && uid === userId) finish();
        };
        const timer = window.setTimeout(finish, timeoutMs);
        window.addEventListener(LAWYER_PROFILE_UPDATED, onUpdated);
    });
}

/**
 * يضمن بيانات قابلة للرسم قبل كشف التبويب — إطار واحد نظيف بلا وميض بذرة.
 * إن بقي الملف فارغاً فعلياً بعد المهلة يُعاد stub مستقر للعرض مرة واحدة.
 */
export async function ensureProfilePaintReady(
    userId?: string | null,
    timeoutMs = 480,
): Promise<LawyerProfileData | null> {
    const uid = userId?.trim();
    if (!uid || typeof window === 'undefined') return null;

    const peekReady = () => {
        const p = peekProfileWarmCache(uid);
        return isProfilePaintReady(p) ? p! : null;
    };

    const hit = peekReady();
    if (hit) return hit;

    const data = await warmProfileDataCache(uid);
    const afterWarm = peekReady();
    if (afterWarm) return afterWarm;

    // السحابة قد تُكمّل بعد getProfile المحلي
    void import('@/app/services/cloud/lawyerProfileCloud')
        .then((m) => m.ProfileDB.getProfile(uid))
        .catch(() => undefined);
    await waitForProfileUpdated(uid, timeoutMs);

    const afterCloud = peekReady();
    if (afterCloud) return afterCloud;

    /* لا تكتب حمولة منقّحة/مجهولة في الكاش الدافئ */
    return peekProfileWarmCache(uid) ?? data;
}
