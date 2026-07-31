import React from 'react';
import { Gavel } from 'lucide-react';
import { RejectedExecutorResubmitStrip } from '@/app/components/lawyer/execution/RejectedExecutorResubmitStrip';
import { ExecutionInlineExecutorDecisionActions } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { isExecutorRejectedAppealFollowupDismissed } from '@/app/utils/personalCoerciveAppealSync';
import type { PersonalCoerciveAppealSyncView } from '@/app/utils/personalCoerciveAppealSync';
import type { PersonalCoerciveSubtype } from '@/app/utils/executorSeizureDecisionQueue';
import {
    BTN_BASE,
    BTN_DISABLED,
    CoerciveSubsectionFold,
    type PersonalCoerciveSubtypeOutcome,
} from '@/app/components/lawyer/execution/PersonalCoerciveFollowup/personalCoercivePresentation';

export interface PersonalCoerciveForcedBringCardProps {
    show: boolean;
    kasabCoerciveEmphasis: boolean;
    forcedHasExpandablePanel: boolean;
    forcedButtonLabel: string;
    canWithdrawInvestigationPath: boolean;
    setForcedBringWithdrawConfirmOpen: (open: boolean) => void;
    forcedButtonDisabled: boolean;
    relaxedPersonal: boolean;
    guardSummonsGate: () => boolean;
    forcedShowStartStrip: boolean;
    forcedEffective: PersonalCoerciveSubtypeOutcome;
    exId: string;
    findLatestDecisionIdForSubtype: (subtype: PersonalCoerciveSubtype) => string | null;
    findLatestDecisionRowForSubtype: (subtype: PersonalCoerciveSubtype) => Record<string, unknown> | null;
    handleExecutorInlineResolved: (result: {
        ok: boolean;
        outcome?: 'approved' | 'rejected';
        personalCoerciveSubtype?: string;
        storageExecutionId?: string;
    }) => void;
    renderAppealSyncFollowup: (sync: PersonalCoerciveAppealSyncView) => React.ReactNode;
    forcedSync: PersonalCoerciveAppealSyncView;
    allDecisionRows: Record<string, unknown>[];
    renderRejectedExecutorAppealSection: (opts: {
        decisionId: string | null | undefined;
        title?: string;
        titleClassName?: string;
        requestKind?: string;
        personalCoerciveSubtype?: PersonalCoerciveSubtype;
    }) => React.ReactNode;
    sendingKey: string | null;
    runForcedBringSubmit: (byExecutorOrder: boolean) => void;
    hasOpenCardForSubtype: (subtype: PersonalCoerciveSubtype) => boolean;
    showToast: (
        msg: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        opts?: { action?: { label: string; onClick: () => void } }
    ) => void;
    forcedSummonAllowed: boolean;
    forcedSummonLockReason?: string;
    onOpenSummonsCenter: () => void;
    forcedFlowStep: 'followup_blocked' | 'outcome_choice' | 'hub';
    forcedByExecutorOrder: boolean;
    forcedOutcomePick: 'brought' | 'absconded' | '';
    setForcedOutcomePick: (pick: 'brought' | 'absconded' | '') => void;
    coerciveUiLocked: boolean;
    recordForcedOutcome: (v: 'brought' | 'absconded') => void;
}

/** بطاقة الإحضار الجبري الشخصي — من الطلب حتى تسجيل النتيجة الميدانية */
export function PersonalCoerciveForcedBringCard({
    show,
    kasabCoerciveEmphasis,
    forcedHasExpandablePanel,
    forcedButtonLabel,
    canWithdrawInvestigationPath,
    setForcedBringWithdrawConfirmOpen,
    forcedButtonDisabled,
    relaxedPersonal,
    guardSummonsGate,
    forcedShowStartStrip,
    forcedEffective,
    exId,
    findLatestDecisionIdForSubtype,
    findLatestDecisionRowForSubtype,
    handleExecutorInlineResolved,
    renderAppealSyncFollowup,
    forcedSync,
    allDecisionRows,
    renderRejectedExecutorAppealSection,
    sendingKey,
    runForcedBringSubmit,
    hasOpenCardForSubtype,
    showToast,
    forcedSummonAllowed,
    forcedSummonLockReason,
    onOpenSummonsCenter,
    forcedFlowStep,
    forcedByExecutorOrder,
    forcedOutcomePick,
    setForcedOutcomePick,
    coerciveUiLocked,
    recordForcedOutcome,
}: PersonalCoerciveForcedBringCardProps) {
    if (!show) return null;
    return (
        <div className="relative space-y-2">
            <div
                className={`overflow-visible rounded-2xl border border-violet-500/25 bg-violet-950/15 text-right ${kasabCoerciveEmphasis ? 'ring-2 ring-[#E6C673]/45 border-[#E6C673]/35' : ''}`}
            >
                <div className="relative">
                    {forcedHasExpandablePanel ? (
                        <div className={`w-full ${BTN_BASE} bg-gradient-to-l from-violet-500/12 to-transparent`}>
                            <div className="flex flex-row-reverse items-center gap-3">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                                    <Gavel className="h-6 w-6 text-white/70" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-white">{forcedButtonLabel}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                if (canWithdrawInvestigationPath) {
                                    setForcedBringWithdrawConfirmOpen(true);
                                    return;
                                }
                                if (forcedButtonDisabled) return;
                                if (!relaxedPersonal && !guardSummonsGate()) return;
                                if (forcedShowStartStrip) return;
                            }}
                            disabled={
                                (forcedButtonDisabled && !forcedHasExpandablePanel) ||
                                (forcedShowStartStrip && !forcedHasExpandablePanel)
                            }
                            className={`w-full ${BTN_BASE} bg-gradient-to-l from-violet-500/12 to-transparent hover:from-violet-500/18 ${(forcedButtonDisabled && !forcedHasExpandablePanel) || (forcedShowStartStrip && !forcedHasExpandablePanel) ? BTN_DISABLED : ''}`}
                        >
                            <div className="flex flex-row-reverse items-center gap-3">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                                    <Gavel className="h-6 w-6 text-white/70" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-white">{forcedButtonLabel}</p>
                                </div>
                            </div>
                        </button>
                    )}
                    {forcedEffective.pending ? (
                        <div className="border-t border-white/10 px-3 py-3">
                            <CoerciveSubsectionFold
                                flat
                                title="طلب الإحضار الجبري — قيد البت لدى المنفذ"
                                titleClassName="text-amber-100"
                            >
                                <p className="text-[10px] leading-relaxed text-amber-200/75 text-right">
                                    تم إرسال الطلب — بانتظار موافقة أو رفض المنفذ العدل.
                                </p>
                                <ExecutionInlineExecutorDecisionActions
                                    executionId={exId}
                                    decisionId={findLatestDecisionIdForSubtype('forced_bring_in') || ''}
                                    decisionRow={findLatestDecisionRowForSubtype('forced_bring_in')}
                                    requestKind="personal_coercive"
                                    personalCoerciveSubtype="forced_bring_in"
                                    suppressNavigatorToast
                                    onResolved={handleExecutorInlineResolved}
                                />
                            </CoerciveSubsectionFold>
                        </div>
                    ) : null}

                    {renderAppealSyncFollowup(forcedSync)}

                    {forcedEffective.rejected &&
                    !isExecutorRejectedAppealFollowupDismissed(
                        findLatestDecisionIdForSubtype('forced_bring_in'),
                        allDecisionRows
                    ) ? (
                        <div className="border-t border-white/10 px-3 pb-3 pt-2">
                            {renderRejectedExecutorAppealSection({
                                decisionId: findLatestDecisionIdForSubtype('forced_bring_in'),
                                personalCoerciveSubtype: 'forced_bring_in',
                            })}
                        </div>
                    ) : null}

                    {forcedShowStartStrip ? (
                        <div className="space-y-2 border-t border-white/10 px-3 pb-3 pt-2">
                            <button
                                type="button"
                                disabled={sendingKey === 'forced_bring_in'}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    runForcedBringSubmit(true);
                                }}
                                className="group w-full rounded-xl border border-[#E6C673]/35 bg-gradient-to-l from-amber-500/18 via-amber-600/10 to-violet-950/20 py-3 text-[11px] font-black text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all hover:border-[#E6C673]/55 hover:from-amber-500/28 hover:shadow-[0_0_24px_rgba(230,198,115,0.12)] disabled:opacity-50"
                            >
                                <span className="flex flex-row-reverse items-center justify-center gap-2">
                                    <Gavel
                                        size={15}
                                        className="text-[#E6C673]/85 transition-colors group-hover:text-[#E6C673]"
                                    />
                                    تفعيل بقرار المنفذ العدل
                                </span>
                            </button>
                            <RejectedExecutorResubmitStrip
                                showReplaceHint={hasOpenCardForSubtype('forced_bring_in')}
                                submitting={sendingKey === 'forced_bring_in'}
                                disabled={sendingKey === 'forced_bring_in'}
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
                                            }
                                        );
                                        return;
                                    }
                                    runForcedBringSubmit(false);
                                }}
                            />
                        </div>
                    ) : null}

                    {forcedFlowStep === 'outcome_choice' ? (
                        <div className="border-t border-white/10 px-3 pb-2 pt-3 space-y-3 text-right">
                            <div className="space-y-1.5 border-b border-white/10 pb-2">
                                <p className="text-[10px] font-bold text-emerald-200/90">
                                    {forcedByExecutorOrder
                                        ? '✓ بناء على قرار المنفذ العدل'
                                        : '✓ طلب إحضار جبري — تم الإرسال'}
                                </p>
                                {!forcedByExecutorOrder ? (
                                    <p className="text-[10px] font-bold text-emerald-200/90">
                                        ✓ قرار المنفذ — تمت الموافقة
                                    </p>
                                ) : null}
                                <p className="text-[10px] text-slate-500">
                                    {forcedByExecutorOrder
                                        ? 'الخطوة التالية: تسجيل نتيجة التنفيذ الميداني — والمدين هو الطاعن في بطاقة القرارات عند الحاجة.'
                                        : 'الخطوة التالية: تسجيل نتيجة التنفيذ الميداني.'}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[11px] font-black text-amber-100">تسجيل النتيجة</p>
                                <p className="text-[10px] text-slate-400">اختر أحد الخيارين ثم أكّد</p>
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
                                        تم إحضار المدين
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
                                    disabled={!forcedOutcomePick || coerciveUiLocked}
                                    className="w-full rounded-xl bg-gradient-to-l from-amber-500 to-yellow-600 py-2.5 text-[11px] font-black text-[#0A0F1C] disabled:opacity-40"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (forcedOutcomePick !== 'brought' && forcedOutcomePick !== 'absconded') {
                                            return;
                                        }
                                        recordForcedOutcome(forcedOutcomePick);
                                        setForcedOutcomePick('');
                                    }}
                                >
                                    تأكيد التسجيل
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
