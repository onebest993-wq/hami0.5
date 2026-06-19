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
            className="flex flex-col items-center justify-center h-full text-white/25 min-h-[240px] py-12"
            data-testid="notification-panel-empty"
        >
            <Bell size={52} className="mb-5 opacity-20" aria-hidden />
            <p className="text-base font-medium text-white/35">{TAB_META[tab].emptyMessage}</p>
        </div>
    );
}
