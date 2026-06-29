import React from 'react';
import type { CriminalTrashItem } from '../../criminalCaseTrash';
import { criminalTrashItemKindLabel } from '../../criminalCaseTrash';

export type CriminalCaseTrashModalProps = {
    open: boolean;
    items: CriminalTrashItem[];
    readOnly?: boolean;
    onClose: () => void;
    onRestore: (trashItemId: string) => void;
    onPurge: (trashItemId: string) => void;
};

export const CriminalCaseTrashModal = ({
    open,
    items,
    readOnly,
    onClose,
    onRestore,
    onPurge,
}: CriminalCaseTrashModalProps) => {
    if (!open) return null;

    return (
        <div
            className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden shadow-2xl max-h-[min(88vh,720px)] flex flex-col"
            role="dialog"
            aria-modal="true"
        >
                <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3 shrink-0">
                    <div>
                        <div className="text-white font-black text-sm">سلة مهملات الإضبارة</div>
                        <p className="text-white/45 text-[11px] mt-0.5">
                            إفادات • طلبات • قرارات • أدلة • مسارات التتبع
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/60 hover:text-white transition text-xs font-bold px-2 py-1 rounded-md hover:bg-slate-700/60"
                    >
                        إغلاق
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 space-y-3">
                    {!items.length ? (
                        <div className="text-center text-white/50 text-sm font-bold py-10">السلة فارغة</div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-xl border border-slate-700/80 bg-slate-800/40 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                            >
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-slate-600/60 bg-slate-900/60 px-2 py-0.5 text-[10px] font-black text-white/65">
                                            {criminalTrashItemKindLabel(item.kind)}
                                        </span>
                                        <span className="text-white/40 text-[10px] font-bold" dir="ltr">
                                            {item.deletedAt.slice(0, 10)}
                                        </span>
                                    </div>
                                    <div className="text-white font-bold text-sm mt-1 whitespace-normal break-words">
                                        {item.label}
                                    </div>
                                </div>
                                {!readOnly ? (
                                    <div className="flex flex-wrap gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => onRestore(item.id)}
                                            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black text-emerald-200 hover:bg-emerald-500/20 transition"
                                        >
                                            ↩ استرجاع
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onPurge(item.id)}
                                            className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-[11px] font-black text-red-200 hover:bg-red-500/20 transition"
                                        >
                                            حذف نهائي
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        ))
                    )}
                </div>
            </div>
    );
};
