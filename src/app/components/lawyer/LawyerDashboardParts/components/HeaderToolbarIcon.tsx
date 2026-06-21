import React from 'react';
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';

export type HeaderToolbarIconProps = {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    onPointerEnter?: () => void;
    active?: boolean;
    accent?: boolean;
    badge?: React.ReactNode;
    testId?: string;
};

export function HeaderToolbarIcon({
    icon: Icon,
    label,
    onClick,
    onPointerEnter,
    active,
    accent,
    badge,
    testId,
}: HeaderToolbarIconProps) {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            aria-label={label}
            title={label}
            data-testid={testId}
            whileHover={{ scale: 1.06, y: -1 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="group relative w-11 h-11 rounded-[1.1rem] flex items-center justify-center touch-manipulation"
        >
            <span
                className="absolute inset-0 rounded-[1.1rem] transition-colors duration-200"
                style={{
                    background: active
                        ? 'color-mix(in srgb, var(--hami-primary, #E6C673) 14%, rgba(255,255,255,0.05))'
                        : 'rgba(255,255,255,0.04)',
                    border: active
                        ? '1px solid color-mix(in srgb, var(--hami-primary, #E6C673) 35%, transparent)'
                        : '1px solid rgba(255,255,255,0.09)',
                    boxShadow: active
                        ? 'inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 24px color-mix(in srgb, var(--hami-primary, #E6C673) 12%, transparent)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.07)',
                }}
                aria-hidden
            />
            <motion.span
                className="absolute inset-[3px] rounded-[0.95rem] pointer-events-none opacity-0 group-hover:opacity-100"
                style={{
                    background:
                        'radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--hami-primary, #E6C673) 22%, transparent), transparent 70%)',
                }}
                aria-hidden
            />
            <Icon
                size={19}
                strokeWidth={active || accent ? 2.1 : 1.75}
                className={`relative z-[1] transition-colors duration-200 ${
                    accent || active ? 'text-[#E6C673]' : 'text-white/88 group-hover:text-[#E6C673]'
                }`}
                style={{
                    filter: accent || active ? 'drop-shadow(0 0 10px rgba(230,198,115,0.35))' : undefined,
                }}
                aria-hidden
            />
            {badge}
        </motion.button>
    );
}
