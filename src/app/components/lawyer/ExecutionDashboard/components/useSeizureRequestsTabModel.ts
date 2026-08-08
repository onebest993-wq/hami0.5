// @ts-nocheck
import React from 'react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import type { InlineActionGateKey } from '../types';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    DECISIONS_RELOAD_EVENT,
    appendPendingExecutorSeizureDecision,
    closeSeizureSubtypeDecisionCycle,
    getGoverningSeizureDecisionBySubtype,
    isExecutorRowRejectedAndFinal,
    isGuarantorRequestDecisionRow,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import type { SeizureMatrixButtonKey, SeizureMatrixResult } from '@/app/utils/seizureMatrix';
import { resolveSeizureMatrixFromExecution } from '@/app/utils/seizureMatrix';
import { shouldShowGuarantorRequestInSeizureTab } from './hiddenFollowupRequestsUtils';
import { isSalarySeizureAsset } from '@/app/components/lawyer/ExecutionDashboard/hooks/useSeizureRegistryAssets';
import { isSalarySeizureLaneOccupied } from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureTabUtils';
import { isFollowupRequestKindAllowed } from '@/app/utils/executionDomainIsolation';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import {
    SEIZURE_LOG_TAB_SUBTYPE,
    isSeizureRegistrationComplete,
    isSeizureRequestFullyRegistered,
    openUnifiedSeizureLogTab,
    resolveGoverningSalaryDecision,
    type UnifiedSeizureLogTab,
} from './seizureRequestsTabHelpers';
import { useSeizureInlineFocusBridge } from '@/app/components/lawyer/ExecutionDashboard/hooks/useSeizureInlineFocusBridge';
import {
    resolveGoverningMovableDecision,
    resolveGoverningPropertyDecision,
    resolveGoverningThirdPartyDecision,
} from '@/app/components/lawyer/ExecutionDashboard/utils/seizureInlineFocusUtils';
import { buildSeizureRegistryDraftPatch } from '@/app/components/lawyer/ExecutionDashboard/helpers/seizureRegistryBridge';
import {
    buildPendingSeizureDraftAsset,
    dispatchOpenSeizureCompletion,
    mergeSeizureDraftPatch,
} from '@/app/components/lawyer/ExecutionDashboard/utils/seizureSalaryRequestFlow';

export type UseSeizureRequestsTabModelParams = {
    executionId: string | undefined;
    executionData: ExecutionFile | null;
    remainingBalanceIqd?: number;
    seizureMatrix?: SeizureMatrixResult;
    saveCoerciveAction: (actionType: string, details: Record<string, string>) => void;
    pushTimelineEvent: (event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void;
    nextTimelineId: () => string;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info', options?: any) => void;
    activeDebtorIsDeceased: boolean;
    activeDebtorIsEmployee?: boolean;
    executionCoerciveButtonDisabled: boolean;
    coerciveUiLocked: boolean;
    isHistoricalMode: boolean;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    requestFollowupSeizureDecision: (subtype: 'third_party', title: string, body: string) => void;
    hideAllGuarantorPresence?: boolean;
    financialGuarantorRequestOnly?: boolean;
    isFinancialDebtCollectionClaim?: boolean;
    settlementBreachTriggeredAt?: string | null;
    ledgerPendingSettlement?: unknown;
    persistExecutionMerge?: (patch: Record<string, unknown>) => void;
};

export function useSeizureRequestsTabModel({
    executionId,
    executionData,
    remainingBalanceIqd = 0,
    seizureMatrix: seizureMatrixProp,
    saveCoerciveAction,
    pushTimelineEvent,
    nextTimelineId,
    showToast,
    activeDebtorIsDeceased,
    activeDebtorIsEmployee = false,
    executionCoerciveButtonDisabled,
    coerciveUiLocked,
    isHistoricalMode,
    inlineActionGateKey,
    setInlineActionGateKey,
    requestFollowupSeizureDecision,
    hideAllGuarantorPresence = false,
    financialGuarantorRequestOnly = false,
    isFinancialDebtCollectionClaim = false,
    settlementBreachTriggeredAt = null,
    ledgerPendingSettlement = null,
    persistExecutionMerge,
}: UseSeizureRequestsTabModelParams) {
    const seizureMatrix = React.useMemo(
        () =>
            seizureMatrixProp ??
            resolveSeizureMatrixFromExecution({
                remainingBalanceIqd,
                executionData,
                activeDebtorIsEmployee,
            }),
        [seizureMatrixProp, remainingBalanceIqd, executionData, activeDebtorIsEmployee]
    );
    const matrixBlocksSeizure = seizureMatrix.allSeizureDisabled;
    const domainBlocksSeizure = React.useMemo(() => {
        const gate = isFollowupRequestKindAllowed(
            executionData as Record<string, unknown> | null | undefined,
            executionId,
            'seizure'
        );
        return !gate.allowed;
    }, [executionData, executionId]);
    const effectiveMatrixBlocksSeizure = matrixBlocksSeizure || domainBlocksSeizure;
    const progressive = seizureMatrix.progressiveDisclosure;
    const seizureActionsDisabled =
        executionCoerciveButtonDisabled || isHistoricalMode || effectiveMatrixBlocksSeizure;

    const [additionalSeizureExpanded, setAdditionalSeizureExpanded] = React.useState(false);
    const [maximumSeizureExpanded, setMaximumSeizureExpanded] = React.useState(false);

    React.useEffect(() => {
        setAdditionalSeizureExpanded(false);
        setMaximumSeizureExpanded(false);
    }, [
        seizureMatrix.ruleId,
        seizureMatrix.remainingBalanceIqd,
        seizureMatrix.buttons.salary,
        seizureMatrix.buttons.movable,
        seizureMatrix.buttons.third_party,
        seizureMatrix.buttons.property,
    ]);

    const financialCenterBalanceIqd = Math.max(
        0,
        Math.round(Number(seizureMatrix.remainingBalanceIqd ?? remainingBalanceIqd) || 0)
    );

    const matrixRecommendsButton = React.useCallback(
        (key: SeizureMatrixButtonKey) => {
            if (!seizureMatrix.showTabContentButtons || effectiveMatrixBlocksSeizure) return false;
            if (key === 'salary' && (activeDebtorIsEmployee || activeDebtorIsDeceased)) {
                return financialCenterBalanceIqd > 0;
            }
            return Boolean(seizureMatrix.buttons[key]);
        },
        [
            activeDebtorIsDeceased,
            activeDebtorIsEmployee,
            financialCenterBalanceIqd,
            effectiveMatrixBlocksSeizure,
            seizureMatrix.buttons,
            seizureMatrix.showTabContentButtons,
        ]
    );

    const showRecommendedButton = React.useCallback(
        (key: SeizureMatrixButtonKey) => {
            if (key === 'salary') {
                return matrixRecommendsButton('salary');
            }
            return matrixRecommendsButton(key);
        },
        [matrixRecommendsButton]
    );

    const showManualButton = React.useCallback(
        (key: SeizureMatrixButtonKey, tier: 'additional' | 'maximum') => {
            if (!seizureMatrix.showTabContentButtons || effectiveMatrixBlocksSeizure) return false;
            if (tier === 'additional') {
                return additionalSeizureExpanded && progressive.additionalButtons.includes(key);
            }
            return maximumSeizureExpanded && progressive.maximumButtons.includes(key);
        },
        [
            additionalSeizureExpanded,
            maximumSeizureExpanded,
            effectiveMatrixBlocksSeizure,
            progressive.additionalButtons,
            progressive.maximumButtons,
            seizureMatrix.showTabContentButtons,
        ]
    );

    const domainAllowsGuarantorRequest = React.useMemo(() => {
        return isFollowupRequestKindAllowed(
            executionData as Record<string, unknown> | null | undefined,
            executionId,
            'guarantor_request'
        ).allowed;
    }, [executionData, executionId]);
    const showGuarantorRequestInTab =
        domainAllowsGuarantorRequest &&
        shouldShowGuarantorRequestInSeizureTab(
            {
                hideAllGuarantorPresence,
                isFinancialDebtCollection: isFinancialDebtCollectionClaim,
                showFinancialGuarantorRequestOnly: financialGuarantorRequestOnly,
            } as Parameters<typeof shouldShowGuarantorRequestInSeizureTab>[0],
            {
                executionData,
                financialCenterTotalIqd: financialCenterBalanceIqd,
                settlementBreachTriggeredAt,
                ledgerPendingSettlement,
                activeDebtorIsDeceased,
                activeDebtorIsEmployee,
            }
        );
    const normalizeExecutionId = React.useCallback((v: unknown): string => {
        const s = String(v ?? '').trim();
        if (!s) return '';
        if (s === 'undefined' || s === 'null') return '';
        return s;
    }, []);
    const executionIdsForDecisions = React.useMemo(() => {
        const ids = [normalizeExecutionId(executionId), normalizeExecutionId(executionData?.id)]
            .map((x) => String(x || '').trim())
            .filter(Boolean);
        return Array.from(new Set(ids));
    }, [executionData?.id, executionId, normalizeExecutionId]);
    const resolvedExecutionId = executionIdsForDecisions[0] || '';

    const { inlineFocusMovableDecisionId, inlineFocusPropertyDecisionId, inlineFocusThirdPartyDecisionId } = useSeizureInlineFocusBridge({
        executionIds: executionIdsForDecisions,
        setAdditionalSeizureExpanded,
        setMaximumSeizureExpanded,
    });

    const [guarantorExistingWarningOpen, setGuarantorExistingWarningOpen] = React.useState(false);
    const [lastSalaryDecisionId, setLastSalaryDecisionId] = React.useState('');

    const readAllDecisions = React.useCallback((): Record<string, unknown>[] => {
        const merged: Record<string, unknown>[] = [];
        for (const id of executionIdsForDecisions) {
            merged.push(...readExecutorDecisionsArray(id));
        }
        const byId = new Map<string, Record<string, unknown>>();
        for (const row of merged) {
            const rid = String((row as any)?.id ?? '').trim();
            if (!rid) continue;
            const prev = byId.get(rid);
            if (!prev) {
                byId.set(rid, row);
                continue;
            }
            const a = String((prev as any)?.resolvedAt ?? (prev as any)?.date ?? '');
            const b = String((row as any)?.resolvedAt ?? (row as any)?.date ?? '');
            if (b.localeCompare(a, undefined, { numeric: true }) > 0) byId.set(rid, row);
        }
        return Array.from(byId.values());
    }, [executionIdsForDecisions]);

    const [decisions, setDecisions] = React.useState<Record<string, unknown>[]>(() => readAllDecisions());
    React.useEffect(() => {
        const sync = () => setDecisions(readAllDecisions());
        sync();
        window.addEventListener(DECISIONS_RELOAD_EVENT, sync);
        window.addEventListener('hami-execution-decision-outcome', sync as EventListener);
        window.addEventListener('focus', sync);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, sync);
            window.removeEventListener('hami-execution-decision-outcome', sync as EventListener);
            window.removeEventListener('focus', sync);
        };
    }, [readAllDecisions]);

    const [thirdPartyNameDraft, setThirdPartyNameDraft] = React.useState('');
    const [thirdPartyAmountDraft, setThirdPartyAmountDraft] = React.useState('');
    const [propertyDetailsDraftByDecisionId, setPropertyDetailsDraftByDecisionId] = React.useState<Record<string, { propertyNumber: string; propertyDistrict: string; propertyType: string }>>({});
    const [vehicleDetailsDraftByDecisionId, setVehicleDetailsDraftByDecisionId] = React.useState<
        Record<string, { movableDescription: string; movableLocation: string }>
    >({});

    const openAppeals = React.useCallback(
        (decisionId?: string) => {
            if (!resolvedExecutionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: {
                            executionId: resolvedExecutionId,
                            tab: 'appeals',
                            decisionId: decisionId || undefined,
                        },
                    })
                );
            } catch {}
        },
        [resolvedExecutionId]
    );

    const openDecisions = React.useCallback(
        (decisionId?: string) => {
            if (!resolvedExecutionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: {
                            executionId: resolvedExecutionId,
                            tab: 'current',
                            decisionId: decisionId || undefined,
                        },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [resolvedExecutionId]
    );

    const openGuarantorDetails = React.useCallback(
        (decisionId?: string) => {
            if (!resolvedExecutionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-guarantor-details', {
                        detail: {
                            executionId: resolvedExecutionId,
                            decisionId: decisionId || undefined,
                        },
                    })
                );
            } catch {}
        },
        [resolvedExecutionId]
    );

    const findLatestGuarantorDecision = React.useMemo(() => {
        const row = decisions.find((r) => isGuarantorRequestDecisionRow(r));
        return (row as any) || null;
    }, [decisions]);

    const acknowledgeSeizureRequestFromLog = React.useCallback(
        (tab: UnifiedSeizureLogTab) => {
            if (!resolvedExecutionId) return;
            openUnifiedSeizureLogTab(tab);
            window.setTimeout(() => {
                closeSeizureSubtypeDecisionCycle({
                    executionId: resolvedExecutionId,
                    subtype: SEIZURE_LOG_TAB_SUBTYPE[tab],
                });
            }, 0);
        },
        [resolvedExecutionId]
    );

    const thirdPartyDecision = React.useMemo(
        () =>
            resolveGoverningThirdPartyDecision(
                resolvedExecutionId,
                decisions,
                inlineFocusThirdPartyDecisionId,
            ),
        [resolvedExecutionId, decisions, inlineFocusThirdPartyDecisionId],
    );
    const salaryDecision = React.useMemo(
        () => resolveGoverningSalaryDecision(resolvedExecutionId, decisions),
        [resolvedExecutionId, decisions],
    );

    React.useEffect(() => {
        const did = String((salaryDecision as any)?.id || '').trim();
        if (!did) return;
        setLastSalaryDecisionId(did);
    }, [salaryDecision]);
    const propertyDecision = React.useMemo(
        () =>
            resolveGoverningPropertyDecision(
                resolvedExecutionId,
                decisions,
                inlineFocusPropertyDecisionId,
            ),
        [resolvedExecutionId, decisions, inlineFocusPropertyDecisionId],
    );
    const movableDecision = React.useMemo(
        () =>
            resolveGoverningMovableDecision(
                resolvedExecutionId,
                decisions,
                inlineFocusMovableDecisionId,
            ),
        [resolvedExecutionId, decisions, inlineFocusMovableDecisionId],
    );

    const submitBasicSeizureRequest = React.useCallback(
        (args: { actionType: 'salary' | 'property' | 'vehicle'; title: string; body: string; subtype: any }) => {
            const exId = resolvedExecutionId;
            if (!exId) return null;
            if (
                args.actionType === 'salary' &&
                isSalarySeizureLaneOccupied({
                    seizedAssets: executionData?.seizedAssets,
                    seizureDraftsByDecisionId: executionData?.seizureDraftsByDecisionId as
                        | Record<string, import('@/app/types/execution').SeizedAsset>
                        | undefined,
                })
            ) {
                showToast('يوجد حجز راتب نشط أو طلب قيد البت — لا يمكن التكرار قبل فك الحجز.', 'warning');
                return null;
            }
            const decisionId = appendPendingExecutorSeizureDecision({
                executionId: exId,
                requestTitle: `${args.title} — قيد البت لدى المنفذ`,
                requestBody: args.body,
                seizureSubtype: args.subtype,
            } as any);
            if (!decisionId) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning');
                return null;
            }
            const nowIso = new Date().toISOString();
            pushTimelineEvent(
                {
                    id: nextTimelineId(),
                    type: 'decision',
                    title: `📋 ${args.title} — قيد البت`,
                    description: args.body,
                    date: nowIso.slice(0, 10),
                    timestamp: nowIso,
                    source: 'التنفيذ والمحجوزات',
                    metadata: { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId },
                } as any
            );
            showToast('تم إنشاء الطلب — قرار المنفذ يظهر هنا مباشرة.', 'success');
            if (persistExecutionMerge && decisionId) {
                if (args.actionType === 'third_party') {
                    const draftPatch = buildSeizureRegistryDraftPatch(
                        executionData as Record<string, unknown> | null | undefined,
                        decisionId,
                        'third_party',
                        { title: args.title },
                    );
                    if (draftPatch) persistExecutionMerge(draftPatch);
                } else {
                    const uiActionType =
                        args.actionType === 'vehicle' ? 'vehicle' : args.actionType === 'salary' ? 'salary' : 'property';
                    const draft = buildPendingSeizureDraftAsset({
                        decisionId,
                        actionType: uiActionType,
                        activeDebtorIsDeceased,
                    });
                    const nextDrafts = mergeSeizureDraftPatch(
                        executionData?.seizureDraftsByDecisionId as
                            | Record<string, import('@/app/types/execution').SeizedAsset>
                            | undefined,
                        decisionId,
                        draft,
                    );
                    persistExecutionMerge({ seizureDraftsByDecisionId: nextDrafts });
                }
            }
            return decisionId;
        },
        [
            appendPendingExecutorSeizureDecision,
            activeDebtorIsDeceased,
            executionData?.seizedAssets,
            executionData?.seizureDraftsByDecisionId,
            nextTimelineId,
            persistExecutionMerge,
            pushTimelineEvent,
            resolvedExecutionId,
            showToast,
        ]
    );

    const salaryRowForUi = React.useMemo(() => {
        const direct = salaryDecision as any;
        if (direct?.id) return direct;
        const did = String(lastSalaryDecisionId || '').trim();
        if (!did) return null;
        const found = decisions.find((r) => String((r as any)?.id || '').trim() === did) as any;
        if (found?.id) return found;
        return {
            id: did,
            title: activeDebtorIsDeceased ? 'طلب حجز الحوافز والمخصصات' : 'طلب حجز راتب',
            requestKind: 'seizure',
            seizureSubtype: 'salary',
            executorOutcome: 'pending',
        } as any;
    }, [activeDebtorIsDeceased, decisions, lastSalaryDecisionId, salaryDecision]);

    const hasActiveSalarySeizure = React.useMemo(
        () =>
            (executionData?.seizedAssets || []).some(
                (a) => isSalarySeizureAsset(a) && String(a.status || '') === 'seized'
            ),
        [executionData?.seizedAssets]
    );

    const salaryLaneOccupied = React.useMemo(
        () =>
            isSalarySeizureLaneOccupied({
                seizedAssets: executionData?.seizedAssets,
                seizureDraftsByDecisionId: executionData?.seizureDraftsByDecisionId as
                    | Record<string, import('@/app/types/execution').SeizedAsset>
                    | undefined,
            }),
        [executionData?.seizedAssets, executionData?.seizureDraftsByDecisionId]
    );

    const salaryRequestOpen = React.useMemo(() => {
        const row = salaryRowForUi;
        if (!row?.id) return salaryLaneOccupied;
        if (isExecutorRowRejectedAndFinal(row)) return false;
        const pending =
            String(row.executorOutcome ?? 'pending') === 'pending' ||
            String(row.executorOutcome ?? '') === '';
        const approvedNotSaved =
            isExecutorRowApprovedWorkflowActive(row, decisions) &&
            !String(row.seizureRequestSavedAt || '').trim();
        return salaryLaneOccupied || pending || approvedNotSaved;
    }, [decisions, salaryLaneOccupied, salaryRowForUi]);

    const salaryRequestSettled = React.useMemo(
        () =>
            hasActiveSalarySeizure ||
            (salaryRowForUi ? isSeizureRequestFullyRegistered(salaryRowForUi, decisions) : false),
        [decisions, hasActiveSalarySeizure, salaryRowForUi]
    );
    const salaryLogReady = React.useMemo(
        () =>
            hasActiveSalarySeizure ||
            (salaryRowForUi ? isSeizureRegistrationComplete(salaryRowForUi, decisions) : false),
        [decisions, hasActiveSalarySeizure, salaryRowForUi]
    );
    const salaryRegistrationAckReady = React.useMemo(
        () => Boolean(salaryRowForUi && isSeizureRegistrationComplete(salaryRowForUi, decisions)),
        [decisions, salaryRowForUi]
    );

    const openSalarySeizureRequest = React.useCallback(async () => {
        if (seizureActionsDisabled) return;
        if (hasActiveSalarySeizure) {
            const open = await SmartDialog.confirm(
                'تم حجز الراتب فعلاً. هل تريد فتح الطلب؟',
                {
                    title: 'حجز الراتب',
                    confirmText: 'فتح الطلب',
                    cancelText: 'إلغاء',
                }
            );
            if (!open) return;
            const did = String(salaryRowForUi?.id || '').trim();
            if (did) {
                openDecisions(did);
                return;
            }
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-unified-seizure-log', { detail: { tab: 'salary' } })
                );
            } catch {
                /* ignore */
            }
            return;
        }
        const did = String(salaryRowForUi?.id || '').trim();
        if (did) {
            const outcome = String(salaryRowForUi?.executorOutcome ?? 'pending').trim();
            const alternative = outcome === 'alternative';
            const rejected = isExecutorRowRejectedAndFinal(salaryRowForUi);
            const approved =
                !rejected &&
                (alternative || isExecutorRowApprovedWorkflowActive(salaryRowForUi, decisions));
            const savedAt = String(salaryRowForUi?.seizureRequestSavedAt || '').trim();
            const needsCompletion = approved && !savedAt;
            if (needsCompletion) {
                const exId = String(resolvedExecutionId || '').trim();
                if (exId && did) dispatchOpenSeizureCompletion(exId, did);
                return;
            }
            if (approved && savedAt) {
                openDecisions(did);
                return;
            }
            openDecisions(did);
            return;
        }
        if (coerciveUiLocked) return;
        setInlineActionGateKey('seizure_salary');
    }, [
        coerciveUiLocked,
        hasActiveSalarySeizure,
        openDecisions,
        resolvedExecutionId,
        salaryRowForUi,
        seizureActionsDisabled,
    ]);

    const salaryRequestTitle = activeDebtorIsDeceased
        ? 'طلب حجز الحوافز والمخصصات'
        : 'طلب حجز راتب';

    const sharedAssetBlockProps = {
        seizureActionsDisabled,
        decisions,
        resolvedExecutionId,
        inlineActionGateKey,
        setInlineActionGateKey,
        acknowledgeSeizureRequestFromLog,
        submitBasicSeizureRequest,
        requestFollowupSeizureDecision,
        openAppeals,
        saveCoerciveAction,
        showToast,
    };

    return {
        seizureMatrix,
        progressive,
        seizureActionsDisabled,
        additionalSeizureExpanded,
        setAdditionalSeizureExpanded,
        maximumSeizureExpanded,
        setMaximumSeizureExpanded,
        financialCenterBalanceIqd,
        showRecommendedButton,
        showManualButton,
        showGuarantorRequestInTab,
        resolvedExecutionId,
        guarantorExistingWarningOpen,
        setGuarantorExistingWarningOpen,
        setLastSalaryDecisionId,
        decisions,
        thirdPartyNameDraft,
        setThirdPartyNameDraft,
        thirdPartyAmountDraft,
        setThirdPartyAmountDraft,
        propertyDetailsDraftByDecisionId,
        setPropertyDetailsDraftByDecisionId,
        vehicleDetailsDraftByDecisionId,
        setVehicleDetailsDraftByDecisionId,
        openAppeals,
        openDecisions,
        openGuarantorDetails,
        findLatestGuarantorDecision,
        acknowledgeSeizureRequestFromLog,
        thirdPartyDecision,
        propertyDecision,
        movableDecision,
        submitBasicSeizureRequest,
        salaryRowForUi,
        hasActiveSalarySeizure,
        salaryRequestOpen,
        salaryRequestSettled,
        salaryLogReady,
        salaryRegistrationAckReady,
        openSalarySeizureRequest,
        salaryRequestTitle,
        sharedAssetBlockProps,
    };
}
