import React from 'react';
import { formatMuteUntilLabel } from '@/app/components/lawyer/NotificationPanel/utils/formatMuteUntilLabel';
import { openNativeDatetimePicker } from '@/app/components/lawyer/NotificationPanel/utils/openNativeDatetimePicker';

export function NotificationAlertOnceMuteFields({
    mutedUntil,
    muteUntilLocal,
    muteError,
    minDatetimeLocal,
    onMuteUntilLocalChange,
    onApplyMute,
    onClearMute,
}: {
    mutedUntil: number | null;
    muteUntilLocal: string;
    muteError: string | null;
    minDatetimeLocal: string;
    onMuteUntilLocalChange: (value: string) => void;
    onApplyMute: () => void;
    onClearMute: () => void;
}) {
    if (mutedUntil) {
        return (
            <div className="hami-notif-dnd-active-once space-y-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3">
                <p className="text-[11px] font-medium leading-relaxed text-white/70">
                    التنبيهات مكتومة حتى{' '}
                    <span className="font-bold text-[#E6C673]">
                        {formatMuteUntilLabel(mutedUntil)}
                    </span>
                </p>
                <button
                    type="button"
                    data-testid="notification-mute-off"
                    onClick={onClearMute}
                    className="w-full min-h-[44px] rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white touch-manipulation"
                >
                    إلغاء الكتم
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <label className="block text-[11px] font-medium text-white/50">
                موعد إعادة التفعيل
                    <input
                        type="datetime-local"
                        dir="ltr"
                        enterKeyHint="done"
                        data-testid="notification-mute-until"
                        min={minDatetimeLocal}
                        value={muteUntilLocal}
                        onChange={(e) => onMuteUntilLocalChange(e.target.value)}
                        onFocus={(e) => openNativeDatetimePicker(e.currentTarget)}
                        className="hami-notif-datetime mt-1.5 w-full min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white"
                    />
            </label>
            {muteError ? (
                <p className="text-[11px] font-medium text-rose-300" role="alert">
                    {muteError}
                </p>
            ) : null}
            <button
                type="button"
                data-testid="notification-mute-apply"
                onClick={onApplyMute}
                className="w-full min-h-[44px] rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/90 touch-manipulation"
            >
                كتم حتى الموعد
            </button>
        </div>
    );
}
