import React, { useEffect, useState } from 'react';
import { BTN_BASE, BTN_DISABLED, BTN_STATIC } from '../personalCoerciveStyles';
import { CoercivePendingDecisionRail } from '../chrome/CoercivePendingDecisionRail';
import { CoerciveSubsectionFold } from '../chrome/CoerciveSubsectionFold';
import { ExecutionInlineExecutorDecisionActions } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { Fingerprint } from '@/app/components/ui/icons/Fingerprint';
import { Stamp } from '@/app/components/ui/icons/Stamp';
import { RejectedExecutorResubmitStrip } from '@/app/components/lawyer/execution/RejectedExecutorResubmitStrip';
import { isExecutorRejectedAppealFollowupDismissed } from '@/app/utils/personalCoerciveAppealSync';
import type { PickPersonalCoerciveSectionProps } from './personalCoerciveSectionBag';

export type ForcedBringSectionProps = PickPersonalCoerciveSectionProps<
    | 'allDecisionRows'
    | 'coerciveUiLocked'
    | 'exId'
    | 'executionId'
    | 'findLatestDecisionIdForSubtype'
    | 'findLatestDecisionRowForSubtype'
    | 'forcedButtonDisabled'
    | 'forcedButtonLabel'
    | 'forcedByExecutorOrder'
    | 'forcedEffective'
    | 'forcedFlowStep'
    | 'forcedHasExpandablePanel'
    | 'forcedOutcomePick'
    | 'forcedShowStartStrip'
    | 'forcedSummonAllowed'
    | 'forcedSummonLockReason'
    | 'forcedSync'
    | 'guardSummonsGate'
    | 'handleExecutorInlineResolved'
    | 'handleForcedBringHeaderClick'
    | 'hasOpenCardForSubtype'
    | 'hideExecutorForcedBringActivation'
    | 'kasabCoerciveEmphasis'
    | 'onOpenSummonsCenter'
    | 'recordForcedOutcome'
    | 'relaxedPersonal'
    | 'renderAppealSyncFollowup'
    | 'renderInlineGate'
    | 'renderRejectedExecutorAppealSection'
    | 'runForcedBringSubmit'
    | 'sendingKey'
    | 'setForcedOutcomePick'
    | 'showForcedBringInSection'
    | 'showToast'
>;

export function ForcedBringSection({
    allDecisionRows,
    coerciveUiLocked,
    exId,
    executionId,
    findLatestDecisionIdForSubtype,
    findLatestDecisionRowForSubtype,
    forcedButtonDisabled,
    forcedButtonLabel,
    forcedByExecutorOrder,
    forcedEffective,
    forcedFlowStep,
    forcedHasExpandablePanel,
    forcedOutcomePick,
    forcedShowStartStrip,
    forcedSummonAllowed,
    forcedSummonLockReason,
    forcedSync,
    guardSummonsGate,
    handleExecutorInlineResolved,
    handleForcedBringHeaderClick,
    hasOpenCardForSubtype,
    hideExecutorForcedBringActivation = false,
    kasabCoerciveEmphasis,
    onOpenSummonsCenter,
    recordForcedOutcome,
    relaxedPersonal,
    renderAppealSyncFollowup,
    renderInlineGate,
    renderRejectedExecutorAppealSection,
    runForcedBringSubmit,
    sendingKey,
    setForcedOutcomePick,
    showForcedBringInSection,
    showToast,
}: ForcedBringSectionProps) {
    const [resubmitConfirmOpen, setResubmitConfirmOpen] = useState(false);
    const [pendingRailHold, setPendingRailHold] = useState(false);
    /** إبقاء شريط البدء ظاهراً أثناء التأكيد حتى لا يختفي عند وميض حالة القرار */
    const showStartStrip = forcedShowStartStrip || resubmitConfirmOpen;
    const headerIsStatic = forcedHasExpandablePanel || showStartStrip;
    const showPendingRail =
        forcedEffective.pending || (pendingRailHold && !showStartStrip && !forcedEffective.approved);

    useEffect(() => {
        if (forcedEffective.pending || forcedEffective.approved) {
            setResubmitConfirmOpen(false);
        }
    }, [forcedEffective.approved, forcedEffective.pending]);

    useEffect(() => {
        if (forcedEffective.pending) {
            setPendingRailHold(true);
            return;
        }
        if (forcedEffective.approved || forcedEffective.rejected || forcedShowStartStrip) {
            setPendingRailHold(false);
            return;
        }
        const t = window.setTimeout(() => setPendingRailHold(false), 280);
        return () => window.clearTimeout(t);
    }, [
        forcedEffective.approved,
        forcedEffective.pending,
        forcedEffective.rejected,
        forcedShowStartStrip,
    ]);

    return (
        <>
            {/* 1 — إحضار جبري */}
            {showForcedBringInSection ? (
                <div className="relative space-y-2" data-testid="forced-bring-section">
                    <div
                        className={`overflow-visible rounded-xl border text-right ${
                            kasabCoerciveEmphasis
                                ? 'border-[#E6C673]/28 bg-[#E6C673]/[0.04]'
                                : 'border-violet-500/20 bg-violet-950/10'
                        }`}
                    >
                        <div className="relative">
                            {headerIsStatic ? (
                                <div className={`w-full ${BTN_STATIC}`}>
                                    <div className="flex items-center gap-2.5" dir="rtl">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E6C673]/10 ring-1 ring-[#E6C673]/20">
                                            <Fingerprint className="h-4 w-4 text-[#E6C673]/90" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13px] font-bold text-white/95">
                                                {forcedButtonLabel}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleForcedBringHeaderClick()}
                                    disabled={
                                        (forcedButtonDisabled && !forcedHasExpandablePanel) ||
                                        (showStartStrip && !forcedHasExpandablePanel)
                                    }
                                    className={`w-full ${BTN_BASE} ${(forcedButtonDisabled && !forcedHasExpandablePanel) || (showStartStrip && !forcedHasExpandablePanel) ? BTN_DISABLED : ''}`}
                                >
                                    <div className="flex items-center gap-2.5" dir="rtl">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E6C673]/10 ring-1 ring-[#E6C673]/20">
                                            <Fingerprint className="h-4 w-4 text-[#E6C673]/90" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13px] font-bold text-white/95">
                                                {forcedButtonLabel}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            )}
                            {showPendingRail ? (
                                <div className="border-t border-white/[0.06] px-2.5 py-2">
                                    <CoercivePendingDecisionRail title="قرار المنفذ — إحضار جبري">
                                        {forcedEffective.pending ? (
                                            <ExecutionInlineExecutorDecisionActions
                                                executionId={exId}
                                                decisionId={
                                                    findLatestDecisionIdForSubtype('forced_bring_in') ||
                                                    ''
                                                }
                                                decisionRow={findLatestDecisionRowForSubtype(
                                                    'forced_bring_in',
                                                )}
                                                requestKind="personal_coercive"
                                                personalCoerciveSubtype="forced_bring_in"
                                                suppressNavigatorToast
                                                onResolved={handleExecutorInlineResolved}
                                            />
                                        ) : null}
                                    </CoercivePendingDecisionRail>
                                </div>
                            ) : null}

                            {renderAppealSyncFollowup(forcedSync)}

                            {forcedEffective.rejected &&
                            !isExecutorRejectedAppealFollowupDismissed(
                                findLatestDecisionIdForSubtype('forced_bring_in'),
                                allDecisionRows,
                            ) ? (
                                <div className="border-t border-white/[0.06] px-2.5 pb-2.5 pt-2">
                                    {renderRejectedExecutorAppealSection({
                                        decisionId: findLatestDecisionIdForSubtype('forced_bring_in'),
                                        personalCoerciveSubtype: 'forced_bring_in',
                                    })}
                                </div>
                            ) : null}

                            {showStartStrip ? (
                                <div
                                    className="space-y-1.5 border-t border-white/[0.06] px-2.5 py-2"
                                    data-testid="forced-bring-start-strip"
                                >
                                    <div
                                        className={
                                            hideExecutorForcedBringActivation || resubmitConfirmOpen
                                                ? 'grid grid-cols-1 gap-1.5'
                                                : 'grid grid-cols-1 gap-1.5 sm:grid-cols-2'
                                        }
                                    >
                                        {!hideExecutorForcedBringActivation && !resubmitConfirmOpen ? (
                                            <button
                                                type="button"
                                                disabled={sendingKey === 'forced_bring_in'}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    runForcedBringSubmit(true);
                                                }}
                                                className="inline-flex min-h-[40px] w-full flex-row-reverse items-center justify-center gap-1.5 rounded-lg border border-[#E6C673]/30 bg-[#E6C673]/10 px-2.5 text-[11px] font-bold text-[#E6C673] hover:bg-[#E6C673]/16 disabled:opacity-50 touch-manipulation"
                                            >
                                                <Stamp
                                                    size={13}
                                                    className="opacity-85 shrink-0"
                                                    aria-hidden
                                                />
                                                تفعيل بقرار المنفذ
                                            </button>
                                        ) : null}
                                        <RejectedExecutorResubmitStrip
                                            compact
                                            confirmOpen={resubmitConfirmOpen}
                                            onConfirmOpenChange={setResubmitConfirmOpen}
                                            showReplaceHint={hasOpenCardForSubtype('forced_bring_in')}
                                            submitting={sendingKey === 'forced_bring_in'}
                                            disabled={sendingKey === 'forced_bring_in'}
                                            linkLabel="إرسال طلب للقرارات"
                                            onConfirmSubmit={() => {
                                                if (!relaxedPersonal && !guardSummonsGate()) return;
                                                if (!relaxedPersonal && !forcedSummonAllowed) {
                                                    showToast(
                                                        forcedSummonLockReason ||
                                                            'غير مسموح بالإحضار الجبري وفقاً للوضع القانوني الحالي.',
                                                        'warning',
                                                        {
                                                            action: {
                                                                label: 'مركز التبليغات',
                                                                onClick: () => onOpenSummonsCenter(),
                                                            },
                                                        },
                                                    );
                                                    return;
                                                }
                                                runForcedBringSubmit(false);
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : null}

                            {renderInlineGate('forced_bring_in', () => runForcedBringSubmit(false), {
                                confirmLabel: 'تأكيد وإرسال طلب الإحضار الجبري',
                            })}

                            {forcedFlowStep === 'outcome_choice' ? (
                                <div className="border-t border-white/[0.06] px-2.5 pb-2 pt-2.5 text-right">
                                    <CoerciveSubsectionFold
                                        title="تسجيل النتيجة — بعد موافقة المنفذ"
                                        titleClassName="text-amber-100"
                                        defaultOpen
                                    >
                                        <div className="space-y-1.5 border-b border-white/10 pb-2">
                                            <p className="text-[10px] font-bold text-emerald-200/90">
                                                {forcedByExecutorOrder
                                                    ? '✓ بناء على قرار المنفذ العدل'
                                                    : '✓ طلب إحضار جبري — تمت الموافقة'}
                                            </p>
                                        </div>
                                        <div
                                            className="grid grid-cols-1 gap-2"
                                            role="radiogroup"
                                            aria-label="نتيجة الإحضار الجبري"
                                        >
                                            <button
                                                type="button"
                                                disabled={coerciveUiLocked}
                                                aria-pressed={forcedOutcomePick === 'brought'}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setForcedOutcomePick('brought');
                                                }}
                                                className={`w-full rounded-xl border px-3 py-2.5 text-[11px] font-bold transition ${
                                                    forcedOutcomePick === 'brought'
                                                        ? 'border-emerald-500/50 bg-emerald-950/45 text-emerald-100 ring-1 ring-emerald-500/35'
                                                        : 'border-white/10 bg-[#0A0F1C]/80 text-slate-200 hover:border-emerald-500/30 hover:bg-emerald-950/25'
                                                } disabled:opacity-40`}
                                            >
                                                حضور المدين
                                            </button>
                                            <button
                                                type="button"
                                                disabled={coerciveUiLocked}
                                                aria-pressed={forcedOutcomePick === 'dismissed'}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setForcedOutcomePick('dismissed');
                                                }}
                                                className={`w-full rounded-xl border px-3 py-2.5 text-[11px] font-bold transition ${
                                                    forcedOutcomePick === 'dismissed'
                                                        ? 'border-slate-400/50 bg-slate-900/55 text-slate-100 ring-1 ring-slate-400/35'
                                                        : 'border-white/10 bg-[#0A0F1C]/80 text-slate-200 hover:border-slate-500/30 hover:bg-slate-900/40'
                                                } disabled:opacity-40`}
                                            >
                                                التجاهل
                                            </button>
                                            <button
                                                type="button"
                                                disabled={coerciveUiLocked}
                                                aria-pressed={forcedOutcomePick === 'absconded'}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setForcedOutcomePick('absconded');
                                                }}
                                                className={`w-full rounded-xl border px-3 py-2.5 text-[11px] font-bold transition ${
                                                    forcedOutcomePick === 'absconded'
                                                        ? 'border-rose-500/45 bg-rose-950/40 text-rose-100 ring-1 ring-rose-500/35'
                                                        : 'border-white/10 bg-[#0A0F1C]/80 text-slate-200 hover:border-rose-500/30 hover:bg-rose-950/25'
                                                } disabled:opacity-40`}
                                            >
                                                المدين متخفي عن الأنظار
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={
                                                !forcedOutcomePick ||
                                                coerciveUiLocked ||
                                                (forcedOutcomePick !== 'brought' &&
                                                    forcedOutcomePick !== 'absconded' &&
                                                    forcedOutcomePick !== 'dismissed')
                                            }
                                            className="w-full rounded-xl bg-gradient-to-l from-amber-500 to-yellow-600 py-2.5 text-[11px] font-black text-[#0A0F1C] disabled:opacity-40"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (
                                                    forcedOutcomePick !== 'brought' &&
                                                    forcedOutcomePick !== 'absconded' &&
                                                    forcedOutcomePick !== 'dismissed'
                                                ) {
                                                    return;
                                                }
                                                recordForcedOutcome(forcedOutcomePick);
                                                setForcedOutcomePick('');
                                            }}
                                        >
                                            تأكيد التسجيل
                                        </button>
                                    </CoerciveSubsectionFold>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
