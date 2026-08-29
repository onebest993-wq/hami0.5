import React from 'react';
import { BellOff } from '@/app/components/ui/icons/BellOff';
import { Volume2 } from '@/app/components/ui/icons/Volume2';
import { Vibrate } from '@/app/components/ui/icons/Vibrate';
import type { NotificationInboxChannelKey } from '@/app/services/settings/notificationSettings';
import { previewNotificationArrivalCue } from '@/app/services/notifications/notificationArrivalSound';

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
            className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-2 text-[9px] font-semibold leading-tight touch-manipulation ${
                disabled
                    ? 'cursor-not-allowed border-white/5 text-white/30 opacity-40'
                    : checked
                      ? 'border-white/12 bg-white/[0.06] text-[#E6C673]'
                      : 'border-white/8 bg-transparent text-white/55'
            }`}
        >
            {icon}
            <span className="whitespace-nowrap">{label}</span>
        </button>
    );
}

export function NotificationAlertChannelBlock({
    channel,
    label,
    prefs,
    onPatch,
}: {
    channel: NotificationInboxChannelKey;
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
        <div className="hami-notif-channel-card" data-testid={`notification-channel-${channel}`}>
            <div className="mb-2.5 flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold tracking-tight text-white/88">{label}</span>
                <label className="flex min-h-[44px] items-center gap-2 text-[11px] text-white/55 touch-manipulation">
                    <span>تفعيل</span>
                    <input
                        type="checkbox"
                        checked={prefs.enabled}
                        onChange={(e) => onPatch({ enabled: e.target.checked })}
                        className="h-4 w-4 accent-[#E6C673]"
                    />
                </label>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
                <MiniToggle
                    icon={<Volume2 size={13} aria-hidden />}
                    label="صوت"
                    checked={prefs.sound}
                    disabled={!prefs.enabled}
                    onChange={(sound) => {
                        onPatch({ sound });
                        if (sound) void previewNotificationArrivalCue();
                    }}
                />
                <MiniToggle
                    icon={<BellOff size={13} aria-hidden />}
                    label="إشعار"
                    checked={prefs.push}
                    disabled={!prefs.enabled}
                    onChange={(push) => onPatch({ push })}
                />
                <MiniToggle
                    icon={<Vibrate size={13} aria-hidden />}
                    label="داخل التطبيق"
                    checked={prefs.inApp}
                    disabled={!prefs.enabled}
                    onChange={(inApp) => onPatch({ inApp })}
                />
            </div>
        </div>
    );
}
