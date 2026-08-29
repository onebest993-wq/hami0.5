import React from 'react';
import { submitBasicSeizureRequestFromModel } from './submitBasicSeizureRequestFromModel';
import {
    DECISIONS_RELOAD_EVENT,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import type { SeizureMatrixButtonKey } from '@/app/utils/seizureMatrix';
import { resolveSeizureMatrixFromExecution } from '@/app/utils/seizureMatrix';
import { shouldShowGuarantorRequestInSeizureTab } from './hiddenFollowupRequestsUtils';
import { isFollowupRequestKindAllowed } from '@/app/utils/executionDomainIsolation';
import { resolveGoverningSalaryDecision } from './seizureRequestsTabHelpers';
import { useSeizureInlineFocusBridge } from '@/app/components/lawyer/ExecutionDashboard/hooks/useSeizureInlineFocusBridge';
import {
    resolveGoverningMovableDecision,
    resolveGoverningPropertyDecision,
    resolveGoverningThirdPartyDecision,
} from '@/app/components/lawyer/ExecutionDashboard/utils/seizureInlineFocusUtils';
import type {
    DecisionRow,
    UseSeizureRequestsTabModelParams,
} from './useSeizureRequestsTabModel.types';
import { useSeizureRequestsTabSalarySlice } from './useSeizureRequestsTabSalarySlice';
import { useSeizureRequestsTabOpeners } from './useSeizureRequestsTabOpeners';

export type { UseSeizureRequestsTabModelParams } from './useSeizureRequestsTabModel.types';

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

    const readAllDecisions = React.useCallback((): DecisionRow[] => {
        const merged: DecisionRow[] = [];
        for (const id of executionIdsForDecisions) {
            merged.push(...(readExecutorDecisionsArray(id) as DecisionRow[]));
        }
        const byId = new Map<string, DecisionRow>();
        for (const row of merged) {
            const rid = String(row?.id ?? '').trim();
            if (!rid) continue;
            const prev = byId.get(rid);
            if (!prev) {
                byId.set(rid, row);
                continue;
            }
            const a = String(prev?.resolvedAt ?? prev?.date ?? '');
            const b = String(row?.resolvedAt ?? row?.date ?? '');
            if (b.localeCompare(a, undefined, { numeric: true }) > 0) byId.set(rid, row);
        }
        return Array.from(byId.values());
    }, [executionIdsForDecisions]);

    const [decisions, setDecisions] = React.useState<DecisionRow[]>(() => readAllDecisions());
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

    const {
        openAppeals,
        openDecisions,
        openGuarantorDetails,
        findLatestGuarantorDecision,
        acknowledgeSeizureRequestFromLog,
    } = useSeizureRequestsTabOpeners({ resolvedExecutionId, decisions });

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
        const did = String(salaryDecision?.id || '').trim();
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
        (args: {
            actionType: 'salary' | 'property' | 'vehicle' | 'third_party';
            title: string;
            body: string;
            subtype: import('@/app/utils/executorSeizureDecisionQueue').SeizureRequestSubtype;
        }) =>
            submitBasicSeizureRequestFromModel({
                resolvedExecutionId,
                executionData,
                activeDebtorIsDeceased,
                nextTimelineId,
                persistExecutionMerge,
                pushTimelineEvent,
                showToast,
                args,
            }),
        [
            activeDebtorIsDeceased,
            executionData,
            nextTimelineId,
            persistExecutionMerge,
            pushTimelineEvent,
            resolvedExecutionId,
            showToast,
        ],
    );

    const {
        salaryRowForUi,
        hasActiveSalarySeizure,
        salaryRequestOpen,
        salaryRequestSettled,
        salaryLogReady,
        salaryRegistrationAckReady,
        openSalarySeizureRequest,
        salaryRequestTitle,
        sharedAssetBlockProps,
    } = useSeizureRequestsTabSalarySlice({
        decisions,
        salaryDecision: salaryDecision as DecisionRow | null | undefined,
        lastSalaryDecisionId,
        activeDebtorIsDeceased,
        executionData,
        seizureActionsDisabled,
        coerciveUiLocked,
        resolvedExecutionId,
        openDecisions,
        setInlineActionGateKey,
        inlineActionGateKey,
        acknowledgeSeizureRequestFromLog,
        submitBasicSeizureRequest,
        requestFollowupSeizureDecision,
        openAppeals,
        saveCoerciveAction,
        showToast,
    });

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
