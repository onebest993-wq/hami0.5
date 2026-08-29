import React from 'react';
import { NotificationAlertDndSegments } from './NotificationAlertDndSegments';
import { NotificationAlertQuietHoursFields } from './NotificationAlertQuietHoursFields';
import { NotificationAlertOnceMuteFields } from './NotificationAlertOnceMuteFields';
import type { NotificationAlertDndMode } from '@/app/components/lawyer/NotificationPanel/components/notificationAlertDndTypes';

export function NotificationAlertDndPanel({
    mode,
    mutedUntil,
    quietHours,
    quietHoursActive,
    muteUntilLocal,
    muteError,
    minDatetimeLocal,
    onModeChange,
    onQuietHoursEnabled,
    onQuietHoursStart,
    onQuietHoursEnd,
    onMuteUntilLocalChange,
    onApplyMute,
    onClearMute,
}: {
    mode: NotificationAlertDndMode;
    mutedUntil: number | null;
    quietHours: { enabled: boolean; start: string; end: string };
    quietHoursActive: boolean;
    muteUntilLocal: string;
    muteError: string | null;
    minDatetimeLocal: string;
    onModeChange: (mode: NotificationAlertDndMode) => void;
    onQuietHoursEnabled: (enabled: boolean) => void;
    onQuietHoursStart: (start: string) => void;
    onQuietHoursEnd: (end: string) => void;
    onMuteUntilLocalChange: (value: string) => void;
    onApplyMute: () => void;
    onClearMute: () => void;
}) {
    return (
        <>
            <NotificationAlertDndSegments mode={mode} onModeChange={onModeChange} />

            <div
                id="notification-dnd-panel"
                role="tabpanel"
                aria-labelledby={mode === 'schedule' ? 'notification-dnd-tab-schedule' : 'notification-dnd-tab-once'}
                className="mt-3"
            >
                {mode === 'schedule' ? (
                    <NotificationAlertQuietHoursFields
                        quietHours={quietHours}
                        quietHoursActive={quietHoursActive}
                        onQuietHoursEnabled={onQuietHoursEnabled}
                        onQuietHoursStart={onQuietHoursStart}
                        onQuietHoursEnd={onQuietHoursEnd}
                    />
                ) : (
                    <NotificationAlertOnceMuteFields
                        mutedUntil={mutedUntil}
                        muteUntilLocal={muteUntilLocal}
                        muteError={muteError}
                        minDatetimeLocal={minDatetimeLocal}
                        onMuteUntilLocalChange={onMuteUntilLocalChange}
                        onApplyMute={onApplyMute}
                        onClearMute={onClearMute}
                    />
                )}
            </div>
        </>
    );
}
