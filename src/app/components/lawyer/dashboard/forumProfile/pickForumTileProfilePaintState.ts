import { resolveForumTileProfileChrome } from '@/app/services/profile/resolveForumTileProfileChrome';
import {
    getUserIdentityUiState,
    mergeUserIdentityUiState,
    type UserIdentityUiState,
} from '@/app/services/profile/userIdentityUiState';
import {
    isNamePrefixEnrichment,
    preferRicherLawyerDisplayName,
} from '@/app/services/profile/resolveLawyerDisplayName';
import { resolveProfileHeaderInitial } from '@/app/services/profile/profileHeaderLogic';

/** لقطة الطلاء الذرّية — تجميد محمل يتقدّم على الكروم/البذرة/الخطاف */
export function pickForumTileProfilePaintState(
    userId: string | undefined,
    userMetadata: Record<string, unknown> | undefined,
    liveName: string,
    liveAvatar: string,
    seedDisplayName?: string,
): UserIdentityUiState {
    const chrome = resolveForumTileProfileChrome(userId, userMetadata);
    const uid = userId?.trim() || '';
    const frozen = uid ? getUserIdentityUiState(uid) : null;
    const seedName = seedDisplayName?.trim() || '';
    const liveTrimmed = liveName.trim();
    const incomingAvatar = chrome.avatarUrl || liveAvatar || '';

    if (frozen?.isLoaded) {
        let displayName = frozen.displayName;
        for (const candidate of [seedName, chrome.displayName, liveTrimmed]) {
            if (!candidate) continue;
            if (
                candidate === displayName ||
                isNamePrefixEnrichment(displayName, candidate)
            ) {
                displayName = preferRicherLawyerDisplayName(displayName, candidate);
            }
        }
        const avatarUrl = frozen.avatarUrl || incomingAvatar;
        if (displayName === frozen.displayName && avatarUrl === frozen.avatarUrl) {
            return frozen;
        }
        return mergeUserIdentityUiState({
            userId: frozen.userId,
            displayName,
            avatarUrl,
            profileInitial: resolveProfileHeaderInitial(displayName || frozen.profileInitial || 'م'),
            isLoaded: true,
        });
    }

    const displayName = chrome.displayName || seedName || liveTrimmed || '';
    return mergeUserIdentityUiState({
        userId: uid || 'anon',
        displayName,
        avatarUrl: incomingAvatar,
        profileInitial: chrome.profileInitial || resolveProfileHeaderInitial(displayName || 'م'),
        isLoaded: chrome.isLoaded,
    });
}
