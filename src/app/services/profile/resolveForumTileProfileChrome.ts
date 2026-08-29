import { resolveProfileHeaderInitial } from '@/app/services/profile/profileHeaderLogic';
import { hydrateProfileWarmCachePeekSync } from '@/app/services/profile/profileWarmCache';
import { getProfileWarmCacheRaw } from '@/app/services/profile/profileWarmCacheStore';
import { isLawyerProfileBootWarmPending } from '@/app/services/profile/profileBootWarmPending';
import { isLawyerProfileLocalUnread } from '@/app/services/profile/lawyerProfileLocalRead';
import { sanitizeProfileMediaUrl } from '@/app/services/profile/profileUrlSanitize';
import { resolveFirstPaintLawyerDisplayName } from '@/app/services/profile/resolveLawyerDisplayName';
import {
    getUserIdentityUiState,
    mergeUserIdentityUiState,
    type UserIdentityUiState,
} from '@/app/services/profile/userIdentityUiState';

export type ForumTileProfileChrome = {
    displayName: string;
    profileInitial: string;
    avatarUrl: string;
    showInitial: boolean;
    /** مطابق UserIdentityUiState.isLoaded */
    isLoaded: boolean;
};

function avatarFromSessionMetadata(
    userMetadata?: Record<string, unknown> | null,
): string {
    if (!userMetadata) return '';
    const raw = userMetadata.avatar_url ?? userMetadata.avatarUrl ?? userMetadata.picture;
    return typeof raw === 'string' ? sanitizeProfileMediaUrl(raw) ?? '' : '';
}

function toChrome(state: UserIdentityUiState): ForumTileProfileChrome {
    return {
        displayName: state.displayName,
        profileInitial: state.profileInitial,
        avatarUrl: state.avatarUrl,
        /* الحرف الذهبي يقرره الربع الحي عند التسوية — لا من الكروم أثناء وجود userId */
        showInitial: state.isLoaded && !state.avatarUrl && state.userId === 'anon',
        isLoaded: state.isLoaded,
    };
}

/**
 * مصدر واحد لكروم ربع الملف — يفضّل التجميد الذرّي إن وُجد،
 * وإلا يبني لقطة ويُحدّث المتجر دون تفريغ الاسم أثناء التسخين.
 */
export function resolveForumTileProfileChrome(
    userId?: string | null,
    userMetadata?: Record<string, unknown> | null,
): ForumTileProfileChrome {
    const uid = userId?.trim();
    const frozen = uid ? getUserIdentityUiState(uid) : null;
    if (frozen?.isLoaded) {
        return toChrome(frozen);
    }

    if (uid) {
        hydrateProfileWarmCachePeekSync(uid, userMetadata ?? undefined, uid);
    }
    const cached = uid ? getProfileWarmCacheRaw(uid) : undefined;
    const cachedName = cached?.header?.name;
    const avatarUrl =
        sanitizeProfileMediaUrl(cached?.header?.profileImage) ||
        sanitizeProfileMediaUrl(frozen?.avatarUrl) ||
        avatarFromSessionMetadata(userMetadata) ||
        '';
    const displayName =
        resolveFirstPaintLawyerDisplayName(cachedName, uid, userMetadata ?? undefined) ||
        frozen?.displayName ||
        (!uid ? 'المحامي' : '');
    const profileInitial = resolveProfileHeaderInitial(displayName || frozen?.profileInitial || 'م');
    const warmPending = isLawyerProfileBootWarmPending();
    const localUnread = Boolean(uid && isLawyerProfileLocalUnread(uid));

    if (!uid) {
        return {
            displayName,
            profileInitial: resolveProfileHeaderInitial(displayName || 'المحامي'),
            avatarUrl: '',
            showInitial: !avatarUrl,
            isLoaded: true,
        };
    }

    /* أثناء التسخين: احتفظ بالاسم/الصورة المعروفين — لا تُفرّغ الحقول ثم تملأها */
    const snapshot = mergeUserIdentityUiState({
        userId: uid,
        displayName,
        avatarUrl,
        profileInitial,
        /* بعد التسخين: الحساب الجديد بلا اسم جاهز للحرف — لا يُعلَّق «جاري التحميل» إلى الأبد */
        isLoaded: !warmPending && !localUnread,
    });

    return toChrome(snapshot);
}
