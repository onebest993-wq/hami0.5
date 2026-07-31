import React, { useMemo } from 'react';
import { useCriminalStore } from '../../criminalStore';
import {
    buildMergeCaseTargetOptions,
    resolveMergedChildIdsForTargetPicker,
    lookupCaseInMapForMerge,
} from '../../caseMergeTimeline';

export type MergeCaseModalProps = {
    open: boolean;
    parentCaseId: string;
    parentCaseTitle: string;
    mergeTargetCaseId: string;
    mergeReason: string;
    onTargetChange: (caseId: string) => void;
    onReasonChange: (reason: string) => void;
    onClose: () => void;
    onSubmit: () => void;
};

export const MergeCaseModal = ({
    open,
    parentCaseId,
    parentCaseTitle,
    mergeTargetCaseId,
    mergeReason,
    onTargetChange,
    onReasonChange,
    onClose,
    onSubmit,
}: MergeCaseModalProps) => {
    const casesById = useCriminalStore((s) => s.casesById);

    const mergeTargets = useMemo(() => {
        if (!open || !parentCaseId.trim()) return [];
        const parent = lookupCaseInMapForMerge(casesById, parentCaseId);
        const mergedChildIds = resolveMergedChildIdsForTargetPicker(parent, parentCaseId, casesById);
        return buildMergeCaseTargetOptions(casesById, parentCaseId, mergedChildIds);
    }, [open, parentCaseId, casesById]);

    if (!open) return null;

    const canSubmit = mergeTargetCaseId.trim().length > 0 && mergeReason.trim().length > 0;

    return (
        <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div className="text-white font-black text-sm whitespace-normal break-words">ضم وتوحيد مع إضبارة أخرى</div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words"
                    >
                        إغلاق
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <p className="text-white/55 text-xs whitespace-normal break-words">
                        الإضبارة الحالية (الأم): <span className="text-white/80 font-bold">{parentCaseTitle}</span> — اختر
                        الإضبارة التي تُضمّ إليها (نفس المرحلة الإجرائية فقط).
                    </p>
                    {mergeTargets.length === 0 ? (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-100 text-xs font-bold whitespace-normal break-words">
                            لا توجد أضابير أخرى في نفس المرحلة متاحة للضم حالياً. يمكنك إضافة ضم إضافي لاحقاً عند توفر
                            إضبارة مطابقة.
                        </div>
                    ) : null}
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            الإضبارة المضمومة (ب)
                        </label>
                        <select
                            disabled={mergeTargets.length === 0}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 disabled:opacity-50"
                            value={mergeTargetCaseId}
                            onChange={(e) => onTargetChange(e.target.value)}
                        >
                            <option value="" className="bg-slate-900 text-white">
                                اختر الإضبارة...
                            </option>
                            {mergeTargets.map((t) => (
                                <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                                    {t.selectLabel}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            سبب الضم / قرار التوحيد
                        </label>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[120px] resize-none"
                            value={mergeReason}
                            onChange={(e) => onReasonChange(e.target.value)}
                            placeholder="اكتب سبب ضم الأضابير وتوحيدها..."
                        />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={!canSubmit}
                            className="rounded-lg bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words"
                        >
                            تنفيذ الضم
                        </button>
                    </div>
                </div>
        </div>
    );
};
