import React from 'react';
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
        <div className="shrink-0 border-b border-white/[0.06] px-4 py-3" role="presentation">
            <div
                className="hami-notif-tabs-track"
                role="tablist"
                aria-label="تصنيف الإشعارات"
                onKeyDown={onKeyDown}
            >
                {TABS.map((tab) => {
                    const meta = TAB_META[tab];
                    const count = tabCounts[tab];
                    const active = activeTab === tab;

                    return (
                        <button
                            key={tab}
                            id={`notification-tab-${tab}`}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            aria-controls="notification-panel-tabpanel"
                            tabIndex={active ? 0 : -1}
                            onClick={() => onTabChange(tab)}
                            data-testid={`notification-tab-${tab}`}
                            className={[
                                'hami-notif-tab flex min-h-[44px] flex-1 items-center justify-center gap-2 touch-manipulation',
                                active ? 'hami-notif-tab--active' : '',
                            ].join(' ')}
                        >
                            <span>{meta.label}</span>
                            {count > 0 ? (
                                <span
                                    className={[
                                        'flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                                        active ? 'bg-[#E6C673] text-[#0b1021]' : 'bg-white/12 text-white/80',
                                    ].join(' ')}
                                    aria-label={`${count} غير مقروء`}
                                >
                                    {count > 99 ? '99+' : count}
                                </span>
                            ) : null}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
