// @ts-nocheck
import React from 'react';
import { Gavel, Plane, Scale, Send, ShieldAlert, UserX } from 'lucide-react';
import { InlineActionGate } from './InlineActionGate';
import type { InlineActionGateKey } from '../types';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { ExecutorDecisionFollowupMirror } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutorDecisionFollowupMirror';
import {
    appendPersonalCoerciveExecutorRequest,
    dispatchDecisionsReload,
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    isExecutorHubRowSuperseded,
    isExecutorRowRejectedAndFinal,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    listHiddenPersonalCoerciveCatalog,
    resolveHiddenPersonalCoerciveRequests,
    type HiddenFollowupVisibilityInput,
    type HiddenPersonalCoerciveRequestKey,
} from './hiddenFollowupRequestsUtils';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import type { ExecutionDomainContext } from '@/app/utils/executionDomainIsolation';

const OPTION_ICONS: Record<
    HiddenPersonalCoerciveRequestKey,
    React.ComponentType<{ size?: number; className?: string }>
> = {
    forced_bring_in: UserX,
    travel_ban: Plane,
    arrest_warrant_investigation: ShieldAlert,
    executive_dossier_presentation: Scale,
    executive_detention_judge: Gavel,
};

function gateKeyForOption(key: HiddenPersonalCoerciveRequestKey): InlineActionGateKey | null {
    if (key === 'forced_bring_in') return 'hidden_pc_forced_bring';
    if (key === 'travel_ban') return 'hidden_pc_travel_ban';
    if (key === 'arrest_warrant_investigation') return 'hidden_pc_arrest';
    if (key === 'executive_dossier_presentation') return 'hidden_pc_dossier';
    return null;
}

export interface HiddenPersonalCoerciveRequestOptionsProps {
    executionId: string;
    flags: HiddenFollowupVisibilityInput;
    domainContext?: ExecutionDomainContext | null;
    /** عند التضمين من قائمة موحّدة — يُعرض لوحة التفاصيل فقط */
    embeddedSelectedKey?: HiddenPersonalCoerciveRequestKey;
    decisions: Record<string, unknown>[];
    coerciveUiLocked: boolean;
    isHistoricalMode: boolean;
    activeDebtorKey?: string;
    primaryDebtorKey?: string;
    kasabRelaxedGates?: boolean;
    forcedSummonAllowed?: boolean;
    forcedSummonLockReason?: string;
    onOpenSummonsCenter?: () => void;
    showToast: (
        message: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        opts?: { decisionsLink?: boolean; decisionId?: string; decisionsTab?: 'current' | 'previous' | 'appeals' }
    ) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    onOpenDecisions: (opts?: {
        tab?: 'current' | 'previous' | 'appeals';
        decisionId?: string | null;
    }) => void;
    appealPerspective?: AppealUiPerspective;
}

export const HiddenPersonalCoerciveRequestOptions: React.FC<HiddenPersonalCoerciveRequestOptionsProps> = ({
    executionId,
    flags,
    domainContext = null,
    embeddedSelectedKey,
    decisions,
    coerciveUiLocked,
    isHistoricalMode,
    activeDebtorKey = '',
    primaryDebtorKey = '',
    kasabRelaxedGates = false,
    forcedSummonAllowed = false,
    forcedSummonLockReason = '',
    onOpenSummonsCenter,
    showToast,
    persistExecutionMerge,
    onOpenDecisions,
    appealPerspective = 'creditor_agent',
}) => {
    const exId = String(executionId || '').trim();
    const catalog = React.useMemo(
        () => listHiddenPersonalCoerciveCatalog(flags, domainContext),
        [flags, domainContext]
    );
    const resolved = React.useMemo(
        () => resolveHiddenPersonalCoerciveRequests(flags, decisions),
        [flags, decisions]
    );
    const [selectedKey, setSelectedKey] = React.useState<HiddenPersonalCoerciveRequestKey | null>(
        embeddedSelectedKey ?? null
    );
    const [inlineGateKey, setInlineGateKey] = React.useState<InlineActionGateKey | null>(null);
    const [submitting, setSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (embeddedSelectedKey) {
            setSelectedKey(embeddedSelectedKey);
        }
    }, [embeddedSelectedKey]);

    const effectiveKey = embeddedSelectedKey ?? selectedKey;
    const selectedCatalog = catalog.find((x) => x.key === effectiveKey) ?? null;
    const selectedResolved = resolved.find((x) => x.key === effectiveKey) ?? null;

    const governingRow = React.useMemo(() => {
        if (!selectedCatalog?.subtype) return null;
        return getGoverningPersonalCoerciveSubtypeRowFromDecisions(decisions, selectedCatalog.subtype);
    }, [decisions, selectedCatalog?.subtype]);

    const submitDisabledReason = React.useMemo(() => {
        if (!selectedCatalog?.subtype || !selectedCatalog.submitTitle) {
            return 'يُتابَع بعد موافقة المنفذ على عرض الإضبارة.';
        }
        if (isHistoricalMode || coerciveUiLocked) return 'الوضع مقفل — لا يمكن إرسال طلب جديد.';
        const status = selectedResolved?.status;
        if (status === 'pending') return 'يوجد طلب قيد البت لدى المنفذ.';
        if (status === 'approved') return 'الطلب موافق عليه — تابع الإكمال من القرارات.';
        return '';
    }, [
        coerciveUiLocked,
        isHistoricalMode,
        selectedCatalog,
        selectedResolved?.status,
    ]);

    const runSubmit = React.useCallback(
        async (subtype: PersonalCoerciveSubtype, title: string, body: string) => {
            if (!exId || isHistoricalMode || coerciveUiLocked) return;
            setSubmitting(true);
            try {
                const submitted = appendPersonalCoerciveExecutorRequest({
                    executionId: exId,
                    subtype,
                    title,
                    body,
                    debtorKey: activeDebtorKey,
                    primaryDebtorKey,
                });
                if (!submitted.ok || !submitted.decisionId) {
                    showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', {
                        decisionsLink: true,
                    });
                    return;
                }
                if (subtype === 'forced_bring_in') {
                    persistExecutionMerge({
                        forced_bring_in_personal_outcome: null,
                        forced_bring_in_personal_followup_logged: false,
                    });
                }
                if (subtype === 'travel_ban') {
                    persistExecutionMerge({ travel_ban_withdrawn_at: null });
                }
                if (subtype === 'executive_dossier_presentation') {
                    persistExecutionMerge({
                        executive_dossier_phase: null,
                        executive_detention_judge_outcome: null,
                        executive_detention_judge_eligible_decision_id: null,
                    });
                }
                dispatchDecisionsReload();
                showToast('تم حفظ الطلب وتحويله إلى مركز القرارات بانتظار موافقة المنفذ.', 'success', {
                    decisionsLink: true,
                    decisionId: submitted.decisionId,
                    decisionsTab: 'previous',
                });
            } finally {
                setSubmitting(false);
                setInlineGateKey(null);
            }
        },
        [
            activeDebtorKey,
            coerciveUiLocked,
            exId,
            isHistoricalMode,
            persistExecutionMerge,
            primaryDebtorKey,
            showToast,
        ]
    );

    const steps: ExecutionInlineStep[] = React.useMemo(() => {
        const row = governingRow as Record<string, unknown> | null;
        if (!row?.id || !selectedCatalog) return [];
        const decisionId = String(row.id || '').trim();
        const rejected = isExecutorRowRejectedAndFinal(row);
        const rejectedClosed = rejected && isExecutorHubRowSuperseded(row);
        const pending =
            String(row.executorOutcome ?? 'pending') === 'pending' ||
            String(row.executorOutcome ?? '') === '';
        const approved = !rejected && !pending;
        return [
            {
                id: `hidden-pc:${selectedCatalog.key}:submit`,
                title: String(row.title || selectedCatalog.label).trim(),
                subtitle: 'تم إرسال الطلب إلى مركز القرارات',
                status: 'done',
                tone: 'success',
            },
            {
                id: `hidden-pc:${selectedCatalog.key}:executor`,
                title: 'قرار المنفذ',
                subtitle: rejected
                    ? 'تم رفض الطلب'
                    : pending
                      ? 'قيد البت لدى المنفذ'
                      : approved
                        ? appealPerspective === 'debtor_agent'
                            ? 'موافقة ضد موكّلك'
                            : 'تمت الموافقة'
                        : '—',
                status: rejectedClosed ? 'done' : rejected || pending ? 'active' : 'done',
                tone:
                    rejected
                        ? 'danger'
                        : approved
                          ? appealPerspective === 'debtor_agent'
                              ? 'danger'
                              : 'success'
                          : 'neutral',
                content:
                    rejected && !rejectedClosed ? (
                        <ExecutorDecisionFollowupMirror
                            executionId={exId}
                            row={row}
                            requestKind="personal_coercive"
                            compact
                            appealPerspective={appealPerspective}
                        />
                    ) : pending ? (
                        <ExecutionInlineExecutorDecisionActions
                            executionId={exId}
                            decisionId={decisionId}
                            requestKind="personal_coercive"
                        />
                    ) : approved ? (
                        appealPerspective === 'debtor_agent' ? (
                            <ExecutorDecisionFollowupMirror
                                executionId={exId}
                                row={row}
                                requestKind="personal_coercive"
                                compact
                                appealPerspective={appealPerspective}
                            />
                        ) : (
                            <button
                                type="button"
                                onClick={() =>
                                    onOpenDecisions({
                                        tab: 'previous',
                                        decisionId,
                                    })
                                }
                                className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-[10px] font-bold text-emerald-100 hover:bg-emerald-500/15"
                            >
                                متابعة الإكمال في القرارات
                            </button>
                        )
                    ) : undefined,
            },
        ];
    }, [appealPerspective, exId, governingRow, onOpenDecisions, selectedCatalog]);

    const activeGate = effectiveKey ? gateKeyForOption(effectiveKey) : null;

    if (catalog.length === 0) return null;
    if (!selectedCatalog) return null;

    const detailPanel = (
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3">
            <p className="text-[9px] text-slate-400 text-right">{selectedResolved?.statusLabel}</p>

            {selectedCatalog.subtype && selectedCatalog.submitTitle ? (
                <div className="relative">
                    <button
                        type="button"
                        disabled={Boolean(submitDisabledReason) || submitting}
                        onClick={() => {
                            if (submitDisabledReason) {
                                showToast(submitDisabledReason, 'warning');
                                return;
                            }
                            const gate = gateKeyForOption(selectedCatalog.key);
                            if (gate) setInlineGateKey(gate);
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-700/70 py-2.5 text-[11px] font-bold text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Send size={13} />
                        إرسال الطلب إلى المنفذ
                    </button>
                    {activeGate && inlineGateKey === activeGate ? (
                        <InlineActionGate
                            gateKey={activeGate}
                            activeKey={inlineGateKey}
                            onConfirm={() => {
                                void runSubmit(
                                    selectedCatalog.subtype!,
                                    selectedCatalog.submitTitle!,
                                    selectedCatalog.submitBody || ''
                                );
                            }}
                            onCancel={() => setInlineGateKey(null)}
                        />
                    ) : null}
                </div>
            ) : (
                <p className="text-[10px] leading-relaxed text-slate-400">
                    يُسجَّل قرار قاضي البداءة بعد موافقة المنفذ على عرض الإضبارة — تابع من مركز
                    القرارات.
                </p>
            )}

            {governingRow && steps.length > 0 ? <ExecutionInlineAccordion steps={steps} /> : null}
        </div>
    );

    if (embeddedSelectedKey) {
        return detailPanel;
    }

    return (
        <div className="space-y-3 border-t border-white/8 pt-3">
            {!selectedKey ? (
                <div className="grid grid-cols-2 gap-2">
                    {catalog.map((item) => {
                        const Icon = OPTION_ICONS[item.key];
                        const itemStatus = resolved.find((x) => x.key === item.key)?.status;
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setSelectedKey(item.key)}
                                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[10px] font-bold text-slate-300 transition-all hover:border-emerald-500/35 hover:bg-emerald-950/25 hover:text-emerald-100"
                            >
                                <Icon size={16} className="shrink-0 opacity-70" />
                                <span className="leading-tight text-right flex-1">{item.shortLabel}</span>
                                {itemStatus === 'pending' ? (
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                                ) : null}
                                {itemStatus === 'approved' ? (
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                                ) : null}
                            </button>
                        );
                    })}
                </div>
            ) : (
                <>
                    <button
                        type="button"
                        onClick={() => setSelectedKey(null)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[9px] font-bold text-slate-300 hover:text-emerald-100"
                    >
                        رجوع
                    </button>
                    {detailPanel}
                </>
            )}
        </div>
    );
};
