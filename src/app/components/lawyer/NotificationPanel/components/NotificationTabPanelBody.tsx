import React, { memo } from 'react';
import type { NotificationModel } from '@/app/infrastructure/notificationModel';
import type { NotificationTab } from '@/app/components/lawyer/NotificationPanel/types';
import type { NotificationPanelBodyView } from '@/app/components/lawyer/NotificationPanel/utils/resolveNotificationPanelBodyView';
import type { TimeBucket } from '@/app/components/lawyer/NotificationPanel/types';
import { NotificationEmptyState } from '@/app/components/lawyer/NotificationPanel/components/NotificationEmptyState';
import { NotificationList } from '@/app/components/lawyer/NotificationPanel/components/NotificationList';
import { NotificationLoadingState } from '@/app/components/lawyer/NotificationPanel/components/NotificationLoadingState';

type Props = {
    activeTab: NotificationTab;
    view: NotificationPanelBodyView;
    groupedByTime: Record<TimeBucket, NotificationModel[]>;
    onTap: (notification: NotificationModel) => void;
    onScan: (event: React.MouseEvent) => void;
    listActive: boolean;
    ensureId?: string | null;
};

/**
 * يعرض حالة واحدة فقط لكل تبويب — بدون AnimatePresence يُبقي empty states متعددة
 * مرئية أثناء تبديل المنتدى↔النظام.
 */
export const NotificationTabPanelBody = memo(function NotificationTabPanelBody({
    activeTab,
    view,
    groupedByTime,
    onTap,
    onScan,
    listActive,
    ensureId,
}: Props) {
    if (!listActive) return null;

    if (view === 'loading') {
        return <NotificationLoadingState />;
    }

    if (view === 'empty') {
        return <NotificationEmptyState tab={activeTab} />;
    }

    return (
        <NotificationList
            groupedByTime={groupedByTime}
            onTap={onTap}
            onScan={onScan}
            ensureId={ensureId}
        />
    );
});
