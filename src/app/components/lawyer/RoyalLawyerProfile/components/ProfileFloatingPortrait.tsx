import React from 'react';
import { motion } from 'motion/react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';

type ProfileFloatingPortraitProps = {
    children: React.ReactNode;
    className?: string;
    /** يوقف الحركة العائمة أثناء فتح الاستوديو أو التفاعل الثقيل */
    paused?: boolean;
};

/** إطار دائري عائم — ذهبي، بدون قص للصورة */
export function ProfileFloatingPortrait({
    children,
    className = '',
    paused = false,
}: ProfileFloatingPortraitProps) {
    const reduceMotion = useReduceMotion();
    const shouldFloat = !reduceMotion && !paused;

    return (
        <motion.div
            data-profile-portrait-float
            className={`relative ${className}`}
            animate={shouldFloat ? { y: [0, -5, 0] } : false}
            transition={
                shouldFloat ? { duration: 5.2, repeat: Infinity, ease: 'easeInOut' } : undefined
            }
        >
            <div
                className={`absolute inset-x-3 bottom-0 h-[55%] rounded-full translate-y-3 scale-95 ${
                    reduceMotion ? 'bg-black/25 opacity-40' : 'bg-black/45 blur-2xl opacity-60'
                }`}
                aria-hidden
            />
            <div className="absolute -inset-1 rounded-full hami-profile-portrait-ring opacity-80" aria-hidden />
            <div className="relative w-[124px] h-[124px] rounded-full overflow-hidden border-[3px] hami-profile-portrait-frame bg-[#0A0F1C]">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-black/15 pointer-events-none z-[1]" />
                <div className="relative w-full h-full">{children}</div>
            </div>
        </motion.div>
    );
}
