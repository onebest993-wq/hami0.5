import React from 'react';
import { motion } from 'motion/react';
import type { NotificationTab } from '@/app/components/lawyer/NotificationPanel/types';
import { TAB_META } from '@/app/components/lawyer/NotificationPanel/constants';

interface NotificationTabsProps {
    activeTab: NotificationTab;
    onTabChange: (tab: NotificationTab) => void;
    tabCounts: { forum: number; system: number };
}

export function NotificationTabs({ activeTab, onTabChange, tabCounts }: NotificationTabsProps) {
    return (
        <div className="shrink-0 px-4 py-2.5 flex gap-2 overflow-x-auto no-scrollbar border-b border-white/[0.06]">
            {(['forum', 'system'] as NotificationTab[]).map((tab) => {
                const meta = TAB_META[tab];
                const Icon = meta.icon;
                const count = tabCounts[tab];
                const active = activeTab === tab;

                return (
                    <motion.button
                        key={tab}
                        type="button"
                        onClick={() => onTabChange(tab)}
                        whileTap={{ scale: 0.97 }}
                        className={[
                            'flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap text-sm relative min-h-[44px]',
                            active
                                ? 'bg-[#E6C673] text-black font-bold shadow-[0_4px_20px_rgba(230,198,115,0.25)]'
                                : 'bg-white/[0.04] border border-white/[0.06] text-white/60 active:bg-white/10',
                        ].join(' ')}
                    >
                        <Icon size={16} aria-hidden />
                        <span>{meta.label}</span>
                        {count > 0 ? (
                            <span
                                className={[
                                    'min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] rounded-full font-bold',
                                    active ? 'bg-black text-[#E6C673]' : 'bg-rose-500 text-white',
                                ].join(' ')}
                            >
                                {count > 99 ? '99+' : count}
                            </span>
                        ) : null}
                    </motion.button>
                );
            })}
        </div>
    );
}
