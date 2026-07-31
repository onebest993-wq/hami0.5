import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { ExecutionInlineExecutorDecisionActions } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { isExecutorRejectedAppealFollowupDismissed } from '@/app/utils/personalCoerciveAppealSync';
import type { PersonalCoerciveAppealSyncView } from '@/app/utils/personalCoerciveAppealSync';
import type { PersonalCoerciveSubtype } from '@/app/utils/executorSeizureDecisionQueue';
import {
    BTN_BASE,
    BTN_DISABLED,
    CoerciveSubsectionFold,
    type PersonalCoerciveActionGateKey,
    type PersonalCoerciveSubtypeOutcome,
} from '@/app/components/lawyer/execution/PersonalCoerciveFollowup/personalCoercivePresentation';

export interface PersonalCoerciveInvestigationCardProps {
    show: boolean;
    investigationButtonDisabled: boolean;
    arrest: PersonalCoerciveSubtypeOutcome;
    investigationHasExpandablePanel: boolean;
    guardSummonsGate: () => boolean;
    setConfirmingKey: (key: PersonalCoerciveActionGateKey | null) => void;
    investigationButtonLabel: string;
    investigationFlowStep: 'followup_blocked' | 'executor_pending' | 'outcome_choice' | 'warrant_custody' | 'hub';
    renderAppealSyncFollowup: (sync: PersonalCoerciveAppealSyncView) => React.ReactNode;
    arrestSync: PersonalCoerciveAppealSyncView;
    exId: string;
    findLatestDecisionIdForSubtype: (subtype: PersonalCoerciveSubtype) => string | null;
    findLatestDecisionRowForSubtype: (subtype: PersonalCoerciveSubtype) => Record<string, unknown> | null;
    handleExecutorInlineResolved: (result: {
        ok: boolean;
        outcome?: 'approved' | 'rejected';
        personalCoerciveSubtype?: string;
        storageExecutionId?: string;
    }) => void;
    renderInlineGate: (
        key: PersonalCoerciveActionGateKey,
        onConfirm: () => void,
        opts?: { confirmLabel?: string; gateExtra?: React.ReactNode }
    ) => React.ReactNode;
    setSendingKey: (key: PersonalCoerciveActionGateKey | null) => void;
    submitRequest: (
        subtype: PersonalCoerciveSubtype,
        title: string,
        body: string,
        opts?: { skipTimeline?: boolean; byExecutorOrder?: boolean }
    ) => Promise<string | null>;
    allDecisionRows: Record<string, unknown>[];
    renderRejectedExecutorAppealSection: (opts: {
        decisionId: string | null | undefined;
        title?: string;
        titleClassName?: string;
        requestKind?: string;
        personalCoerciveSubtype?: PersonalCoerciveSubtype;
    }) => React.ReactNode;
    coerciveUiLocked: boolean;
    markWarrantIssued: () => void;
    recordInvestigationDebtorAttended: () => void;
    recordSecuredBringAfterWarrant: () => void;
}

/** بطاقة مفاتحة محكمة التحقيق لإصدار أمر قبض — بعد تعذّر الإحضار الجبري */
export function PersonalCoerciveInvestigationCard({
    show,
    investigationButtonDisabled,
    arrest,
    investigationHasExpandablePanel,
    guardSummonsGate,
    setConfirmingKey,
    investigationButtonLabel,
    investigationFlowStep,
    renderAppealSyncFollowup,
    arrestSync,
    exId,
    findLatestDecisionIdForSubtype,
    findLatestDecisionRowForSubtype,
    handleExecutorInlineResolved,
    renderInlineGate,
    setSendingKey,
    submitRequest,
    allDecisionRows,
    renderRejectedExecutorAppealSection,
    coerciveUiLocked,
    markWarrantIssued,
    recordInvestigationDebtorAttended,
    recordSecuredBringAfterWarrant,
}: PersonalCoerciveInvestigationCardProps) {
    if (!show) return null;
    return (
        <div className="overflow-visible rounded-2xl border border-violet-500/25 bg-violet-950/15 text-right">
            <div className="relative">
                <button
                    type="button"
                    onClick={() => {
                        if (investigationButtonDisabled) return;
                        if (arrest.rejected) return;
                        if (investigationHasExpandablePanel) {
                            return;
                        }
                        if (!guardSummonsGate()) return;
                        setConfirmingKey('arrest_warrant_investigation');
                    }}
                    disabled={investigationButtonDisabled && !investigationHasExpandablePanel}
                    className={`w-full ${BTN_BASE} bg-gradient-to-l from-rose-500/12 to-transparent hover:from-rose-500/18 ${investigationButtonDisabled && !investigationHasExpandablePanel ? BTN_DISABLED : ''}`}
                >
                    <div className="flex flex-row-reverse items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                            <ShieldAlert className="h-6 w-6 text-white/70" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white">{investigationButtonLabel}</p>
                        </div>
                    </div>
                </button>

                {investigationFlowStep === 'followup_blocked' ? renderAppealSyncFollowup(arrestSync) : null}

                {investigationFlowStep === 'executor_pending' ? (
                    <div className="border-t border-white/10 px-3 py-3">
                        <CoerciveSubsectionFold
                            flat
                            title="طلب المفاتحة — قيد البت لدى المنفذ"
                            titleClassName="text-amber-100"
                        >
                            <ExecutionInlineExecutorDecisionActions
                                executionId={exId}
                                decisionId={findLatestDecisionIdForSubtype('arrest_warrant_investigation') || ''}
                                decisionRow={findLatestDecisionRowForSubtype('arrest_warrant_investigation')}
                                requestKind="personal_coercive"
                                personalCoerciveSubtype="arrest_warrant_investigation"
                                suppressNavigatorToast
                                onResolved={handleExecutorInlineResolved}
                            />
                        </CoerciveSubsectionFold>
                    </div>
                ) : null}

                {renderInlineGate('arrest_warrant_investigation', () => {
                    setSendingKey('arrest_warrant_investigation');
                    void submitRequest(
                        'arrest_warrant_investigation',
                        'طلب مفاتحة محكمة التحقيق لإصدار أمر قبض',
                        'بعد تعذّر الإحضار الجبري وتخلّف المدين عن المثول، طُلب توجيه كتاب مفاتحة لمحكمة التحقيق المختصة لإصدار أمر قبض أصولي.'
                    ).then(() => {
                        setSendingKey(null);
                        setConfirmingKey(null);
                    });
                })}

                {arrest.rejected &&
                !isExecutorRejectedAppealFollowupDismissed(
                    findLatestDecisionIdForSubtype('arrest_warrant_investigation'),
                    allDecisionRows
                ) ? (
                    <div className="border-t border-white/10 px-3 pb-3 pt-2">
                        {renderRejectedExecutorAppealSection({
                            decisionId: findLatestDecisionIdForSubtype('arrest_warrant_investigation'),
                            personalCoerciveSubtype: 'arrest_warrant_investigation',
                        })}
                    </div>
                ) : null}

                {investigationFlowStep === 'outcome_choice' ? (
                    <div className="relative z-10 mx-3 mb-2 mt-2 space-y-3 rounded-2xl border border-white/10 bg-black/15 px-3 pb-3 pt-3 text-right">
                        <div className="space-y-1 border-b border-white/10 pb-2">
                            <p className="text-[11px] font-black text-amber-100">
                                مفاتحة محكمة التحقيق — بعد موافقة المنفذ
                            </p>
                            <p className="text-[10px] text-slate-400">اختر النتيجة المناسبة.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            <button
                                type="button"
                                disabled={coerciveUiLocked}
                                className="w-full rounded-xl border border-rose-500/40 bg-rose-950/40 py-2.5 text-[11px] font-bold text-rose-100 disabled:opacity-40"
                                onClick={() => markWarrantIssued()}
                            >
                                تم إصدار مذكرة قبض
                            </button>
                            <button
                                type="button"
                                disabled={coerciveUiLocked}
                                className="w-full rounded-xl border border-emerald-500/35 bg-emerald-800/55 py-2.5 text-[11px] font-bold text-white disabled:opacity-40"
                                onClick={() => recordInvestigationDebtorAttended()}
                            >
                                حضور المدين
                            </button>
                        </div>
                    </div>
                ) : null}

                {investigationFlowStep === 'warrant_custody' ? (
                    <div className="relative z-10 mx-3 mb-2 mt-2 space-y-3 rounded-2xl border border-white/10 bg-black/15 px-3 pb-3 pt-3 text-right">
                        <div className="space-y-1 border-b border-white/10 pb-2">
                            <p className="text-[11px] font-black text-rose-100">مذكرة قبض — تأمين الإحضار</p>
                            <p className="text-[10px] text-slate-400">
                                بعد صدور المذكرة، سجّل تأمين الإحضار لإغلاق الدورة.
                            </p>
                        </div>
                        <button
                            type="button"
                            disabled={coerciveUiLocked}
                            className="w-full rounded-xl border border-emerald-500/35 bg-emerald-800/55 py-2.5 text-[11px] font-bold text-white disabled:opacity-40"
                            onClick={() => recordSecuredBringAfterWarrant()}
                        >
                            تم تأمين إحضار
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
