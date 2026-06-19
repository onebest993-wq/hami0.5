import React from 'react';
import { motion } from 'motion/react';
import { Search } from 'lucide-react';

interface HeaderSearchTriggerProps {
    onClick: () => void;
    onPointerEnter?: () => void;
}

export function HeaderSearchTrigger({ onClick, onPointerEnter }: HeaderSearchTriggerProps) {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            aria-label="بحث شامل"
            data-testid="header-search-trigger"
            whileTap={{ scale: 0.9 }}
            className="group relative w-10 h-10 rounded-xl flex items-center justify-center touch-manipulation"
        >
            <span
                className="absolute inset-0 rounded-xl bg-white/[0.04] border border-white/[0.08] group-active:border-[#E6C673]/30 transition-colors"
                aria-hidden
            />
            <span
                className="absolute inset-[2px] rounded-[10px] bg-gradient-to-br from-[#E6C673]/12 via-transparent to-transparent opacity-90 group-active:opacity-100 transition-opacity"
                aria-hidden
            />
            <motion.span
                className="absolute inset-0 rounded-full border border-[#E6C673]/0 group-active:border-[#E6C673]/30"
                aria-hidden
            />
            <Search
                className="relative text-[#E6C673] drop-shadow-[0_0_8px_rgba(230,198,115,0.35)]"
                size={19}
                strokeWidth={2.2}
                aria-hidden
            />
        </motion.button>
    );
}
