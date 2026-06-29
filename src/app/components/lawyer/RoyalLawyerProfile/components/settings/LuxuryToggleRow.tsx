import React from 'react';

export function LuxuryToggleRow({
    label,
    checked,
    onChange,
    hint,
    testId,
}: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    hint?: string;
    testId?: string;
}) {
    return (
        <button
            type="button"
            data-testid={testId}
            onClick={() => onChange(!checked)}
            className="w-full flex items-center justify-between gap-3 py-3 px-1 text-right min-h-[44px]"
        >
            <div className="min-w-0">
                <p className="text-sm font-semibold text-white/92">{label}</p>
                {hint ? <p className="text-[10px] text-white/38 mt-0.5 leading-relaxed">{hint}</p> : null}
            </div>
            <span className="profile-settings-luxury-toggle" data-on={checked ? 'true' : 'false'} aria-hidden>
                <span className="profile-settings-luxury-toggle-thumb" />
            </span>
        </button>
    );
}
