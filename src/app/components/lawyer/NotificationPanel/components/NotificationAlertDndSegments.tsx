import React from 'react';
import type { NotificationAlertDndMode } from '@/app/components/lawyer/NotificationPanel/components/notificationAlertDndTypes';

export function NotificationAlertDndSegments({
    mode,
    onModeChange,
}: {
    mode: NotificationAlertDndMode;
    onModeChange: (mode: NotificationAlertDndMode) => void;
}) {
    return (
        <div
            className="hami-notif-dnd-segments"
            role="tablist"
            aria-label="نوع عدم الإزعاج"
        >
            <button
                type="button"
                role="tab"
                id="notification-dnd-tab-schedule"
                aria-selected={mode === 'schedule'}
                aria-controls="notification-dnd-panel"
                data-testid="notification-dnd-tab-schedule"
                onClick={() => onModeChange('schedule')}
                className={[
                    'hami-notif-tab min-h-[44px] flex-1 touch-manipulation',
                    mode === 'schedule' ? 'hami-notif-tab--active' : '',
                ].join(' ')}
            >
                يومي
            </button>
            <button
                type="button"
                role="tab"
                id="notification-dnd-tab-once"
                aria-selected={mode === 'once'}
                aria-controls="notification-dnd-panel"
                data-testid="notification-dnd-tab-once"
                onClick={() => onModeChange('once')}
                className={[
                    'hami-notif-tab min-h-[44px] flex-1 touch-manipulation',
                    mode === 'once' ? 'hami-notif-tab--active' : '',
                ].join(' ')}
            >
                مؤقت
            </button>
        </div>
    );
}
