import React, { useCallback, useMemo } from 'react';
import { BellOff, Volume2, VolumeX, Vibrate } from '@/app/components/ui/lucideIcons';
import { useLawyerSettings, useLawyerSettingsActions } from '@/app/context/lawyerSettings/lawyerSettingsHooks';
import {
    NOTIFICATION_CHANNEL_KEYS,
    NOTIFICATION_CHANNEL_LABELS,
    NOTIFICATION_SETTINGS_DEFAULTS,
    normalizeNotificationSettings,
    patchNotificationSettings,
    sessionMuteUntilMs,
    sessionMuteUntilTomorrowMorning,
    type NotificationChannelKey,
} from '@/app/services/settings/notificationSettings';
import { isSessionMuted } from '@/app/services/notifications/notificationAlertPolicy';
import { requestHamiNotificationPermission } from '@/app/services/notifications/HamiNotificationBridge';
import { stopHamiLegalReminderAlarm } from '@/app/services/calendar/calendarReminderAlarmSound';

type NotificationAlertControlsProps = {
    open: boolean;
    onClose: () => void;
};

function ToggleRow({
    label,
    checked,
    onChange,
    testId,
}: {
    label: string;
    checked: boolean;
    onChange: (next: boolean) => void;
    testId?: string;
}) {
    return (
        <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 touch-manipulation">
            <span className="text-xs font-bold text-white/85">{label}</span>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                data-testid={testId}
                className="h-5 w-5 shrink-0 accent-[#E6C673]"
            />
        </label>
    );
}

export function NotificationAlertControls({ open, onClose }: NotificationAlertControlsProps) {
    const { settings } = useLawyerSettings();
    const { patchSettings } = useLawyerSettingsActions();
    const notifications = normalizeNotificationSettings(
        settings.notifications ?? NOTIFICATION_SETTINGS_DEFAULTS,
    );
    const muted = isSessionMuted(settings);

    const patchNotifications = useCallback(
        (patch: Parameters<typeof patchNotificationSettings>[1]) => {
            patchSettings((prev) => ({
                ...prev,
                notifications: patchNotificationSettings(
                    normalizeNotificationSettings(prev.notifications),
                    patch,
                ),
            }));
        },
        [patchSettings],
    );

    const applySessionMute = useCallback(
        (until: number | null) => {
            stopHamiLegalReminderAlarm();
            patchNotifications({ sessionMutedUntil: until });
        },
        [patchNotifications],
    );

    const channelRows = useMemo(
        () =>
            NOTIFICATION_CHANNEL_KEYS.map((channel) => ({
                channel,
                label: NOTIFICATION_CHANNEL_LABELS[channel],
                prefs: notifications.channels[channel],
            })),
        [notifications.channels],
    );

    if (!open) return null;

    return (
        <div
            className="shrink-0 border-b border-white/[0.06] bg-[#0A0F1C]/95 px-4 py-3"
            data-testid="notification-alert-controls"
            dir="rtl"
        >
            <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    {muted ? (
                        <VolumeX size={18} className="shrink-0 text-rose-400" aria-hidden />
                    ) : (
                        <Volume2 size={18} className="shrink-0 text-[#E6C673]" aria-hidden />
                    )}
                    <div className="min-w-0">
                        <p className="text-sm font-extrabold text-white truncate">تحكم التنبيهات والصوت</p>
                        <p className="text-[10px] text-white/45 truncate">
                            {muted ? 'الصوت والتنبيهات مكتومة مؤقتاً' : 'تخصيص لكل قسم'}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 text-[10px] font-bold text-white/50 touch-manipulation min-h-[44px] px-2"
                >
                    إخفاء
                </button>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-1.5">
                <button
                    type="button"
                    data-testid="notification-mute-1h"
                    onClick={() => applySessionMute(sessionMuteUntilMs(60))}
                    className="min-h-[40px] rounded-lg border border-white/10 bg-white/[0.04] text-[10px] font-extrabold text-white/80 touch-manipulation"
                >
                    كتم ساعة
                </button>
                <button
                    type="button"
                    data-testid="notification-mute-morning"
                    onClick={() => applySessionMute(sessionMuteUntilTomorrowMorning())}
                    className="min-h-[40px] rounded-lg border border-white/10 bg-white/[0.04] text-[10px] font-extrabold text-white/80 touch-manipulation"
                >
                    حتى الصباح
                </button>
                <button
                    type="button"
                    data-testid="notification-mute-off"
                    onClick={() => applySessionMute(null)}
                    className={`min-h-[40px] rounded-lg border text-[10px] font-extrabold touch-manipulation ${
                        muted
                            ? 'border-[#E6C673]/35 bg-[#E6C673]/12 text-[#E6C673]'
                            : 'border-white/10 bg-white/[0.04] text-white/80'
                    }`}
                >
                    إلغاء الكتم
                </button>
            </div>

            <div className="mb-3 space-y-1.5">
                <button
                    type="button"
                    data-testid="notification-request-permission"
                    onClick={() => {
                        void requestHamiNotificationPermission({ fromUserGesture: true });
                    }}
                    className="w-full min-h-[44px] rounded-xl border border-[#E6C673]/28 bg-[#E6C673]/10 text-xs font-extrabold text-[#E6C673] touch-manipulation"
                >
                    تفعيل إشعارات النظام على الجهاز
                </button>
                <ToggleRow
                    label="ساعات الهدوء"
                    checked={notifications.quietHours.enabled}
                    onChange={(enabled) =>
                        patchNotifications({ quietHours: { ...notifications.quietHours, enabled } })
                    }
                    testId="notification-quiet-hours"
                />
                {notifications.quietHours.enabled ? (
                    <div className="grid grid-cols-2 gap-2">
                        <label className="text-[10px] text-white/50">
                            من
                            <input
                                type="time"
                                dir="ltr"
                                value={notifications.quietHours.start}
                                onChange={(e) =>
                                    patchNotifications({
                                        quietHours: {
                                            ...notifications.quietHours,
                                            start: e.target.value,
                                        },
                                    })
                                }
                                className="mt-1 w-full min-h-[40px] rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs text-white"
                            />
                        </label>
                        <label className="text-[10px] text-white/50">
                            إلى
                            <input
                                type="time"
                                dir="ltr"
                                value={notifications.quietHours.end}
                                onChange={(e) =>
                                    patchNotifications({
                                        quietHours: {
                                            ...notifications.quietHours,
                                            end: e.target.value,
                                        },
                                    })
                                }
                                className="mt-1 w-full min-h-[40px] rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs text-white"
                            />
                        </label>
                    </div>
                ) : null}
                <ToggleRow
                    label="الصوت العام"
                    checked={notifications.soundMaster}
                    onChange={(soundMaster) => patchNotifications({ soundMaster })}
                    testId="notification-sound-master"
                />
                <ToggleRow
                    label="الاهتزاز"
                    checked={notifications.vibrateMaster}
                    onChange={(vibrateMaster) => patchNotifications({ vibrateMaster })}
                    testId="notification-vibrate-master"
                />
                <ToggleRow
                    label="السكرتير الذكي"
                    checked={notifications.secretaryEnabled}
                    onChange={(secretaryEnabled) => patchNotifications({ secretaryEnabled })}
                    testId="notification-secretary-master"
                />
            </div>

            <div className="space-y-2 max-h-[38vh] overflow-y-auto overscroll-contain touch-pan-y">
                {channelRows.map(({ channel, label, prefs }) => (
                    <ChannelBlock
                        key={channel}
                        channel={channel}
                        label={label}
                        prefs={prefs}
                        onPatch={(channelPatch) =>
                            patchNotifications({ channel, channelPatch })
                        }
                    />
                ))}
            </div>
        </div>
    );
}

function ChannelBlock({
    channel,
    label,
    prefs,
    onPatch,
}: {
    channel: NotificationChannelKey;
    label: string;
    prefs: {
        enabled: boolean;
        sound: boolean;
        push: boolean;
        inApp: boolean;
    };
    onPatch: (patch: Partial<typeof prefs>) => void;
}) {
    return (
        <div
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5"
            data-testid={`notification-channel-${channel}`}
        >
            <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold text-[#E6C673]/90">{label}</span>
                <label className="flex items-center gap-1.5 text-[10px] text-white/55 touch-manipulation">
                    <span>تفعيل</span>
                    <input
                        type="checkbox"
                        checked={prefs.enabled}
                        onChange={(e) => onPatch({ enabled: e.target.checked })}
                        className="h-4 w-4 accent-[#E6C673]"
                    />
                </label>
            </div>
            <div className="grid grid-cols-3 gap-1">
                <MiniToggle
                    icon={<Volume2 size={12} aria-hidden />}
                    label="صوت"
                    checked={prefs.sound}
                    disabled={!prefs.enabled}
                    onChange={(sound) => onPatch({ sound })}
                />
                <MiniToggle
                    icon={<BellOff size={12} aria-hidden />}
                    label="إشعار"
                    checked={prefs.push}
                    disabled={!prefs.enabled}
                    onChange={(push) => onPatch({ push })}
                />
                <MiniToggle
                    icon={<Vibrate size={12} aria-hidden />}
                    label="داخل التطبيق"
                    checked={prefs.inApp}
                    disabled={!prefs.enabled}
                    onChange={(inApp) => onPatch({ inApp })}
                />
            </div>
        </div>
    );
}

function MiniToggle({
    icon,
    label,
    checked,
    disabled,
    onChange,
}: {
    icon: React.ReactNode;
    label: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            aria-pressed={checked}
            onClick={() => onChange(!checked)}
            className={`flex min-h-[36px] flex-col items-center justify-center gap-0.5 rounded-lg border px-1 text-[9px] font-bold touch-manipulation transition-colors ${
                disabled
                    ? 'opacity-40 cursor-not-allowed border-white/5 text-white/30'
                    : checked
                      ? 'border-[#E6C673]/30 bg-[#E6C673]/10 text-[#E6C673]'
                      : 'border-white/8 bg-white/[0.03] text-white/55'
            }`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}
