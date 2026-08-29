import React from 'react';
import type { NotificationTab } from '@/app/components/lawyer/NotificationPanel/types';
import { TAB_META } from '@/app/components/lawyer/NotificationPanel/constants';

interface NotificationEmptyStateProps {
    tab: NotificationTab;
}

export function NotificationEmptyState({ tab }: NotificationEmptyStateProps) {
    return (
        <div
            className="flex items-center justify-center px-4 py-6"
            data-testid="notification-panel-empty"
        >
            <p className="max-w-xs text-center text-sm font-medium text-white/42">
                {TAB_META[tab].emptyMessage}
            </p>
        </div>
    );
}
