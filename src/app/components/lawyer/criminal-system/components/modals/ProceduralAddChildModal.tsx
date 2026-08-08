import React from 'react';
import type { AddChildKind } from '../../proceduralContainersEngine';
import { CriminalModalPortal, CRIMINAL_MODAL_Z } from '../../criminalModalPortal';

export type ProceduralAddChildModalProps = {
    open: boolean;
    onClose: () => void;
    onPick: (kind: AddChildKind) => void;
};

const OPTIONS: { kind: Extract<AddChildKind, 'note' | 'action'>; label: string; hint: string }[] = [
    { kind: 'note', label: 'ملاحظة', hint: 'تسجيل ملاحظة أو تفصيل داخل المسار' },
    { kind: 'action', label: 'إجراء إداري', hint: 'خطوة بتاريخ وحالة متابعة' },
];

export const ProceduralAddChildModal = ({ open, onClose, onPick }: ProceduralAddChildModalProps) => {
    if (!open) return null;

    return (
        <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.procedural}>
            <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div className="text-white font-black text-sm">ملاحظة أو إجراء</div>
                    <button type="button" onClick={onClose} className="text-white/70 hover:text-white text-sm font-bold">
                        إغلاق
                    </button>
                </div>
                <div className="p-3 space-y-2">
                    {OPTIONS.map((opt) => (
                        <button
                            key={opt.kind}
                            type="button"
                            onClick={() => onPick(opt.kind)}
                            className="w-full rounded-xl border border-slate-600/60 bg-slate-800/40 px-3 py-3 text-right hover:border-[#E6C673]/50 transition"
                        >
                            <div className="text-white font-black text-sm">{opt.label}</div>
                            <div className="text-white/50 text-[10px] font-bold mt-0.5">{opt.hint}</div>
                        </button>
                    ))}
                </div>
            </div>
        </CriminalModalPortal>
    );
};
