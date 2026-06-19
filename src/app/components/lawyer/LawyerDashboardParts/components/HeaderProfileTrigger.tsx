import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { ProfileAvatarImage } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileAvatarImage';
import { CAIRO_FONT_STYLE } from '../constants';

interface HeaderProfileTriggerProps {
    displayName: string;
    title?: string;
    avatarUrl?: string;
    onClick: () => void;
    onPointerEnter?: () => void;
}

export function HeaderProfileTrigger({
    displayName,
    avatarUrl,
    onClick,
    onPointerEnter,
}: HeaderProfileTriggerProps) {
    const profileInitial = displayName.trim().charAt(0) || 'م';

    return (
        <motion.button
            type="button"
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            aria-label="الملف المهني"
            data-testid="header-profile-trigger"
            whileTap={{ scale: 0.97 }}
            className="group pointer-events-auto touch-manipulation flex items-center gap-2.5 min-h-[56px] py-1 pr-1 pl-2 min-w-0 max-w-[min(100vw-7rem,280px)] sm:max-w-[300px] rounded-2xl border border-transparent hover:border-white/[0.08] hover:bg-white/[0.03] transition-all duration-200"
        >
            <div className="relative shrink-0 w-[52px] h-[52px] sm:w-[54px] sm:h-[54px] rounded-2xl overflow-hidden bg-[#0A0C12] ring-1 ring-[#E6C673]/20">
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
}
