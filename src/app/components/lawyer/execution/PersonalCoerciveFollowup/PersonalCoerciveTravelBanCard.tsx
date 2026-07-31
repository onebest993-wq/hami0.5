import React from 'react';
import { Plane, ChevronDown } from 'lucide-react';
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

export interface PersonalCoerciveTravelBanCardProps {
    show: boolean;
    travelShowInitialSubmit: boolean;
    travelSubmitButtonDisabled: boolean;
    canSubmitTravelBan: boolean;
    setConfirmingKey: (key: PersonalCoerciveActionGateKey | null) => void;
    travelButtonLabel: string;
    travelEnforcedSettled: boolean;
    travelPanelOpen: boolean;
    setTravelPanelOpen: (open: boolean) => void;
    travelAppealFollowupVisible: boolean;
    renderAppealSyncFollowup: (sync: PersonalCoerciveAppealSyncView) => React.ReactNode;
    travelSync: PersonalCoerciveAppealSyncView;
    travelShowLiftAction: boolean;
    liftTravelBanEnforcement: () => void;
    debtRemainingIqd: number;
    coerciveUiLocked: boolean;
    isHistoricalMode: boolean;
    travelBanWithdrawn: boolean;
    travelCycleActive: boolean;
    travel: PersonalCoerciveSubtypeOutcome;
    findLatestDecisionIdForSubtype: (subtype: PersonalCoerciveSubtype) => string | null;
    allDecisionRows: Record<string, unknown>[];
    renderRejectedExecutorAppealSection: (opts: {
        decisionId: string | null | undefined;
        title?: string;
        titleClassName?: string;
        requestKind?: string;
        personalCoerciveSubtype?: PersonalCoerciveSubtype;
    }) => React.ReactNode;
    exId: string;
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
    guardSummonsGate: () => boolean;
    setSendingKey: (key: PersonalCoerciveActionGateKey | null) => void;
    submitRequest: (
        subtype: PersonalCoerciveSubtype,
        title: string,
        body: string,
        opts?: { skipTimeline?: boolean; byExecutorOrder?: boolean }
    ) => Promise<string | null>;
    scopedRequestTitle: (base: string) => string;
    withdrawTravelBanRequestCycle: () => void;
    travelBanRequestCycleWithdrawn: boolean;
    travelBanEnforced: boolean;
}

/** بطاقة منع السفر — من التقديم حتى الرفع أو التراجع عن الطلب */
export function PersonalCoerciveTravelBanCard({
    show,
    travelShowInitialSubmit,
    travelSubmitButtonDisabled,
    canSubmitTravelBan,
    setConfirmingKey,
    travelButtonLabel,
    travelEnforcedSettled,
    travelPanelOpen,
    setTravelPanelOpen,
    travelAppealFollowupVisible,
    renderAppealSyncFollowup,
    travelSync,
    travelShowLiftAction,
    liftTravelBanEnforcement,
    debtRemainingIqd,
    coerciveUiLocked,
    isHistoricalMode,
    travelBanWithdrawn,
    travelCycleActive,
    travel,
    findLatestDecisionIdForSubtype,
    allDecisionRows,
    renderRejectedExecutorAppealSection,
    exId,
    findLatestDecisionRowForSubtype,
    handleExecutorInlineResolved,
    renderInlineGate,
    guardSummonsGate,
    setSendingKey,
    submitRequest,
    scopedRequestTitle,
    withdrawTravelBanRequestCycle,
    travelBanRequestCycleWithdrawn,
    travelBanEnforced,
}: PersonalCoerciveTravelBanCardProps) {
    if (!show) return null;
    return (
        <div className="relative space-y-2">
            <div className="overflow-visible rounded-2xl border border-violet-500/25 bg-violet-950/15 text-right">
                <div className="relative">
                    {travelShowInitialSubmit ? (
                        <button
                            type="button"
                            disabled={travelSubmitButtonDisabled}
                            onClick={() => {
                                if (travelSubmitButtonDisabled) return;
                                if (!canSubmitTravelBan) return;
                                setConfirmingKey('travel_ban');
                            }}
                            className={`w-full ${BTN_BASE} bg-gradient-to-l from-sky-500/12 to-transparent hover:from-sky-500/18 ${travelSubmitButtonDisabled ? BTN_DISABLED : ''}`}
                        >
                            <div className="flex flex-row-reverse items-center gap-3">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                                    <Plane className="h-6 w-6 text-white/70" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-sky-100">{travelButtonLabel}</p>
                                </div>
                            </div>
                        </button>
                    ) : travelEnforcedSettled ? (
                        <details
                            open={travelPanelOpen}
                            onToggle={(e) => setTravelPanelOpen((e.target as HTMLDetailsElement).open)}
                            className="group/travel text-right"
                        >
                            <summary className="flex cursor-pointer list-none flex-row-reverse items-center justify-between gap-2 px-4 py-3.5 transition-colors hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                                <span className="flex flex-row-reverse items-center gap-3 min-w-0">
                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                                        <Plane className="h-6 w-6 text-white/70" />
                                    </span>
                                    <span className="text-sm font-bold text-sky-100">منع سفر — مفعّل</span>
                                </span>
                                <ChevronDown
                                    size={18}
                                    className="shrink-0 text-slate-400 transition-transform duration-200 group-open/travel:rotate-180"
                                    aria-hidden
                                />
                            </summary>
                            <div className="space-y-2 border-t border-white/10 px-3 pb-3 pt-2">
                                <p className="text-[11px] font-bold text-emerald-200">
                                    تمت الموافقة فعلاً على منع المدين من السفر.
                                </p>
                                {travelAppealFollowupVisible ? renderAppealSyncFollowup(travelSync) : null}
                                {travelShowLiftAction ? (
                                    <button
                                        type="button"
                                        onClick={() => liftTravelBanEnforcement()}
                                        className="w-full rounded-xl border border-sky-400/35 bg-sky-800/45 py-2.5 text-[11px] font-bold text-sky-50 hover:bg-sky-800/60"
                                    >
                                        رفع إشارة منع السفر
                                    </button>
                                ) : debtRemainingIqd > 0 ? (
                                    <p className="text-[10px] text-sky-200/75">
                                        يُرفع منع السفر تلقائياً بعد سداد الدين بالكامل.
                                    </p>
                                ) : null}
                                <button
                                    type="button"
                                    disabled={coerciveUiLocked || isHistoricalMode}
                                    onClick={() => setConfirmingKey('travel_ban_withdraw')}
                                    className="w-full rounded-xl border border-amber-500/35 bg-amber-500/10 py-2.5 text-[11px] font-bold text-amber-100 hover:bg-amber-500/15 disabled:opacity-40"
                                >
                                    التراجع عن الطلب
                                </button>
                            </div>
                        </details>
                    ) : travelShowLiftAction ? (
                        <button
                            type="button"
                            onClick={() => liftTravelBanEnforcement()}
                            className={`w-full ${BTN_BASE} bg-gradient-to-l from-sky-500/12 to-transparent hover:from-sky-500/18`}
                        >
                            <div className="flex flex-row-reverse items-center gap-3">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                                    <Plane className="h-6 w-6 text-white/70" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-sky-100">{travelButtonLabel}</p>
                                </div>
                            </div>
                        </button>
                    ) : (
                        <div className={`w-full ${BTN_BASE} bg-gradient-to-l from-sky-500/12 to-transparent`}>
                            <div className="flex flex-row-reverse items-center gap-3">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                                    <Plane className="h-6 w-6 text-white/70" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-sky-100">{travelButtonLabel}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!travelEnforcedSettled && travelAppealFollowupVisible
                        ? renderAppealSyncFollowup(travelSync)
                        : null}

                    {!travelBanWithdrawn &&
                    travelCycleActive &&
                    (travel.pending ||
                        (travel.rejected &&
                            !isExecutorRejectedAppealFollowupDismissed(
                                findLatestDecisionIdForSubtype('travel_ban'),
                                allDecisionRows
                            ))) ? (
                        <div className="border-t border-white/10 px-3 pb-3 pt-2">
                            {travel.rejected ? (
                                renderRejectedExecutorAppealSection({
                                    decisionId: findLatestDecisionIdForSubtype('travel_ban'),
                                    personalCoerciveSubtype: 'travel_ban',
                                })
                            ) : (
                                <CoerciveSubsectionFold
                                    flat
                                    title="طلب منع السفر — قيد البت لدى المنفذ"
                                    titleClassName="text-sky-100"
                                >
                                    <ExecutionInlineExecutorDecisionActions
                                        executionId={exId}
                                        decisionId={findLatestDecisionIdForSubtype('travel_ban') || ''}
                                        decisionRow={findLatestDecisionRowForSubtype('travel_ban')}
                                        requestKind="personal_coercive"
                                        personalCoerciveSubtype="travel_ban"
                                        suppressNavigatorToast
                                        onResolved={handleExecutorInlineResolved}
                                    />
                                </CoerciveSubsectionFold>
                            )}
                        </div>
                    ) : null}

                    {travel.alternative ? (
                        <div className="border-t border-white/10 px-3 pb-3 pt-2">
                            <p className="text-[10px] text-sky-200/90">
                                🔄 سُجّل قرار بديل للمنفذ — راجع المهام ومحضر المتابعة.
                            </p>
                        </div>
                    ) : null}
                    {renderInlineGate('travel_ban', () => {
                        if (!guardSummonsGate()) {
                            setConfirmingKey(null);
                            return;
                        }
                        setSendingKey('travel_ban');
                        if (travel.pending || travel.rejected) {
                            setSendingKey(null);
                            setConfirmingKey(null);
                            return;
                        }
                        void submitRequest(
                            'travel_ban',
                            scopedRequestTitle('طلب وضع إشارة منع سفر على المدين'),
                            'طلب توجيه كتاب إلى مديرية الجوازات والإقامة لمنع سفر المدين لحين البتّ في التنفيذ.'
                        ).then(() => {
                            setSendingKey(null);
                            setConfirmingKey(null);
                        });
                    })}
                    {renderInlineGate('travel_ban_withdraw', () => withdrawTravelBanRequestCycle(), {
                        confirmLabel: 'تأكيد التراجع',
                        gateExtra: (
                            <p className="text-[10px] leading-relaxed text-amber-100/90">
                                يُغلق طلب منع السفر الحالي وتعود دورة التقديم. تبقى إشارة المنع مفعّلة حتى سداد
                                الدين بالكامل.
                            </p>
                        ),
                    })}
                </div>
            </div>
            {travelBanRequestCycleWithdrawn && travelBanEnforced && travelShowLiftAction ? (
                <div className="px-1">
                    <button
                        type="button"
                        onClick={() => liftTravelBanEnforcement()}
                        className="w-full rounded-xl border border-sky-400/35 bg-sky-800/45 py-2.5 text-[11px] font-bold text-sky-50 hover:bg-sky-800/60"
                    >
                        رفع إشارة منع السفر
                    </button>
                </div>
            ) : null}
        </div>
    );
}
