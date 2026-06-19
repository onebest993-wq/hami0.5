import React from 'react';

export type AppealDeadlineLapsePanelProps = {
    message: string;
    onEndDeadline: () => void;
    btnPrimaryClass: string;
};

export function AppealDeadlineLapsePanel({
    message,
    onEndDeadline,
    btnPrimaryClass,
}: AppealDeadlineLapsePanelProps) {
    return (
        <div className="min-h-0 space-y-2 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-3">
            <p className="text-[10px] leading-relaxed text-amber-100/90">{message}</p>
            <button type="button" onClick={onEndDeadline} className={btnPrimaryClass}>
                إنهاء المدة
            </button>
        </div>
    );
}
