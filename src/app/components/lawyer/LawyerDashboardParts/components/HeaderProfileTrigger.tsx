import React, { memo, useRef } from 'react';
import { HeaderChevronLeftIcon } from './headerToolbarIcons';
import { ProfileAvatarImage } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileAvatarImage';
import { useLawyerProfileHeader } from '@/app/hooks/useLawyerProfileHeader';
import { resolveProfileHeaderInitial } from '@/app/services/profile/profileHeaderLogic';
import { CAIRO_FONT_STYLE } from '../constants';

export type HeaderProfileTriggerProps = {
    interactive?: boolean;
    userId: string | undefined;
    userMetadata?: Record<string, unknown>;
    /** تبويب الملف مفتوح */
    expanded?: boolean;
    onClick: () => void;
    onPointerEnter?: () => void;
    onPointerDown?: () => void;
};

export const HeaderProfileTrigger = memo(function HeaderProfileTrigger({
    interactive = true,
    userId,
    userMetadata,
    expanded = false,
    onClick,
    onPointerEnter,
    onPointerDown,
}: HeaderProfileTriggerProps) {
    const { displayName, avatarUrl } = useLawyerProfileHeader(userId, userMetadata);
    const profileInitial = resolveProfileHeaderInitial(displayName);
    const armedRef = useRef(false);
    const armClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearArm = () => {
        armedRef.current = false;
        if (armClearTimerRef.current) {
            clearTimeout(armClearTimerRef.current);
            armClearTimerRef.current = null;
        }
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
            onClick={() => {
                /* pointerdown سبق الفتح — تجاهل click المكرر */
                if (armedRef.current) {
                    clearArm();
                    return;
                }
                onClick();
            }}
            onPointerEnter={onPointerEnter}
            onPointerDown={(event) => {
                if (event.button !== 0) return;
                /* prime أولاً — يركّب السطح قبل snap إن لم يكن جاهزاً */
                onPointerDown?.();
                armedRef.current = true;
                onClick();
                if (armClearTimerRef.current) clearTimeout(armClearTimerRef.current);
                armClearTimerRef.current = setTimeout(clearArm, 400);
            }}
            onPointerCancel={clearArm}
            onFocus={onPointerEnter}
            aria-label="الملف المهني"
            aria-expanded={expanded}
            aria-controls="lawyer-dashboard-profile-surface"
            title={displayName}
            data-testid="header-profile-trigger"
            className={`group touch-manipulation flex items-center gap-2.5 min-h-[56px] py-1 pr-1 pl-2 min-w-0 max-w-[min(100vw-7rem,320px)] sm:max-w-[340px] rounded-2xl border border-transparent hover:border-white/[0.08] hover:bg-white/[0.03] outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C] ${
                interactive ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
            <div
                className="relative shrink-0 w-[52px] h-[52px] sm:w-[54px] sm:h-[54px] rounded-2xl overflow-hidden bg-[#0A0C12] ring-1 ring-[#E6C673]/20"
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
                className="text-white font-bold text-base sm:text-[17px] leading-snug truncate min-w-0 flex-1 text-right group-hover:text-[#E6C673] transition-colors"
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
