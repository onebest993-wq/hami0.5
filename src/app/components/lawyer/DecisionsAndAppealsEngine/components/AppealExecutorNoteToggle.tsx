import React, { useState } from 'react';

type AppealExecutorNoteToggleProps = {
    note: string;
};

export function AppealExecutorNoteToggle({ note }: AppealExecutorNoteToggleProps) {
    const [open, setOpen] = useState(false);
    const trimmed = String(note ?? '').trim();
    if (!trimmed) return null;

    return (
        <div className="flex flex-col gap-1.5 text-right">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="self-end text-[11px] font-semibold text-slate-400 underline decoration-dotted underline-offset-2 transition-colors hover:text-slate-200"
            >
                {open ? 'إخفاء تسبيب المنفذ' : 'تسبيب المنفذ'}
            </button>
            {open ? (
                <p className="whitespace-pre-wrap rounded-lg border border-white/5 bg-slate-900/30 p-2.5 text-[11px] leading-relaxed text-slate-300">
                    {trimmed}
                </p>
            ) : null}
        </div>
    );
}
