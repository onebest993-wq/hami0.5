import React from 'react';
import { Scale } from 'lucide-react';
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

export interface PersonalCoerciveDossierCardProps {
    show: boolean;
    kasabCoerciveEmphasis: boolean;
    dossierHasExpandablePanel: boolean;
    dossierIdle: boolean;
    dossierButtonDisabled: boolean;
    relaxedPersonal: boolean;
    guardSummonsGate: () => boolean;
    dossierCanResubmitToExecutor: boolean;
    detentionInAbsentia: boolean;
    debtorPresentEffective: boolean;
    showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    setConfirmingKey: (key: PersonalCoerciveActionGateKey | null) => void;
    debtorNotified: boolean;
    dossier: PersonalCoerciveSubtypeOutcome;
    exId: string;
    findGoverningDossierDecisionId: () => string | null;
    dossierGoverningRow: Record<string, unknown> | null;
    handleExecutorInlineResolved: (result: {
        ok: boolean;
        outcome?: 'approved' | 'rejected';
        personalCoerciveSubtype?: string;
        storageExecutionId?: string;
    }) => void;
    allDecisionRows: Record<string, unknown>[];
    renderRejectedExecutorAppealSection: (opts: {
        decisionId: string | null | undefined;
        title?: string;
        titleClassName?: string;
        requestKind?: string;
        personalCoerciveSubtype?: PersonalCoerciveSubtype;
    }) => React.ReactNode;
    dossierSync: PersonalCoerciveAppealSyncView;
    renderAppealSyncFollowup: (sync: PersonalCoerciveAppealSyncView) => React.ReactNode;
    renderInlineGate: (
        key: PersonalCoerciveActionGateKey,
        onConfirm: () => void,
        opts?: { confirmLabel?: string; gateExtra?: React.ReactNode }
    ) => React.ReactNode;
    runDossierPresentationSubmit: () => void;
}

/** بطاقة طلب عرض الإضبارة على قاضي البداءة — قرار المنفذ فقط */
export function PersonalCoerciveDossierCard({
    show,
    kasabCoerciveEmphasis,
    dossierHasExpandablePanel,
    dossierIdle,
    dossierButtonDisabled,
    relaxedPersonal,
    guardSummonsGate,
    dossierCanResubmitToExecutor,
    detentionInAbsentia,
    debtorPresentEffective,
    showToast,
    setConfirmingKey,
    debtorNotified,
    dossier,
    exId,
    findGoverningDossierDecisionId,
    dossierGoverningRow,
    handleExecutorInlineResolved,
    allDecisionRows,
    renderRejectedExecutorAppealSection,
    dossierSync,
    renderAppealSyncFollowup,
    renderInlineGate,
    runDossierPresentationSubmit,
}: PersonalCoerciveDossierCardProps) {
    if (!show) return null;
    return (
        <div className="relative space-y-2">
            <div
                className={`overflow-visible rounded-2xl border border-violet-500/25 bg-violet-950/15 text-right ${kasabCoerciveEmphasis ? 'ring-2 ring-[#E6C673]/45 border-[#E6C673]/35' : ''}`}
            >
                <div className="relative">
                    {dossierHasExpandablePanel && !dossierIdle ? (
                        <div className={`w-full ${BTN_BASE} bg-gradient-to-l from-orange-500/12 to-transparent`}>
                            <div className="flex flex-row-reverse items-center gap-3">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                                    <Scale className="h-6 w-6 text-white/70" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-amber-100">
                                        عرض الإضبارة على قاضي البداءة
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            disabled={dossierButtonDisabled}
                            onClick={() => {
                                if (dossierButtonDisabled) return;
                                if (!relaxedPersonal && !guardSummonsGate()) return;
                                if (
                                    !dossierCanResubmitToExecutor &&
                                    !detentionInAbsentia &&
                                    !debtorPresentEffective &&
                                    !relaxedPersonal
                                ) {
                                    showToast('فعّل مسار الغياب أو أكّد مثول المدين أمام المنفذ.', 'warning');
                                    return;
                                }
                                setConfirmingKey('executive_dossier_presentation');
                            }}
                            className={`w-full ${BTN_BASE} bg-gradient-to-l from-orange-500/12 to-transparent hover:from-orange-500/18 ${dossierButtonDisabled ? BTN_DISABLED : ''}`}
                        >
                            <div className="flex flex-row-reverse items-center gap-3">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                                    <Scale className="h-6 w-6 text-white/70" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-amber-100">
                                        عرض الإضبارة على قاضي البداءة
                                    </p>
                                </div>
                            </div>
                        </button>
                    )}

                    {dossierIdle && !relaxedPersonal && !debtorNotified ? (
                        <div className="border-t border-white/10 px-3 py-2">
                            <p className="text-[10px] leading-relaxed text-amber-200/90 rounded-xl border border-amber-500/20 bg-amber-950/15 px-3 py-2">
                                يجب تبليغ المدين أولاً قبل تقديم طلب عرض الإضبارة.
                            </p>
                        </div>
                    ) : null}

                    {dossier.pending ? (
                        <div className="border-t border-white/10 px-3 py-3">
                            <CoerciveSubsectionFold
                                flat
                                title="طلب عرض الإضبارة — قيد البت لدى المنفذ"
                                titleClassName="text-amber-200"
                            >
                                <ExecutionInlineExecutorDecisionActions
                                    executionId={exId}
                                    decisionId={findGoverningDossierDecisionId() || ''}
                                    decisionRow={dossierGoverningRow}
                                    requestKind="personal_coercive"
                                    personalCoerciveSubtype="executive_dossier_presentation"
                                    suppressNavigatorToast
                                    onResolved={handleExecutorInlineResolved}
                                />
                            </CoerciveSubsectionFold>
                        </div>
                    ) : dossier.rejected &&
                      !isExecutorRejectedAppealFollowupDismissed(findGoverningDossierDecisionId(), allDecisionRows) ? (
                        <div className="border-t border-white/10 px-3 pb-3 pt-2">
                            {renderRejectedExecutorAppealSection({
                                decisionId: findGoverningDossierDecisionId(),
                                title: 'رفض المنفذ طلب عرض الإضبارة',
                                personalCoerciveSubtype: 'executive_dossier_presentation',
                            })}
                        </div>
                    ) : dossier.alternative ? (
                        <div className="border-t border-white/10 px-3 pb-3 pt-2">
                            <p className="text-[10px] text-amber-200/90">
                                🔄 سُجّل قرار بديل للمنفذ — راجع المهام ومحضر المتابعة.
                            </p>
                        </div>
                    ) : dossier.approved && dossierSync.followupBlock ? (
                        <div className="border-t border-white/10 px-3 pb-3 pt-2">{renderAppealSyncFollowup(dossierSync)}</div>
                    ) : null}
                    {renderInlineGate('executive_dossier_presentation', () => {
                        void runDossierPresentationSubmit();
                    })}
                </div>
            </div>
        </div>
    );
}
