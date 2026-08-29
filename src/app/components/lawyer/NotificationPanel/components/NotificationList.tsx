import React, { memo } from 'react';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import type { TimeBucket } from '@/app/components/lawyer/NotificationPanel/types';
import { BUCKET_LABELS } from '@/app/components/lawyer/NotificationPanel/constants';
import { NotificationCard } from '@/app/components/lawyer/NotificationPanel/components/NotificationCard';
import { useNotificationListWindow } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationListWindow';
import { NOTIFICATION_LIST_CARD_SLOT_PX } from '@/app/components/lawyer/NotificationPanel/utils/notificationListWindow';

interface NotificationListProps {
    groupedByTime: Record<TimeBucket, NotificationModel[]>;
    onTap: (n: NotificationModel) => void;
    onScan: (e: React.MouseEvent) => void;
    ensureId?: string | null;
}

const BUCKET_ORDER: TimeBucket[] = ['today', 'yesterday', 'older'];

export const NotificationList = memo(function NotificationList({
    groupedByTime,
    onTap,
    onScan,
    ensureId,
}: NotificationListProps) {
    const { visible, hiddenCount, sentinelRef } = useNotificationListWindow(groupedByTime, ensureId);

    return (
        <div className="space-y-5" data-testid="notification-panel-list">
            {BUCKET_ORDER.map((bucket) => {
                const allCount = groupedByTime[bucket].length;
                const items = visible[bucket];
                if (allCount === 0 || items.length === 0) return null;
                return (
                    <section key={bucket}>
                        <h3 className="mb-2 px-1 text-[11px] font-semibold text-white/40">
                            {BUCKET_LABELS[bucket]}
                            <span className="ms-1 font-normal text-white/28">({allCount})</span>
                        </h3>
                        <div className="space-y-2">
                            {items.map((notif) => (
                                <NotificationCard
                                    key={notif.id}
                                    notification={notif}
                                    onTap={onTap}
                                    onScan={onScan}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
            {hiddenCount > 0 ? (
                <>
                    <div ref={sentinelRef} aria-hidden className="h-px w-full" />
                    <div
                        aria-hidden
                        className="pointer-events-none"
                        style={{ height: hiddenCount * NOTIFICATION_LIST_CARD_SLOT_PX }}
                    />
                </>
            ) : null}
        </div>
    );
});
