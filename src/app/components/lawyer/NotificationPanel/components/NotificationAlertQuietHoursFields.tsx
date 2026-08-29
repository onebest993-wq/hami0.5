import React from 'react';
import { NotificationAlertToggleRow } from './NotificationAlertToggleRow';
import { openNativeDatetimePicker } from '@/app/components/lawyer/NotificationPanel/utils/openNativeDatetimePicker';

export function NotificationAlertQuietHoursFields({
    quietHours,
    quietHoursActive,
    onQuietHoursEnabled,
    onQuietHoursStart,
    onQuietHoursEnd,
}: {
    quietHours: { enabled: boolean; start: string; end: string };
    quietHoursActive: boolean;
    onQuietHoursEnabled: (enabled: boolean) => void;
    onQuietHoursStart: (start: string) => void;
    onQuietHoursEnd: (end: string) => void;
}) {
    return (
        <div className="space-y-2">
            <NotificationAlertToggleRow
                label="تفعيل ساعات الهدوء"
                subLabel={
                    quietHours.enabled
                        ? quietHoursActive
                            ? `نشطة الآن — ${quietHours.start}–${quietHours.end}`
                            : `${quietHours.start}–${quietHours.end}`
                        : undefined
                }
                checked={quietHours.enabled}
                onChange={onQuietHoursEnabled}
                testId="notification-quiet-hours"
            />
            {quietHours.enabled ? (
                <div className="grid grid-cols-2 gap-2 px-0.5">
                    <label className="text-[10px] text-white/50">
                        من
                        <input
                            type="time"
                            dir="ltr"
                            enterKeyHint="done"
                            data-testid="notification-quiet-hours-start"
                            value={quietHours.start}
                            onChange={(e) => onQuietHoursStart(e.target.value)}
                            onFocus={(e) => openNativeDatetimePicker(e.currentTarget)}
                            className="hami-notif-datetime mt-1 w-full min-h-[44px] rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs text-white"
                        />
                    </label>
                    <label className="text-[10px] text-white/50">
                        إلى
                        <input
                            type="time"
                            dir="ltr"
                            enterKeyHint="done"
                            data-testid="notification-quiet-hours-end"
                            value={quietHours.end}
                            onChange={(e) => onQuietHoursEnd(e.target.value)}
                            onFocus={(e) => openNativeDatetimePicker(e.currentTarget)}
                            className="hami-notif-datetime mt-1 w-full min-h-[44px] rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs text-white"
                        />
                    </label>
                </div>
            ) : null}
        </div>
    );
}
