import React from 'react';
import { Gavel } from '@/app/components/ui/icons/Gavel';
import { Plane } from '@/app/components/ui/icons/Plane';
import { Scale } from '@/app/components/ui/icons/Scale';
import { ShieldAlert } from '@/app/components/ui/icons/ShieldAlert';
import { UserX } from '@/app/components/ui/icons/UserX';
import { InlineActionGate } from './InlineActionGate';
import type { InlineActionGateKey } from '../types';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { ExecutorDecisionFollowupMirror } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutorDecisionFollowupMirror';
import {
    isExecutorHubRowSuperseded,
    isExecutorRowRejectedAndFinal,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    listHiddenPersonalCoerciveCatalog,
    resolveHiddenPersonalCoerciveRequests,
    type HiddenPersonalCoerciveRequestKey,
} from './hiddenFollowupRequestsUtils';
import {
    HIDDEN_FOLLOWUP_PENDING_REASON,
    HiddenFollowupBackButton,
    HiddenFollowupCatalogGrid,
    HiddenFollowupCatalogPickerButton,
    HiddenFollowupDecisionsFollowupButton,
    HiddenFollowupDetailPanel,
    HiddenFollowupStatusLabel,
    HiddenFollowupSubmitButton,
    openHiddenFollowupSubmitOrWarn,
} from './hiddenFollowup/shared';

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


export function buildHiddenPersonalCoerciveSteps(args: {
    governingRow: Record<string, unknown> | null;
    selectedCatalog: { key: string; label: string; subtype?: string } | null | undefined;
    appealPerspective: import('@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels').AppealUiPerspective;
    exId: string;
    onOpenDecisions: (opts?: { tab?: 'current' | 'previous' | 'appeals'; decisionId?: string | null }) => void;
}): import('./ExecutionInlineAccordion').ExecutionInlineStep[] {
    const { governingRow, selectedCatalog, appealPerspective, exId, onOpenDecisions } = args;
    const row = governingRow;
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
                        <HiddenFollowupDecisionsFollowupButton
                            label="متابعة الإكمال في القرارات"
                            onClick={() =>
                                onOpenDecisions({
                                    tab: 'previous',
                                    decisionId,
                                })
                            }
                        />
                    )
                ) : undefined,
        },
    ];
}

export function HiddenPersonalCoerciveRequestViews(props: {
    catalog: ReturnType<typeof listHiddenPersonalCoerciveCatalog>;
    resolved: ReturnType<typeof resolveHiddenPersonalCoerciveRequests>;
    selectedCatalog: NonNullable<ReturnType<typeof listHiddenPersonalCoerciveCatalog>[number]>;
    selectedResolved: ReturnType<typeof resolveHiddenPersonalCoerciveRequests>[number] | null | undefined;
    selectedKey: import('./hiddenFollowupRequestsUtils').HiddenPersonalCoerciveRequestKey | null;
    setSelectedKey: (k: import('./hiddenFollowupRequestsUtils').HiddenPersonalCoerciveRequestKey | null) => void;
    embeddedSelectedKey?: import('./hiddenFollowupRequestsUtils').HiddenPersonalCoerciveRequestKey;
    effectiveKey: import('./hiddenFollowupRequestsUtils').HiddenPersonalCoerciveRequestKey | null;
    governingRow: Record<string, unknown> | null;
    steps: import('./ExecutionInlineAccordion').ExecutionInlineStep[];
    submitDisabledReason: string;
    submitting: boolean;
    showToast: (
        message: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        opts?: { decisionsLink?: boolean; decisionId?: string; decisionsTab?: 'current' | 'previous' | 'appeals' }
    ) => void;
    setInlineGateKey: (k: InlineActionGateKey | null) => void;
    inlineGateKey: InlineActionGateKey | null;
    runSubmit: (subtype: PersonalCoerciveSubtype, title: string, body: string) => Promise<void>;
}) {
    const {
        catalog,
        resolved,
        selectedCatalog,
        selectedResolved,
        selectedKey,
        setSelectedKey,
        embeddedSelectedKey,
        effectiveKey,
        governingRow,
        steps,
        submitDisabledReason,
        submitting,
        showToast,
        setInlineGateKey,
        inlineGateKey,
        runSubmit,
    } = props;
    const activeGate = effectiveKey ? gateKeyForOption(effectiveKey) : null;

    const detailPanel = (
        <HiddenFollowupDetailPanel>
            <HiddenFollowupStatusLabel>{selectedResolved?.statusLabel}</HiddenFollowupStatusLabel>

            {selectedCatalog.subtype && selectedCatalog.submitTitle ? (
                <div className="relative">
                    <HiddenFollowupSubmitButton
                        disabled={Boolean(submitDisabledReason) || submitting}
                        label="إرسال الطلب إلى المنفذ"
                        onClick={() =>
                            openHiddenFollowupSubmitOrWarn(submitDisabledReason, showToast, () => {
                                const gate = gateKeyForOption(selectedCatalog.key);
                                if (gate) setInlineGateKey(gate);
                            })
                        }
                    />
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
        </HiddenFollowupDetailPanel>
    );

    if (embeddedSelectedKey) {
        return detailPanel;
    }

    return (
        <div className="space-y-3 border-t border-white/8 pt-3">
            {!selectedKey ? (
                <HiddenFollowupCatalogGrid>
                    {catalog.map((item) => {
                        const Icon = OPTION_ICONS[item.key];
                        const itemStatus = resolved.find((x) => x.key === item.key)?.status;
                        const statusDot =
                            itemStatus === 'pending' || itemStatus === 'approved'
                                ? itemStatus
                                : null;
                        return (
                            <HiddenFollowupCatalogPickerButton
                                key={item.key}
                                label={item.shortLabel}
                                Icon={Icon}
                                onClick={() => setSelectedKey(item.key)}
                                statusDot={statusDot}
                            />
                        );
                    })}
                </HiddenFollowupCatalogGrid>
            ) : (
                <>
                    <HiddenFollowupBackButton onClick={() => setSelectedKey(null)} />
                    {detailPanel}
                </>
            )}
        </div>
    );
}
