import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

type ProfileBackBarProps = {
    onBack: () => void;
};

export function ProfileBackBar({ onBack }: ProfileBackBarProps) {
    return (
        <div
            className="fixed z-50 left-4 pointer-events-none"
            style={{ top: 'max(0.75rem, calc(env(safe-area-inset-top) + 0.5rem))' }}
        >
            <motion.button
                type="button"
                onClick={onBack}
                whileTap={{ scale: 0.95 }}
                aria-label="العودة للرئيسية"
                data-testid="lawyer-profile-back"
                className="pointer-events-auto flex items-center justify-center w-11 h-11 rounded-xl bg-black/55 backdrop-blur-xl border border-white/15 shadow-lg"
            >
                <ArrowRight size={18} className="text-[#E6C673]" />
            </motion.button>
        </div>
    );
}
