import React from 'react';
import { NotificationAlertQuietHoursFields } from './NotificationAlertQuietHoursFields';
import { NotificationAlertOnceMuteFields } from './NotificationAlertOnceMuteFields';

export function NotificationAlertDndPanel({
    mutedUntil,
    quietHours,
    quietHoursActive,
    muteUntilLocal,
    muteError,
    minDatetimeLocal,
    onQuietHoursEnabled,
    onQuietHoursStart,
    onQuietHoursEnd,
    onMuteUntilLocalChange,
    onApplyMute,
    onClearMute,
}: {
    mutedUntil: number | null;
    quietHours: { enabled: boolean; start: string; end: string };
    quietHoursActive: boolean;
    muteUntilLocal: string;
    muteError: string | null;
    minDatetimeLocal: string;
    onQuietHoursEnabled: (enabled: boolean) => void;
    onQuietHoursStart: (start: string) => void;
    onQuietHoursEnd: (end: string) => void;
    onMuteUntilLocalChange: (value: string) => void;
    onApplyMute: () => void;
    onClearMute: () => void;
}) {
    return (
        <div id="notification-dnd-panel" className="space-y-4">
            <NotificationAlertQuietHoursFields
                quietHours={quietHours}
                quietHoursActive={quietHoursActive}
                onQuietHoursEnabled={onQuietHoursEnabled}
                onQuietHoursStart={onQuietHoursStart}
                onQuietHoursEnd={onQuietHoursEnd}
            />
            <NotificationAlertOnceMuteFields
                mutedUntil={mutedUntil}
                muteUntilLocal={muteUntilLocal}
                muteError={muteError}
                minDatetimeLocal={minDatetimeLocal}
                onMuteUntilLocalChange={onMuteUntilLocalChange}
                onApplyMute={onApplyMute}
                onClearMute={onClearMute}
            />
        </div>
    );
}
