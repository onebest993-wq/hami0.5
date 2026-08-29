import React from 'react';
import { BTN_BASE, BTN_DISABLED } from '../personalCoerciveStyles';
import { CoerciveSubsectionFold } from '../chrome/CoerciveSubsectionFold';
import { ExecutionInlineExecutorDecisionActions } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { Scale } from '@/app/components/ui/icons/Scale';
import { isExecutorRejectedAppealFollowupDismissed } from '@/app/utils/personalCoerciveAppealSync';
import type { PickPersonalCoerciveSectionProps } from './personalCoerciveSectionBag';

export type DossierPresentationSectionProps = PickPersonalCoerciveSectionProps<
    | 'activateDossierAbsentiaPath'
    | 'allDecisionRows'
    | 'canActivateDossierAbsentiaPath'
    | 'coerciveWriteLocked'
    | 'debtorNotified'
    | 'dossier'
    | 'dossierAbsentiaPathOpen'
    | 'dossierButtonDisabled'
    | 'dossierEffective'
    | 'dossierGoverningRow'
    | 'dossierHasExpandablePanel'
    | 'dossierIdle'
    | 'dossierSync'
    | 'exId'
    | 'executionId'
    | 'findGoverningDossierDecisionId'
    | 'handleDossierHeaderClick'
    | 'handleExecutorInlineResolved'
    | 'kasabCoerciveEmphasis'
    | 'relaxedPersonal'
    | 'renderAppealSyncFollowup'
    | 'renderInlineGate'
    | 'renderRejectedExecutorAppealSection'
    | 'runDossierPresentationSubmit'
    | 'showDossierPresentationCard'
    | 'showEmbeddedSection'
>;

export function DossierPresentationSection({
    activateDossierAbsentiaPath,
    allDecisionRows,
    canActivateDossierAbsentiaPath,
    coerciveWriteLocked,
    debtorNotified,
    dossier,
    dossierAbsentiaPathOpen,
    dossierButtonDisabled,
    dossierEffective,
    dossierGoverningRow,
    dossierHasExpandablePanel,
    dossierIdle,
    dossierSync,
    exId,
    executionId,
    findGoverningDossierDecisionId,
    handleDossierHeaderClick,
    handleExecutorInlineResolved,
    kasabCoerciveEmphasis,
    relaxedPersonal,
    renderAppealSyncFollowup,
    renderInlineGate,
    renderRejectedExecutorAppealSection,
    runDossierPresentationSubmit,
    showDossierPresentationCard,
    showEmbeddedSection,
}: DossierPresentationSectionProps) {
    return (
        <>
{/* 4أ — طلب عرض الإضبارة (قرار المنفذ فقط) */}
            {showEmbeddedSection('executive_dossier_presentation') && showDossierPresentationCard ? (
                <div className="relative space-y-2">
                <div
                    className={`overflow-visible rounded-2xl border border-violet-500/25 bg-violet-950/15 text-right ${kasabCoerciveEmphasis ? 'ring-2 ring-[#E6C673]/45 border-[#E6C673]/35' : ''}`}
                >
                    <div className="relative">
                        {dossierHasExpandablePanel ? (
                            <div
                                className={`w-full ${BTN_BASE} bg-gradient-to-l from-orange-500/12 to-transparent`}
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
                            </div>
                        ) : (
                            <button
                                type="button"
                                disabled={dossierButtonDisabled}
                                onClick={() => handleDossierHeaderClick()}
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

                        {dossierIdle && dossierAbsentiaPathOpen && !relaxedPersonal ? (
                            <div className="border-t border-white/10 px-3 py-2">
                                <p className="text-[10px] leading-relaxed text-violet-200/90 rounded-xl border border-violet-500/20 bg-violet-950/15 px-3 py-2">
                                    مسار الغياب مفعّل — يُقدَّم طلب عرض الإضبارة دون اشتراط مثول المدين أمام
                                    المنفذ.
                                </p>
                            </div>
                        ) : null}

                        {dossierIdle && canActivateDossierAbsentiaPath ? (
                            <div className="border-t border-white/10 px-3 py-2 space-y-2">
                                <p className="text-[10px] leading-relaxed text-amber-200/85">
                                    لم يُثبت مثول المدين — يمكنك تفعيل مسار الغياب لطلب عرض الإضبارة.
                                </p>
                                <button
                                    type="button"
                                    disabled={coerciveWriteLocked}
                                    className="w-full rounded-xl border border-amber-500/35 bg-amber-950/25 py-2.5 text-[11px] font-bold text-amber-100 hover:bg-amber-950/40 disabled:opacity-40"
                                    onClick={() => activateDossierAbsentiaPath()}
                                >
                                    تفعيل مسار الغياب لعرض الإضبارة
                                </button>
                            </div>
                        ) : null}

                        {dossierEffective.pending ? (
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
                        ) : dossierEffective.rejected &&
                          !isExecutorRejectedAppealFollowupDismissed(
                              findGoverningDossierDecisionId(),
                              allDecisionRows
                          ) ? (
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
                        ) : dossierEffective.approved && dossierSync.followupBlock ? (
                            <div className="border-t border-white/10 px-3 pb-3 pt-2">
                                {renderAppealSyncFollowup(dossierSync)}
                            </div>
                        ) : null}

                        {renderInlineGate('executive_dossier_presentation', () => {
                            void runDossierPresentationSubmit();
                        }, {
                            confirmLabel: 'تأكيد وإرسال طلب عرض الإضبارة',
                            gateExtra: (
                                <p className="text-[10px] leading-relaxed text-amber-100/90 text-right">
                                    سيُرسل طلب عرض الإضبارة على قاضي البداءة إلى مركز القرارات لبتّ المنفذ.
                                </p>
                            ),
                        })}
                    </div>
                </div>
                </div>
            ) : null}
        </>
    );
}
