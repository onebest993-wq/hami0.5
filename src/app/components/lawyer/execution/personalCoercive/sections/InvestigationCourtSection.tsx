import React from 'react';
import { BTN_BASE, BTN_DISABLED } from '../personalCoerciveStyles';
import { CoerciveSubsectionFold } from '../chrome/CoerciveSubsectionFold';
import { ExecutionInlineExecutorDecisionActions } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { ShieldAlert } from '@/app/components/ui/icons/ShieldAlert';
import { isExecutorRejectedAppealFollowupDismissed } from '@/app/utils/personalCoerciveAppealSync';
import type { PickPersonalCoerciveSectionProps } from './personalCoerciveSectionBag';

export type InvestigationCourtSectionProps = PickPersonalCoerciveSectionProps<
    | 'allDecisionRows'
    | 'arrest'
    | 'arrestSync'
    | 'coerciveUiLocked'
    | 'exId'
    | 'executionId'
    | 'findLatestDecisionIdForSubtype'
    | 'findLatestDecisionRowForSubtype'
    | 'guardSummonsGate'
    | 'handleExecutorInlineResolved'
    | 'investigationButtonDisabled'
    | 'investigationButtonLabel'
    | 'investigationFlowStep'
    | 'investigationHasExpandablePanel'
    | 'markWarrantIssued'
    | 'recordInvestigationDebtorAttended'
    | 'recordSecuredBringAfterWarrant'
    | 'relaxedPersonal'
    | 'renderAppealSyncFollowup'
    | 'renderInlineGate'
    | 'renderRejectedExecutorAppealSection'
    | 'runArrestInvestigationSubmit'
    | 'setConfirmingKey'
    | 'showEmbeddedSection'
    | 'showInvestigationBlock'
>;

export function InvestigationCourtSection({
    allDecisionRows,
    arrest,
    arrestSync,
    coerciveUiLocked,
    exId,
    executionId,
    findLatestDecisionIdForSubtype,
    findLatestDecisionRowForSubtype,
    guardSummonsGate,
    handleExecutorInlineResolved,
    investigationButtonDisabled,
    investigationButtonLabel,
    investigationFlowStep,
    investigationHasExpandablePanel,
    markWarrantIssued,
    recordInvestigationDebtorAttended,
    recordSecuredBringAfterWarrant,
    relaxedPersonal,
    renderAppealSyncFollowup,
    renderInlineGate,
    renderRejectedExecutorAppealSection,
    runArrestInvestigationSubmit,
    setConfirmingKey,
    showEmbeddedSection,
    showInvestigationBlock,
}: InvestigationCourtSectionProps) {
    return (
        <>
{/* 2 — مفاتحة تحقيق */}
            {showEmbeddedSection('arrest_warrant_investigation') && showInvestigationBlock ? (
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

                        {investigationFlowStep === 'followup_blocked'
                            ? renderAppealSyncFollowup(arrestSync)
                            : null}

                        {investigationFlowStep === 'executor_pending' ? (
                            <div className="border-t border-white/10 px-3 py-3">
                                <CoerciveSubsectionFold
                                    flat
                                    title="طلب المفاتحة — قيد البت لدى المنفذ"
                                    titleClassName="text-amber-100"
                                >
                                    <ExecutionInlineExecutorDecisionActions
                                        executionId={exId}
                                        decisionId={
                                            findLatestDecisionIdForSubtype('arrest_warrant_investigation') || ''
                                        }
                                        decisionRow={findLatestDecisionRowForSubtype(
                                            'arrest_warrant_investigation'
                                        )}
                                        requestKind="personal_coercive"
                                        personalCoerciveSubtype="arrest_warrant_investigation"
                                        suppressNavigatorToast
                                        onResolved={handleExecutorInlineResolved}
                                    />
                                </CoerciveSubsectionFold>
                            </div>
                        ) : null}

                        {investigationFlowStep === 'hub'
                            ? renderInlineGate(
                                  'arrest_warrant_investigation',
                                  () => {
                                      if (!relaxedPersonal && !guardSummonsGate()) return;
                                      runArrestInvestigationSubmit();
                                  },
                                  { confirmLabel: 'تأكيد وإرسال مفاتحة التحقيق' }
                              )
                            : null}

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
                            <div className="border-t border-white/10 px-3 py-3">
                                <CoerciveSubsectionFold
                                    title="نتيجة المفاتحة — بعد موافقة المنفذ"
                                    titleClassName="text-amber-100"
                                    defaultOpen
                                >
                                    <button
                                        type="button"
                                        disabled={coerciveUiLocked}
                                        className="w-full rounded-xl border border-emerald-500/35 bg-emerald-800/55 py-2.5 text-[11px] font-bold text-white disabled:opacity-40"
                                        onClick={() => recordInvestigationDebtorAttended()}
                                    >
                                        تم حضور المدين
                                    </button>
                                    <button
                                        type="button"
                                        disabled={coerciveUiLocked}
                                        className="w-full rounded-xl border border-rose-500/40 bg-rose-950/40 py-2.5 text-[11px] font-bold text-rose-100 disabled:opacity-40"
                                        onClick={() => markWarrantIssued()}
                                    >
                                        إصدار مذكرة قبض
                                    </button>
                                </CoerciveSubsectionFold>
                            </div>
                        ) : null}

                        {investigationFlowStep === 'warrant_custody' ? (
                            <div className="border-t border-white/10 px-3 py-3">
                                <CoerciveSubsectionFold
                                    title="مذكرة قبض — تأمين الإحضار"
                                    titleClassName="text-rose-100"
                                    defaultOpen
                                >
                                    <button
                                        type="button"
                                        disabled={coerciveUiLocked}
                                        className="w-full rounded-xl border border-emerald-500/35 bg-emerald-800/55 py-2.5 text-[11px] font-bold text-white disabled:opacity-40"
                                        onClick={() => recordSecuredBringAfterWarrant()}
                                    >
                                        تم تأمين إحضار المدين
                                    </button>
                                </CoerciveSubsectionFold>
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </>
    );
}
