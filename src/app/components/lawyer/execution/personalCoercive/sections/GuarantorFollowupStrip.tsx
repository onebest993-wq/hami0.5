import React from 'react';
import { ExecutionInlineExecutorDecisionActions } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { ExecutorRequestFollowupBlockPanel } from '@/app/components/lawyer/DecisionsAndAppealsEngine/decisionCardPresentation';
import { isExecutorRejectedAppealFollowupDismissed } from '@/app/utils/personalCoerciveAppealSync';
import type { PickPersonalCoerciveSectionProps } from './personalCoerciveSectionBag';

export type GuarantorFollowupStripProps = PickPersonalCoerciveSectionProps<
    | 'allDecisionRows'
    | 'coerciveUiLocked'
    | 'exId'
    | 'executionId'
    | 'findLatestGuarantorDecisionId'
    | 'findLatestGuarantorDecisionRow'
    | 'guarantorAwaitingSave'
    | 'guarantorDec'
    | 'guarantorFollowupBlock'
    | 'onGuarantorRequest'
    | 'onOpenDecisions'
    | 'onOpenGuarantorDetails'
    | 'renderRejectedExecutorAppealSection'
>;

export function GuarantorFollowupStrip({
    allDecisionRows,
    coerciveUiLocked,
    exId,
    executionId,
    findLatestGuarantorDecisionId,
    findLatestGuarantorDecisionRow,
    guarantorAwaitingSave,
    guarantorDec,
    guarantorFollowupBlock,
    onGuarantorRequest,
    onOpenDecisions,
    onOpenGuarantorDetails,
    renderRejectedExecutorAppealSection,
}: GuarantorFollowupStripProps) {
    return (
        <>
{onGuarantorRequest && (
                <div className="space-y-2">
                    {guarantorDec.pending ? (
                        <p className="text-[10px] text-amber-200/90 text-center leading-relaxed">
                            طلب الكفيل قيد البت لدى المنفذ — راجع «القرارات والطعون».
                        </p>
                    ) : guarantorDec.rejected ? (
                        <p className="text-[10px] text-rose-200/90 text-center leading-relaxed">
                            رُفض طلب الكفيل — يمكنك التقديم مجدداً إن رُفع الرفض أو تغيّر الموقف.
                        </p>
                    ) : guarantorDec.alternative ? (
                        <p className="text-[10px] text-amber-200/90 text-center leading-relaxed">
                            سُجِّل قرار بديل بشأن الكفيل — راجع القرارات.
                        </p>
                    ) : guarantorFollowupBlock ? (
                        <p className="text-[10px] text-amber-200/90 text-center leading-relaxed">
                            متوقف مؤقتاً — راجع مركز القرارات والطعون.
                        </p>
                    ) : guarantorAwaitingSave ? (
                        <p className="text-[10px] text-emerald-200/90 text-center leading-relaxed">
                            وافق المنفذ — أكمل وحفظ بيانات الكفيل من اسم الكفيل أسفل المدين أو من الزر أدناه.
                        </p>
                    ) : null}
                    {guarantorDec.pending ||
                    (guarantorDec.rejected &&
                        !isExecutorRejectedAppealFollowupDismissed(
                            findLatestGuarantorDecisionId(),
                            allDecisionRows
                        )) ? (
                        <div className="mt-2">
                            {guarantorDec.rejected ? (
                                renderRejectedExecutorAppealSection({
                                    decisionId: findLatestGuarantorDecisionId(),
                                    requestKind: 'guarantor_request',
                                })
                            ) : (
                                <ExecutionInlineExecutorDecisionActions
                                    executionId={exId}
                                    decisionId={findLatestGuarantorDecisionId() || ''}
                                    requestKind="guarantor_request"
                                    suppressNavigatorToast
                                />
                            )}
                        </div>
                    ) : null}
                    {guarantorFollowupBlock && findLatestGuarantorDecisionRow() ? (
                        <div className="mt-2">
                            <ExecutorRequestFollowupBlockPanel
                                gate={guarantorFollowupBlock}
                                executionId={exId}
                                decisionId={String(findLatestGuarantorDecisionId() || '').trim()}
                                onOpenAppeals={(id) => onOpenDecisions({ tab: 'previous', decisionId: id })}
                            />
                        </div>
                    ) : null}
                    {guarantorAwaitingSave && !guarantorFollowupBlock && onOpenGuarantorDetails ? (
                        <button
                            type="button"
                            disabled={coerciveUiLocked}
                            onClick={() => onOpenGuarantorDetails()}
                            className="w-full rounded-xl border border-emerald-500/40 bg-emerald-950/25 py-2.5 text-[11px] font-bold text-emerald-100 disabled:opacity-40"
                        >
                            إكمال بيانات الكفيل
                        </button>
                    ) : null}
                </div>
            )}
        </>
    );
}
