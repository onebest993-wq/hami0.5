import React, { useMemo } from 'react';
import type { CriminalDefendant, StageConclusion } from '../../criminalStore';
import { filterSelectableDefendantsForScope } from '../../partyPersonalStage';
import { isDefendantStatus } from './investigationDecisionModalValidation';

type DefendantStatus = StageConclusion['defendantStatusAtDecision'];

type DefendantScopeWithStatusPickerProps = {
    defendants: CriminalDefendant[];
    selectedIds: string[];
    onToggle: (id: string, next: boolean) => void;
    statuses: Record<string, DefendantStatus>;
    onStatusChange: (id: string, status: DefendantStatus) => void;
};

export const InvestigationDecisionDefendantScopePicker = ({
    defendants,
    selectedIds,
    onToggle,
    statuses,
    onStatusChange,
}: DefendantScopeWithStatusPickerProps) => {
    const selectable = useMemo(() => filterSelectableDefendantsForScope(defendants), [defendants]);

    if (!selectable.length) {
        return (
            <div
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100 text-xs font-bold whitespace-normal break-words"
                dir="rtl"
            >
                لا يوجد متهمون قابلون للإدراج في الإحالة.
            </div>
        );
    }

    if (selectable.length <= 1) {
        return null;
    }

    return (
        <div
            className="rounded-xl border border-slate-700/80 bg-slate-800/30 backdrop-blur-sm p-3 space-y-2 shadow-inner shadow-black/20"
            dir="rtl"
        >
            <div className="flex items-center justify-between gap-2">
                <div className="text-white font-black text-xs">المتهمون المشمولون بالإحالة</div>
                <div className="text-white/50 text-[10px] font-bold">
                    {selectedIds.length} / {selectable.length}
                </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectable.map((d) => {
                    const checked = selectedIds.includes(d.id);
                    return (
                        <div
                            key={d.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5"
                        >
                            <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => onToggle(d.id, e.target.checked)}
                                    className="accent-[#E6C673]"
                                />
                                <span className="text-white text-xs font-bold truncate">{d.fullName}</span>
                            </label>
                            {checked ? (
                                <select
                                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white outline-none focus:border-[#E6C673]/60 shrink-0"
                                    value={statuses[d.id] ?? 'bailed'}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        if (isDefendantStatus(v)) onStatusChange(d.id, v);
                                    }}
                                >
                                    <option value="detained">موقوف</option>
                                    <option value="bailed">مكفل</option>
                                    <option value="fugitive">هارب</option>
                                </select>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/** مودال إحالة مرحلة التحقيق إلى محكمة الموضوع — غلق/انقضاء/صلح عبر «قرارات القاضي». */
