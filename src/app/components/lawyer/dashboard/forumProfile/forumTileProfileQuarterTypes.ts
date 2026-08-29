import type { ForumTileProfileChrome } from '@/app/services/profile/resolveForumTileProfileChrome';

/** عتبة تمييز النقر من تمرير شبكة الرئيسية — دون فتح الملف أثناء السحب */
export const FORUM_TILE_PROFILE_SCROLL_SLOP_PX = 12;

export function isForumTileProfilePointerScroll(
    origin: { x: number; y: number } | null,
    point: { clientX: number; clientY: number },
    slopPx = FORUM_TILE_PROFILE_SCROLL_SLOP_PX,
): boolean {
    if (!origin) return false;
    const dx = point.clientX - origin.x;
    const dy = point.clientY - origin.y;
    return dx * dx + dy * dy > slopPx * slopPx;
}

export type ForumTileProfileQuarterHandlers = {
    onOpenProfile: () => void;
    onPrimeProfile?: () => void;
    onPrimeProfilePress?: () => void;
};

export type ForumTileProfileQuarterProps = ForumTileProfileQuarterHandlers & {
    userId?: string;
    userMetadata?: Record<string, unknown>;
    disabled: boolean;
    seedDisplayName?: string;
};

export type ForumTileProfileQuarterSlotProps = Omit<ForumTileProfileQuarterProps, 'seedDisplayName'> & {
    chrome: ForumTileProfileChrome | null;
};

export type ForumTileProfileQuarterFallbackProps = {
    displayName?: string;
    profileInitial?: string;
    avatarUrl?: string;
    showInitial?: boolean;
    identitySettled?: boolean;
    disabled?: boolean;
    userId?: string;
    userMetadata?: Record<string, unknown>;
    onOpenProfile?: () => void;
    onPrimeProfile?: () => void;
    onPrimeProfilePress?: () => void;
};
