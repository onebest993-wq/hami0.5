import React, { memo } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { ProfileAvatarImage } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileAvatarImage';
import { useLawyerProfileHeader } from '@/app/hooks/useLawyerProfileHeader';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { resolveProfileHeaderInitial } from '@/app/services/profile/profileHeaderLogic';
import { CAIRO_FONT_STYLE } from '../constants';

export type HeaderProfileTriggerProps = {
    interactive?: boolean;
    userId: string | undefined;
    userMetadata?: Record<string, unknown>;
    onClick: () => void;
    onPointerEnter?: () => void;
    onPointerDown?: () => void;
};

export const HeaderProfileTrigger = memo(function HeaderProfileTrigger({
    interactive = true,
    userId,
    userMetadata,
    onClick,
    onPointerEnter,
    onPointerDown,
}: HeaderProfileTriggerProps) {
    const reduceMotion = useReduceMotion();
    const { displayName, avatarUrl } = useLawyerProfileHeader(userId, userMetadata);
    const profileInitial = resolveProfileHeaderInitial(displayName);

    return (
        <motion.button
            type="button"
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            onPointerDown={(event) => {
                if (event.button === 0) onPointerDown?.();
            }}
            onFocus={onPointerEnter}
            aria-label="الملف المهني"
            data-testid="header-profile-trigger"
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            className={`group touch-manipulation flex items-center gap-2.5 min-h-[56px] py-1 pr-1 pl-2 min-w-0 max-w-[min(100vw-7rem,280px)] sm:max-w-[300px] rounded-2xl border border-transparent hover:border-white/[0.08] hover:bg-white/[0.03] transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C] ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
            <div
                className="relative shrink-0 w-[52px] h-[52px] sm:w-[54px] sm:h-[54px] rounded-2xl overflow-hidden bg-[#0A0C12] ring-1 ring-[#E6C673]/20"
                data-testid="header-profile-avatar"
            >
                {avatarUrl ? (
                    <ProfileAvatarImage src={avatarUrl} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#141824] to-[#0A0F1C]">
                        <span className="text-[#E6C673] font-bold text-2xl" aria-hidden>
                            {profileInitial}
                        </span>
                    </div>
                )}
            </div>

            <span
                data-testid="header-profile-name"
                className="text-white font-bold text-base sm:text-[17px] leading-snug truncate min-w-0 flex-1 text-right group-hover:text-[#E6C673] transition-colors"
                style={CAIRO_FONT_STYLE}
            >
                {displayName}
            </span>

            <ChevronLeft
                size={18}
                className="shrink-0 text-[#E6C673]/30 group-hover:text-[#E6C673]/70 transition-colors mr-0.5"
                aria-hidden
            />
        </motion.button>
    );
});
