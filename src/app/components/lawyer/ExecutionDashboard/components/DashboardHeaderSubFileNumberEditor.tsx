import React from 'react';

export function DashboardHeaderSubFileNumberEditor({
    subFileRefFilled,
    subFileRefDisplay,
    subFileNumberEditorOpen,
    setSubFileNumberEditorOpen,
    subFileNumberDraft,
    setSubFileNumberDraft,
    subFileYearDraft,
    setSubFileYearDraft,
    onSave,
}: {
    subFileRefFilled: boolean;
    subFileRefDisplay: string;
    subFileNumberEditorOpen: boolean;
    setSubFileNumberEditorOpen: React.Dispatch<React.SetStateAction<boolean>>;
    subFileNumberDraft: string;
    setSubFileNumberDraft: (v: string) => void;
    subFileYearDraft: string;
    setSubFileYearDraft: (v: string) => void;
    onSave: (e?: React.MouseEvent) => void;
}) {
    return (
        <>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setSubFileNumberEditorOpen((v) => !v);
                }}
                className={`pointer-events-auto shrink-0 tabular-nums text-[1.0625rem] font-bold leading-none transition-colors sm:text-lg ${
                    subFileRefFilled
                        ? 'text-indigo-200/95 hover:text-indigo-100'
                        : 'animate-pulse text-indigo-200/70 hover:text-indigo-100'
                }`}
                title="رقم الإضبارة الفرعية — اضغط للتعديل"
            >
                {subFileRefFilled ? subFileRefDisplay : 'رقم الإضبارة الفرعية'}
            </button>
            {subFileNumberEditorOpen ? (
                <div
                    className="pointer-events-auto mt-2 w-full min-w-[220px] rounded-xl border border-indigo-400/35 bg-[#0B1120]/90 p-2.5 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-400/20"
                    onClick={(e) => e.stopPropagation()}
                    dir="rtl"
                >
                    <p className="mb-2 text-center text-[10px] font-bold text-indigo-200/90">
                        رقم الإضبارة الفرعية
                    </p>
                    <div className="flex items-center justify-center gap-2">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={subFileNumberDraft}
                            onChange={(e) => setSubFileNumberDraft(e.target.value)}
                            placeholder="الرقم"
                            className="w-20 rounded-lg border border-indigo-500/30 bg-black/30 px-2 py-1.5 text-center text-sm font-bold text-white outline-none focus:border-indigo-400/60"
                        />
                        <span className="text-indigo-300/70">/</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={subFileYearDraft}
                            onChange={(e) => setSubFileYearDraft(e.target.value)}
                            placeholder="السنة"
                            className="w-16 rounded-lg border border-indigo-500/30 bg-black/30 px-2 py-1.5 text-center text-sm font-bold text-white outline-none focus:border-indigo-400/60"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={(e) => onSave(e)}
                        className="mt-2 w-full min-h-[44px] rounded-lg border border-emerald-500/35 bg-emerald-950/45 py-1.5 text-[10px] font-bold text-emerald-100 hover:bg-emerald-950/60 touch-manipulation"
                    >
                        حفظ الرقم
                    </button>
                </div>
            ) : null}
        </>
    );
}
