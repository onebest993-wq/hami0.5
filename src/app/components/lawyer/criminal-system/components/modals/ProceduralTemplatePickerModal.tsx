import React from 'react';
import { SANDBOX_TEMPLATES, type SandboxTemplateId } from '../../proceduralSandboxToolkit';

export type ProceduralTemplatePickerModalProps = {
    open: boolean;
    onClose: () => void;
    onPick: (templateId: SandboxTemplateId) => void;
};

export const ProceduralTemplatePickerModal = ({ open, onClose, onPick }: ProceduralTemplatePickerModalProps) => {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[222] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"
            dir="rtl"
        >
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                    <div className="text-white font-black text-sm">قوالب اختيارية (فارغة)</div>
                    <p className="text-white/50 text-[10px] font-bold mt-1">
                        تُضاف للوحة الحالية — عدّل أو احذف ما لا يناسبك. ليست تصنيفات قانونية جاهزة.
                    </p>
                </div>
                <div className="p-3 space-y-2">
                    {SANDBOX_TEMPLATES.map((tpl) => (
                        <button
                            key={tpl.id}
                            type="button"
                            onClick={() => onPick(tpl.id)}
                            className="w-full rounded-xl border border-slate-600/60 bg-slate-800/40 px-3 py-3 text-right hover:border-[#E6C673]/50 transition"
                        >
                            <div className="text-white font-black text-sm">{tpl.title}</div>
                            <div className="text-white/50 text-[10px] font-bold mt-0.5">{tpl.hint}</div>
                        </button>
                    ))}
                </div>
                <div className="p-3 border-t border-slate-700 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-white/75"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
};
