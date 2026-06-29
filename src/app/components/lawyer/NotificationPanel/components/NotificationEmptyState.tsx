import React from 'react';
import { Bell } from 'lucide-react';
import type { NotificationTab } from '@/app/components/lawyer/NotificationPanel/types';
import { TAB_META } from '@/app/components/lawyer/NotificationPanel/constants';

interface NotificationEmptyStateProps {
    tab: NotificationTab;
}

export function NotificationEmptyState({ tab }: NotificationEmptyStateProps) {
    return (
        <div
            className="flex flex-col items-center justify-center h-full text-white/25 min-h-[240px] py-12 px-6"
            data-testid="notification-panel-empty"
        >
            <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
                <Bell size={36} className="text-[#E6C673]/35" aria-hidden />
            </div>
            <p className="text-base font-semibold text-white/45 text-center">{TAB_META[tab].emptyMessage}</p>
        </div>
    );
}
