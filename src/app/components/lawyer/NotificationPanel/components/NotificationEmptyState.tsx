import React from 'react';
import { Bell } from '@/app/components/ui/lucideIcons';
import type { NotificationTab } from '@/app/components/lawyer/NotificationPanel/types';
import { TAB_META } from '@/app/components/lawyer/NotificationPanel/constants';

interface NotificationEmptyStateProps {
    tab: NotificationTab;
}

export function NotificationEmptyState({ tab }: NotificationEmptyStateProps) {
    return (
        <div
            className="flex h-full min-h-[min(52dvh,320px)] flex-col items-center justify-center px-6 py-12 text-white/25"
            data-testid="notification-panel-empty"
        >
            <div className="hami-notif-empty-orb mb-5">
                <Bell size={34} className="text-[#E6C673]/45" aria-hidden />
            </div>
            <p className="max-w-xs text-center text-base font-semibold text-white/50">
                {TAB_META[tab].emptyMessage}
            </p>
            <p className="mt-2 max-w-xs text-center text-xs text-white/30">
                الإشعارات الواردة فقط — بدون إجراءات ذاتية
            </p>
        </div>
    );
}
