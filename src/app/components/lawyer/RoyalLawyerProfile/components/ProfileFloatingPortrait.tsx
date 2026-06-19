import React from 'react';
import { motion } from 'motion/react';

type ProfileFloatingPortraitProps = {
    children: React.ReactNode;
    className?: string;
};

/** إطار دائري عائم — ذهبي، بدون قص للصورة */
export function ProfileFloatingPortrait({ children, className = '' }: ProfileFloatingPortraitProps) {
    return (
        <motion.div
            className={`relative ${className}`}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
        >
            <div
                className="absolute inset-x-3 bottom-0 h-[55%] rounded-full bg-black/45 blur-2xl translate-y-3 scale-95 opacity-60"
                aria-hidden
            />
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#E6C673]/70 via-[#E6C673]/25 to-[#E6C673]/10 opacity-80" aria-hidden />
            <div
                className="relative w-[112px] h-[112px] rounded-full overflow-hidden border-[3px] border-[#E6C673]/55 bg-[#0A0F1C] shadow-[0_16px_40px_rgba(0,0,0,0.45),0_0_0_1px_rgba(230,198,115,0.15)]"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-black/15 pointer-events-none z-[1]" />
                <div className="relative w-full h-full">{children}</div>
            </div>
        </motion.div>
    );
}
