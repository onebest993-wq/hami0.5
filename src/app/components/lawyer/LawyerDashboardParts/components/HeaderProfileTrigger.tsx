import React, { memo, useRef } from 'react';
import { HeaderChevronLeftIcon } from './headerToolbarIcons';
import { ProfileAvatarImage } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileAvatarImage';
import { useLawyerProfileHeader } from '@/app/hooks/useLawyerProfileHeader';
import { resolveProfileHeaderInitial } from '@/app/services/profile/profileHeaderLogic';
import { markProfilePerfPhase } from '@/app/services/profile/profilePerfMetrics';
import { CAIRO_FONT_STYLE } from '../constants';

export type HeaderProfileTriggerProps = {
    interactive?: boolean;
    userId: string | undefined;
    userMetadata?: Record<string, unknown>;
    /** تبويب الملف مفتوح */
    expanded?: boolean;
    /** shell جاهز — بلا فتح قبل اكتمال التسخين */
    shellReady?: boolean;
    onClick: () => void;
    onPointerEnter?: () => void;
    onPointerDown?: () => void;
};

export const HeaderProfileTrigger = memo(function HeaderProfileTrigger({
    interactive = true,
    userId,
    userMetadata,
    expanded = false,
    shellReady = true,
    onClick,
    onPointerEnter,
    onPointerDown,
}: HeaderProfileTriggerProps) {
    const pointerCommitRef = useRef(false);
    const { displayName, avatarUrl } = useLawyerProfileHeader(userId, userMetadata);
    const profileInitial = resolveProfileHeaderInitial(displayName);
    /** لا نحجب اللمسة — التسخين مؤشر بصري اختياري فقط */
    const shellWarming = false;

    const commitOpen = () => {
        if (!interactive) return;
        onClick();
    };

    const handlePointerDown = (event: React.PointerEvent) => {
        if (event.button !== 0 || !interactive) return;
        event.stopPropagation();
        onPointerDown?.();
        markProfilePerfPhase('pointer-down');
        pointerCommitRef.current = true;
        commitOpen();
    };

    const initialsFallback = (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#141824] to-[#0A0F1C]">
            <span className="text-[#E6C673] font-bold text-2xl" aria-hidden>
                {profileInitial}
            </span>
        </div>
    );

    return (
        <button
            type="button"
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (pointerCommitRef.current) {
                    pointerCommitRef.current = false;
                    return;
                }
                onPointerDown?.();
                if (!interactive) return;
                markProfilePerfPhase('pointer-down');
                commitOpen();
            }}
            onPointerEnter={onPointerEnter}
            onPointerDown={handlePointerDown}
            aria-label={`الملف المهني — ${displayName}`}
            aria-expanded={expanded}
            aria-busy={shellWarming || undefined}
            aria-controls="lawyer-dashboard-profile-surface"
            title={shellWarming ? 'جاري تجهيز الملف المهني…' : displayName}
            data-testid="header-profile-trigger"
            data-profile-shell-warming={shellWarming ? 'true' : undefined}
            className={`group touch-manipulation flex items-center gap-2 min-h-[48px] py-0.5 pr-1 pl-1.5 min-w-0 max-w-[min(100vw-8.5rem,240px)] sm:max-w-[300px] rounded-2xl border border-transparent hover:border-white/[0.08] hover:bg-white/[0.03] outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C] ${
                interactive ? 'pointer-events-auto' : 'pointer-events-none'
            } ${shellWarming ? 'opacity-90' : ''}`}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
            <div
                className={`relative shrink-0 w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] rounded-xl overflow-hidden bg-[#0A0C12] ring-1 ring-[#E6C673]/20 ${
                    shellWarming ? 'hami-header-profile-avatar-warming' : ''
                }`}
                data-testid="header-profile-avatar"
            >
                {avatarUrl ? (
                    <ProfileAvatarImage src={avatarUrl} fallback={initialsFallback} />
                ) : (
                    initialsFallback
                )}
            </div>

            <span
                data-testid="header-profile-name"
                className="text-white font-bold text-sm sm:text-base leading-snug truncate min-w-0 flex-1 text-right group-hover:text-[#E6C673] transition-colors"
                style={CAIRO_FONT_STYLE}
            >
                {displayName}
            </span>

            <HeaderChevronLeftIcon
                size={18}
                className="shrink-0 text-[#E6C673]/30 group-hover:text-[#E6C673]/70 transition-colors mr-0.5"
                aria-hidden
            />
        </button>
    );
});
