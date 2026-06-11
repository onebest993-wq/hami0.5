import React from 'react';
import { motion } from 'motion/react';
import { MessagesSquare, BookOpen } from 'lucide-react';

interface ForumSectionSwitchProps {
    activeSection: 'forum' | 'repository';
    onSectionChange: (section: 'forum' | 'repository') => void;
}

const SECTIONS = [
    { id: 'forum' as const, label: 'المنتدى', sub: 'استشارات الزملاء', icon: MessagesSquare },
    { id: 'repository' as const, label: 'المستودع', sub: 'مراجع ومستندات', icon: BookOpen },
];

export const ForumSectionSwitch = ({ activeSection, onSectionChange }: ForumSectionSwitchProps) => {
    return (
        <div
            className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#0F1119]/90 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            role="tablist"
            aria-label="تبديل بين المنتدى والمستودع"
        >
            {SECTIONS.map(({ id, label, sub, icon: Icon }) => {
                const isActive = activeSection === id;
                return (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onSectionChange(id)}
                        className={`relative min-h-[52px] rounded-xl px-3 py-2 flex items-center gap-2.5 text-right transition-colors ${
                            isActive ? 'text-white' : 'text-white/45 hover:text-white/70'
                        }`}
                    >
                        {isActive ? (
                            <motion.div
                                layoutId="forum-section-active-pill"
                                className="absolute inset-0 rounded-xl bg-gradient-to-l from-[#E6C673]/20 via-[#E6C673]/10 to-transparent border border-[#E6C673]/35 shadow-[0_0_28px_rgba(230,198,115,0.12)]"
                                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                            />
                        ) : null}
                        <span
                            className={`relative z-10 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                isActive
                                    ? 'bg-[#E6C673]/20 text-[#E6C673]'
                                    : 'bg-white/5 text-white/40'
                            }`}
                        >
                            <Icon size={18} strokeWidth={isActive ? 2.25 : 2} />
                        </span>
                        <span className="relative z-10 min-w-0 flex-1">
                            <span className={`block text-[13px] leading-tight truncate ${isActive ? 'font-bold' : 'font-semibold'}`}>
                                {label}
                            </span>
                            <span className={`block text-[10px] mt-0.5 truncate ${isActive ? 'text-white/55' : 'text-white/30'}`}>
                                {sub}
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
};
