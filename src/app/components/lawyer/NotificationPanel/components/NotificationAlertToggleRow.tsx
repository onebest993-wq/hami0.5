import React from 'react';

export function NotificationAlertToggleRow({
    label,
    subLabel,
    checked,
    onChange,
    testId,
}: {
    label: string;
    subLabel?: string;
    checked: boolean;
    onChange: (next: boolean) => void;
    testId?: string;
}) {
    return (
        <label className="hami-notif-toggle-row flex min-h-[44px] cursor-pointer items-center justify-between gap-3 touch-manipulation">
            <span className="min-w-0">
                <span className="block text-xs font-semibold text-white/88">{label}</span>
                {subLabel ? (
                    <span className="mt-0.5 block text-[10px] font-medium text-white/42">{subLabel}</span>
                ) : null}
            </span>
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
