import React from 'react';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { isExecutorRowRejectedAndFinal } from '@/app/utils/executorSeizureDecisionQueue';
import {
    isExecutorRowApprovedWorkflowActive,
    resolveExecutorRequestAppealSyncFromRow,
} from '@/app/utils/executorRequestAppealSync';
import {
    SPECIFIC_DELIVERY_MOVABLE_VALUATION_TITLE,
} from '@/app/utils/specificDeliveryMovableValuationRequest';
import { formatNumberInput } from '@/app/utils/execution/amountInput';
import {
    expertCommitteeSizeLabelAr,
} from '@/app/components/lawyer/ExecutionDashboard/utils/expertCommitteeUtils';

export interface SpecificDeliveryMovableValuationExpertPanelProps {
    row: Record<string, unknown> | null;
    executionId: string;
    decisionRows: Record<string, unknown>[];
    savedAt: string;
    reportSavedAt: string;
    requiredExperts: number;
    valuedItemLabel: string;
    expertNames: string;
    setExpertNames: React.Dispatch<React.SetStateAction<string>>;
    expertNameSlots: string[];
    setExpertNameSlots: React.Dispatch<React.SetStateAction<string[]>>;
    estimatedValueInput: string;
    setEstimatedValueInput: React.Dispatch<React.SetStateAction<string>>;
    partyDecisionLane: 'choose' | 'approve' | 'objection';
    setPartyDecisionLane: React.Dispatch<React.SetStateAction<'choose' | 'approve' | 'objection'>>;
    openAppeals: (decisionId: string) => void;
    saveExpertReport: () => void;
    submitExpertObjection: (objectionKind: 'report' | 'experts') => void;
    financializeAfterReportApproval: () => void | Promise<void>;
    sectionConfirmDialog: React.ReactNode;
}

export function SpecificDeliveryMovableValuationExpertPanel({
    row,
    executionId,
    decisionRows,
    savedAt,
    reportSavedAt,
    requiredExperts,
    valuedItemLabel,
    expertNames,
    setExpertNames,
    expertNameSlots,
    setExpertNameSlots,
    estimatedValueInput,
    setEstimatedValueInput,
    partyDecisionLane,
    setPartyDecisionLane,
    openAppeals,
    saveExpertReport,
    submitExpertObjection,
    financializeAfterReportApproval,
    sectionConfirmDialog,
}: SpecificDeliveryMovableValuationExpertPanelProps): React.ReactNode {
    if (!row?.id) return null;
    const decisionId = String(row.id || '').trim();
    const rejected = isExecutorRowRejectedAndFinal(row);
    const approved = isExecutorRowApprovedWorkflowActive(row, decisionRows);
    const pending =
        String(row.executorOutcome ?? 'pending') === 'pending' ||
        String(row.executorOutcome ?? '') === '';
    const appealSync = resolveExecutorRequestAppealSyncFromRow(row, decisionRows);

    if (savedAt && approved && !rejected) {
        return null;
    }

    const steps: ExecutionInlineStep[] = [
        {
            id: `${decisionId}:sent`,
            title: SPECIFIC_DELIVERY_MOVABLE_VALUATION_TITLE,
            subtitle: 'تم إرسال الطلب',
            status: 'done',
            tone: 'success',
        },
        {
            id: `${decisionId}:executor`,
            title: 'قرار المنفذ على الانتداب',
            subtitle: rejected
                ? 'تم رفض الطلب'
                : approved
                  ? reportSavedAt
                      ? 'تمت الموافقة — التقرير مسجّل'
                      : 'تمت الموافقة — أكمل تقرير الخبراء'
                  : pending
                    ? 'قيد البت'
                    : '—',
            status: rejected || pending ? 'active' : 'done',
            tone: rejected ? 'danger' : approved ? 'success' : 'neutral',
            content: rejected ? (
                <ExecutionInlineExecutorDecisionActions
                    executionId={executionId}
                    decisionId={decisionId}
                    requestKind="special_followup"
                    disabled
                    onOpenAppealCenter={() => openAppeals(decisionId)}
                />
            ) : pending ? (
                <ExecutionInlineExecutorDecisionActions
                    executionId={executionId}
                    decisionId={decisionId}
                    requestKind="special_followup"
                />
            ) : null,
        },
    ];

    if (approved && !rejected && !savedAt) {
        steps.push({
            id: `${decisionId}:valuation`,
            title: 'تقرير لجنة الخبراء',
            subtitle: reportSavedAt
                ? expertCommitteeSizeLabelAr(requiredExperts)
                : 'بعد موافقة المنفذ',
            status: reportSavedAt ? 'done' : 'active',
            tone: 'neutral',
            content: reportSavedAt ? null : (
                <div className="space-y-2.5">
                    <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-right">
                        <p className="text-[9px] font-bold text-slate-500">الشيء المراد تقديره</p>
                        <p className="text-[11px] font-bold text-slate-100">{valuedItemLabel || '—'}</p>
                        <p className="mt-0.5 text-[9px] text-[#E6C673]/85">منقول</p>
                    </div>
                    <label className="block text-[9px] text-slate-400 text-right">
                        {expertCommitteeSizeLabelAr(requiredExperts)}
                    </label>
                    {requiredExperts <= 1 ? (
                        <input
                            type="text"
                            value={expertNames}
                            onChange={(e) => setExpertNames(e.target.value)}
                            placeholder="اسم الخبير"
                            dir="rtl"
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white text-right focus:border-[#E6C673]/45 focus:outline-none"
                        />
                    ) : (
                        <div className="space-y-2">
                            {expertNameSlots.map((slot, idx) => (
                                <input
                                    key={`expert_slot_${idx}`}
                                    type="text"
                                    value={slot}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setExpertNameSlots((prev) => {
                                            const next = [...prev];
                                            next[idx] = v;
                                            return next;
                                        });
                                    }}
                                    placeholder={`اسم الخبير ${idx + 1}`}
                                    dir="rtl"
                                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white text-right focus:border-[#E6C673]/45 focus:outline-none"
                                />
                            ))}
                        </div>
                    )}
                    <input
                        type="text"
                        inputMode="decimal"
                        value={estimatedValueInput}
                        onChange={(e) => setEstimatedValueInput(formatNumberInput(e.target.value))}
                        placeholder="القيمة المقدرة (د.ع)"
                        dir="ltr"
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white text-right tabular-nums focus:border-[#E6C673]/45 focus:outline-none"
                    />
                    <p className="text-[9px] text-slate-500 text-right leading-relaxed">
                        تُحقَن في المركز المالي (إجمالي الدين) بعد اعتماد التقرير في الخطوة التالية.
                    </p>
                    <button
                        type="button"
                        onClick={saveExpertReport}
                        className="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[11px] font-extrabold text-emerald-200 hover:bg-emerald-500/15"
                    >
                        حفظ تقرير الخبراء
                    </button>
                </div>
            ),
        });

        if (reportSavedAt) {
            const laneBtnCls = (lane: typeof partyDecisionLane, tone: string) =>
                `w-full rounded-xl border px-3 py-2 text-[11px] font-extrabold transition-all ${tone} ${
                    partyDecisionLane === lane
                        ? 'ring-2 ring-[#E6C673]/70 ring-offset-1 ring-offset-[#05060D]'
                        : ''
                }`;

            steps.push({
                id: `${decisionId}:parties`,
                title: 'اعتماد التقرير أو الاعتراض',
                subtitle: appealSync.enforced
                    ? 'انتهت دورة الطعن — اختر اعتماد أو اعتراض'
                    : 'يمكن اعتماد التقرير وتحويل القيمة للمركز المالي أو الاعتراض (1 → 3 → 5 خبراء)',
                status: 'active',
                tone: 'neutral',
                content: (
                    <div className="space-y-2.5">
                        {partyDecisionLane === 'choose' ? (
                            <div className="space-y-2 rounded-2xl border border-white/10 bg-black/15 p-3">
                                <p className="text-[9px] text-slate-400 text-right leading-relaxed">
                                    اختر مسار البت في التقرير
                                </p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => setPartyDecisionLane('approve')}
                                        className={laneBtnCls(
                                            'approve',
                                            'border-emerald-500/35 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15'
                                        )}
                                    >
                                        اعتماد التقرير وتحويل القيمة للمركز المالي
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPartyDecisionLane('objection')}
                                        className={laneBtnCls(
                                            'objection',
                                            'border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15'
                                        )}
                                    >
                                        اعتراض على التقرير
                                    </button>
                                </div>
                            </div>
                        ) : partyDecisionLane === 'objection' ? (
                            <div className="space-y-2 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-3">
                                <p className="text-[9px] text-amber-300/90 text-right">
                                    مسار الاعتراض — تُزاد اللجنة (1 → 3 → 5) وتُعاد كتابة التقرير
                                </p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => submitExpertObjection('report')}
                                        className="w-full rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[11px] font-extrabold text-rose-100 hover:bg-rose-500/15"
                                    >
                                        اعتراض على التقرير (زيادة اللجنة)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => submitExpertObjection('experts')}
                                        className="w-full rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] font-extrabold text-amber-100 hover:bg-amber-500/15"
                                    >
                                        اعتراض على الخبراء (استبدال)
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPartyDecisionLane('choose')}
                                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[10px] text-slate-400 hover:bg-black/30"
                                >
                                    رجوع
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => void financializeAfterReportApproval()}
                                    className="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[11px] font-extrabold text-emerald-200 hover:bg-emerald-500/15"
                                >
                                    تأكيد اعتماد التقرير وتحويل القيمة للمركز المالي
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPartyDecisionLane('choose')}
                                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[10px] text-slate-400 hover:bg-black/30"
                                >
                                    رجوع
                                </button>
                            </div>
                        )}
                    </div>
                ),
            });
        }
    }

    return (
        <div className="px-3 pb-3 pt-2" dir="rtl">
            <ExecutionInlineAccordion steps={steps} />
            {sectionConfirmDialog}
        </div>
    );
}
