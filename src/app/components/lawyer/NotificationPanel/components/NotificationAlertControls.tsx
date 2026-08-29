import React from 'react';
import { useNotificationAlertControls } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationAlertControls';
import { NotificationAlertToggleRow } from '@/app/components/lawyer/NotificationPanel/components/NotificationAlertToggleRow';
import { NotificationAlertDndPanel } from '@/app/components/lawyer/NotificationPanel/components/NotificationAlertDndPanel';
import { NotificationAlertChannelBlock } from '@/app/components/lawyer/NotificationPanel/components/NotificationAlertChannelBlock';

/**
 * محتوى مسار alert-controls — المنتدى + النظام فقط (عرضي؛ المنطق في الـ hook).
 */
export function NotificationAlertControls() {
    const {
        notifications,
        quietHoursActive,
        mutedUntil,
        dndMode,
        setDndMode,
        muteUntilLocal,
        muteError,
        dndStatus,
        channelRows,
        minDatetimeLocal,
        patchNotifications,
        applySessionMute,
        applyMuteUntilPicked,
        setMuteUntilLocal,
        setMuteError,
        requestOsPermission,
        previewArrivalCue,
    } = useNotificationAlertControls();

    return (
        <div className="hami-notif-alert-controls shrink-0" data-testid="notification-alert-controls" dir="rtl">
            <section
                className="hami-notif-alert-section hami-notif-dnd-unified"
                aria-labelledby="notification-dnd-heading"
            >
                <h3 id="notification-dnd-heading" className="hami-notif-section-title mb-3">
                    عدم الإزعاج
                </h3>

                {dndStatus ? (
                    <p
                        className={[
                            'mb-3 rounded-xl border px-3 py-2 text-[11px] font-semibold leading-relaxed',
                            dndStatus.tone === 'active'
                                ? 'border-white/10 bg-white/[0.04] text-[#E6C673]'
                                : 'border-white/10 bg-white/[0.03] text-white/55',
                        ].join(' ')}
                        data-testid="notification-dnd-status"
                    >
                        {dndStatus.text}
                    </p>
                ) : null}

                <NotificationAlertDndPanel
                    mode={dndMode}
                    mutedUntil={mutedUntil}
                    quietHours={notifications.quietHours}
                    quietHoursActive={quietHoursActive}
                    muteUntilLocal={muteUntilLocal}
                    muteError={muteError}
                    minDatetimeLocal={minDatetimeLocal}
                    onModeChange={setDndMode}
                    onQuietHoursEnabled={(enabled) =>
                        patchNotifications({
                            quietHours: { ...notifications.quietHours, enabled },
                        })
                    }
                    onQuietHoursStart={(start) =>
                        patchNotifications({
                            quietHours: { ...notifications.quietHours, start },
                        })
                    }
                    onQuietHoursEnd={(end) =>
                        patchNotifications({
                            quietHours: { ...notifications.quietHours, end },
                        })
                    }
                    onMuteUntilLocalChange={(value) => {
                        setMuteUntilLocal(value);
                        setMuteError(null);
                    }}
                    onApplyMute={applyMuteUntilPicked}
                    onClearMute={() => applySessionMute(null)}
                />
            </section>

            <section className="hami-notif-alert-section" aria-label="إعدادات عامة">
                <button
                    type="button"
                    data-testid="notification-request-permission"
                    onClick={requestOsPermission}
                    className="mb-2 w-full min-h-[44px] rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-white/88 touch-manipulation active:bg-white/[0.07]"
                >
                    تفعيل إشعارات النظام على الجهاز
                </button>
                <div className="space-y-1.5">
                    <NotificationAlertToggleRow
                        label="الصوت العام"
                        checked={notifications.soundMaster}
                        onChange={(soundMaster) => {
                            patchNotifications({ soundMaster });
                            if (soundMaster) void previewArrivalCue();
                        }}
                        testId="notification-sound-master"
                    />
                    <NotificationAlertToggleRow
                        label="الاهتزاز"
                        checked={notifications.vibrateMaster}
                        onChange={(vibrateMaster) => patchNotifications({ vibrateMaster })}
                        testId="notification-vibrate-master"
                    />
                </div>
            </section>

            <section className="hami-notif-alert-section" aria-labelledby="notification-channels-heading">
                <h3 id="notification-channels-heading" className="hami-notif-section-title mb-2.5">
                    القنوات
                </h3>
                <div className="space-y-2">
                    {channelRows.map(({ channel, label, prefs }) => (
                        <NotificationAlertChannelBlock
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
            </section>
        </div>
    );
}
