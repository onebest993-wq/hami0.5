import React from 'react';

interface ExecutionOptionSheetProps {
    open: boolean;
    onClose: () => void;
    title: string;
    options: { value: string; label: string }[];
    selectedValue: string;
    onSelect: (value: string) => void;
}

function ExecutionOptionSheet({ open, onClose, title, options, selectedValue, onSelect }: ExecutionOptionSheetProps) {
    if (!open) return null;
    return (
        <>
            <div
                className="fixed inset-0 z-[235] bg-black/55"
                onClick={onClose}
                onKeyDown={(e) => e.key === 'Escape' && onClose()}
                role="presentation"
            />
            <div
                className="fixed inset-x-0 bottom-0 z-[236] max-h-[min(56vh,440px)] flex flex-col rounded-t-2xl border-t-2 border-emerald-500/40 bg-[#0B1120] shadow-[0_-12px_48px_rgba(0,0,0,0.55)]"
                dir="rtl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="execution-sheet-title"
            >
                <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-800">
                    <button type="button" onClick={onClose} className="text-sm text-gray-400 hover:text-white min-w-[3rem] text-right">
                        إغلاق
                    </button>
                    <span id="execution-sheet-title" className="text-sm font-bold text-emerald-400 flex-1 text-center">
                        {title}
                    </span>
                    <span className="min-w-[3rem]" />
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain p-2 pb-6 space-y-0.5">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                                onSelect(opt.value);
                                onClose();
                            }}
                            className={`w-full text-right rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                                selectedValue === opt.value
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                                    : 'text-gray-200 hover:bg-white/5 border border-transparent'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}

export default ExecutionOptionSheet;
export type { ExecutionOptionSheetProps };
