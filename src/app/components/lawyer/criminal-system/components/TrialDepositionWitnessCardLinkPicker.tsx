import React from 'react';
import type { LinkableStatementEntry } from '../statementLinking';
import { LinkedStatementReplica } from './TrialDepositionWitnessCardReplicas';

export type TrialDepositionLinkPickerState = {
    trialExcerpt?: string;
};

export type TrialDepositionWitnessCardLinkPickerProps = {
    linkPicker: TrialDepositionLinkPickerState;
    pickerEntries: LinkableStatementEntry[];
    linkedIds: Set<string>;
    onSaveLink: (entry: LinkableStatementEntry) => void;
    onCancel: () => void;
};

export function TrialDepositionWitnessCardLinkPicker({
    linkPicker,
    pickerEntries,
    linkedIds,
    onSaveLink,
    onCancel,
}: TrialDepositionWitnessCardLinkPickerProps) {
    return (
        <div className="rounded-xl border border-orange-500/45 bg-slate-950/60 p-3 space-y-3">
            <div className="text-orange-200/90 text-[11px] font-black">
                {linkPicker.trialExcerpt
                    ? 'اختر الإفادة المراد ربط المقطع بها'
                    : 'اختر إفادة موجودة للمقارنة'}
            </div>
            {linkPicker.trialExcerpt ? (
                <div className="rounded-lg border border-[#E6C673]/35 bg-[#E6C673]/5 px-3 py-2 text-xs text-white/85 whitespace-pre-wrap break-words">
                    <span className="text-[#E6C673]/90 font-black text-[10px] block mb-1">المقطع المحدّد:</span>
                    {linkPicker.trialExcerpt}
                </div>
            ) : null}
            {pickerEntries.length === 0 ? (
                <p className="text-white/40 text-[10px] font-bold">لا توجد إفادات أخرى مسجّلة للربط.</p>
            ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto overscroll-contain">
                    {pickerEntries.map((entry) => {
                        const key = `${entry.kind}:${entry.record.id}`;
                        const alreadyLinked = linkedIds.has(key) && !linkPicker.trialExcerpt;
                        return (
                            <div
                                key={key}
                                className="rounded-xl border border-slate-700/55 bg-slate-900/45 p-3 space-y-2"
                            >
                                <LinkedStatementReplica entry={entry} compact />
                                <button
                                    type="button"
                                    disabled={alreadyLinked}
                                    onClick={() => onSaveLink(entry)}
                                    className="rounded-md border border-orange-500/40 px-2.5 py-1 text-[10px] font-black text-orange-100 hover:bg-orange-950/30 transition disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    {alreadyLinked ? 'مربوطة مسبقاً' : '🔗 ربط للمقارنة'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg border border-slate-600/60 px-3 py-1.5 text-[10px] font-black text-white/60"
                >
                    إلغاء
                </button>
            </div>
        </div>
    );
}
