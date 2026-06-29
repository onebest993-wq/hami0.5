import React from 'react';

import { motion } from 'motion/react';

import type { NotificationTab } from '@/app/components/lawyer/NotificationPanel/types';

import { TAB_META } from '@/app/components/lawyer/NotificationPanel/constants';



interface NotificationTabsProps {

    activeTab: NotificationTab;

    onTabChange: (tab: NotificationTab) => void;

    tabCounts: { forum: number; system: number };

}



const TABS: NotificationTab[] = ['forum', 'system'];



export function NotificationTabs({ activeTab, onTabChange, tabCounts }: NotificationTabsProps) {

    const onKeyDown = (event: React.KeyboardEvent) => {

        const idx = TABS.indexOf(activeTab);

        if (idx < 0) return;

        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {

            event.preventDefault();

            const delta = event.key === 'ArrowLeft' ? 1 : -1;

            const next = TABS[(idx + delta + TABS.length) % TABS.length]!;

            onTabChange(next);

            document.getElementById(`notification-tab-${next}`)?.focus();

        }

    };



    return (

        <div className="shrink-0 px-4 py-3 border-b border-white/[0.06]" role="presentation">

            <div

                className="flex p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06] gap-1"

                role="tablist"

                aria-label="تصنيف الإشعارات"

                onKeyDown={onKeyDown}

            >

                {TABS.map((tab) => {

                    const meta = TAB_META[tab];

                    const Icon = meta.icon;

                    const count = tabCounts[tab];

                    const active = activeTab === tab;



                    return (

                        <motion.button

                            key={tab}

                            id={`notification-tab-${tab}`}

                            type="button"

                            role="tab"

                            aria-selected={active}

                            aria-controls="notification-panel-tabpanel"

                            tabIndex={active ? 0 : -1}

                            onClick={() => onTabChange(tab)}

                            whileTap={{ scale: 0.98 }}

                            data-testid={`notification-tab-${tab}`}

                            className={[

                                'relative flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm min-h-[44px] transition-colors',

                                active

                                    ? 'bg-[#0A0F1C]/90 text-white font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'

                                    : 'text-white/50 hover:text-white/75',

                            ].join(' ')}

                        >

                            {active ? (

                                <span

                                    className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-[#E6C673]/80"

                                    aria-hidden

                                />

                            ) : null}

                            <Icon size={16} aria-hidden className={active ? 'text-[#E6C673]' : undefined} />

                            <span>{meta.label}</span>

                            {count > 0 ? (

                                <span

                                    className={[

                                        'min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] rounded-full font-bold',

                                        active ? 'bg-[#E6C673] text-black' : 'bg-rose-500 text-white',

                                    ].join(' ')}

                                    aria-label={`${count} غير مقروء`}

                                >

                                    {count > 99 ? '99+' : count}

                                </span>

                            ) : null}

                        </motion.button>

                    );

                })}

            </div>

        </div>

    );

}

