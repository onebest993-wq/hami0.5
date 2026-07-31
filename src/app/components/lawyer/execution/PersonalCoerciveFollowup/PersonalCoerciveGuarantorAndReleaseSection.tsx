import React from 'react';
import { Unlock } from 'lucide-react';
import { ExecutionInlineExecutorDecisionActions } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { ExecutorRequestFollowupBlockPanel } from '@/app/components/lawyer/DecisionsAndAppealsEngine/decisionCardPresentation';
import type { ExecutorRequestFollowupBlock } from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils/appeal-engine/appealTypes';
import { isExecutorRejectedAppealFollowupDismissed } from '@/app/utils/personalCoerciveAppealSync';
import type { PersonalCoerciveSubtype } from '@/app/utils/executorSeizureDecisionQueue';
import type { PersonalCoerciveSubtypeOutcome } from '@/app/components/lawyer/execution/PersonalCoerciveFollowup/personalCoercivePresentation';

export interface PersonalCoerciveGuarantorAndReleaseSectionProps {
    onGuarantorRequest?: () => void;
    guarantorDec: PersonalCoerciveSubtypeOutcome;
    guarantorFollowupBlock: ExecutorRequestFollowupBlock | null;
    guarantorAwaitingSave: boolean;
    findLatestGuarantorDecisionId: () => string | null;
    allDecisionRows: Record<string, unknown>[];
    renderRejectedExecutorAppealSection: (opts: {
        decisionId: string | null | undefined;
        title?: string;
        titleClassName?: string;
        requestKind?: string;
        personalCoerciveSubtype?: PersonalCoerciveSubtype;
    }) => React.ReactNode;
    exId: string;
    findLatestGuarantorDecisionRow: () => Record<string, unknown> | null;
    onOpenDecisions: (opts?: { tab?: 'current' | 'previous' | 'appeals'; decisionId?: string | null }) => void;
    onOpenGuarantorDetails?: () => void;
    coerciveUiLocked: boolean;
    detentionActive: boolean;
    isHistoricalMode: boolean;
    setReleaseConfirmOpen: (open: boolean) => void;
}

/** طلب الكفيل الضامن + زر طلب إخلاء سبيل المدين — نهاية محضر المتابعة */
export function PersonalCoerciveGuarantorAndReleaseSection({
    onGuarantorRequest,
    guarantorDec,
    guarantorFollowupBlock,
    guarantorAwaitingSave,
    findLatestGuarantorDecisionId,
    allDecisionRows,
    renderRejectedExecutorAppealSection,
    exId,
    findLatestGuarantorDecisionRow,
    onOpenDecisions,
    onOpenGuarantorDetails,
    coerciveUiLocked,
    detentionActive,
    isHistoricalMode,
    setReleaseConfirmOpen,
}: PersonalCoerciveGuarantorAndReleaseSectionProps) {
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
                            سُجِّل قرار بديل بشأن الكفيل — راجع القرارات.
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

            {detentionActive && (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            if (coerciveUiLocked || isHistoricalMode) return;
                            setReleaseConfirmOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 flex-row-reverse rounded-xl border border-emerald-800 bg-emerald-900/20 py-2.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-800/30 transition-all disabled:opacity-40"
                        disabled={coerciveUiLocked || isHistoricalMode}
                    >
                        <Unlock size={16} />
                        طلب إخلاء سبيل المدين
                    </button>
                </div>
            )}
        </>
    );
}
