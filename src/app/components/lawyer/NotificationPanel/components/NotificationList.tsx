import React from 'react';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import type { TimeBucket } from '@/app/components/lawyer/NotificationPanel/types';
import { BUCKET_LABELS } from '@/app/components/lawyer/NotificationPanel/constants';
import { NotificationCard } from '@/app/components/lawyer/NotificationPanel/components/NotificationCard';

interface NotificationListProps {
    groupedByTime: Record<TimeBucket, NotificationModel[]>;
    onTap: (n: NotificationModel) => void;
    onScan: (e: React.MouseEvent) => void;
    onClientRequest: (e: React.MouseEvent, n: NotificationModel) => void;
}

const BUCKET_ORDER: TimeBucket[] = ['today', 'yesterday', 'older'];

export function NotificationList({
    groupedByTime,
    onTap,
    onScan,
    onClientRequest,
}: NotificationListProps) {
    return (
        <div className="space-y-5" data-testid="notification-panel-list">
            {BUCKET_ORDER.map((bucket) => {
                const items = groupedByTime[bucket];
                if (items.length === 0) return null;
                return (
                    <section key={bucket}>
                        <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.14em] mb-2.5 px-1 flex items-center gap-2">
                            <span className="h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" aria-hidden />
                            {BUCKET_LABELS[bucket]}
                            <span className="text-white/30 font-normal normal-case tracking-normal">({items.length})</span>
                            <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" aria-hidden />
                        </h3>
                        <div className="space-y-2">
                            {items.map((notif) => (
                                <NotificationCard
                                    key={notif.id}
                                    notification={notif}
                                    onTap={onTap}
                                    onScan={onScan}
                                    onClientRequest={onClientRequest}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
