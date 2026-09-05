import React from 'react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import type { InlineActionGateKey } from '../types';
import type { ExecutionFile } from '@/app/types/execution';
import { isSalarySeizureAsset } from '@/app/components/lawyer/ExecutionDashboard/hooks/useSeizureRegistryAssets';
import { isSalarySeizureLaneOccupied } from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureTabUtils';
import {
    isSeizureRegistrationComplete,
    isSeizureRequestFullyRegistered,
    type SeizureRequestLaneTab,
} from './seizureRequestsTabHelpers';
import type { DecisionRow } from './useSeizureRequestsTabModel.types';
import type { SeizureRequestSubtype } from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowRejectedAndFinal } from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';

export function useSeizureRequestsTabSalarySlice(args: {
    decisions: DecisionRow[];
    salaryDecision: DecisionRow | null | undefined;
    lastSalaryDecisionId: string;
    activeDebtorIsDeceased: boolean;
    executionData: ExecutionFile | null;
    seizureActionsDisabled: boolean;
    coerciveUiLocked: boolean;
    resolvedExecutionId: string;
    openDecisions: (decisionId?: string) => void;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    inlineActionGateKey: InlineActionGateKey | null;
    acknowledgeSeizureRequestFromLog: (tab: SeizureRequestLaneTab) => void;
    submitBasicSeizureRequest: (args: {
        actionType: 'salary' | 'property' | 'vehicle' | 'third_party';
        title: string;
        body: string;
        subtype: SeizureRequestSubtype;
    }) => string | null;
    requestFollowupSeizureDecision: (subtype: 'third_party', title: string, body: string) => void;
    openAppeals: (decisionId?: string) => void;
    saveCoerciveAction: (actionType: string, details: Record<string, string>) => void;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        options?: { decisionsLink?: boolean; [key: string]: unknown }
    ) => void;
}) {
    const {
        decisions,
        salaryDecision,
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
    } = args;

    const salaryRowForUi = React.useMemo((): DecisionRow | null => {
        const direct = salaryDecision as DecisionRow | null | undefined;
        if (direct?.id) return direct;
        const did = String(lastSalaryDecisionId || '').trim();
        if (!did) return null;
        const found = decisions.find((r) => String(r?.id || '').trim() === did);
        if (found?.id) return found;
        return {
            id: did,
            title: activeDebtorIsDeceased ? 'طلب حجز الحوافز والمخصصات' : 'طلب حجز راتب',
            requestKind: 'seizure',
            seizureSubtype: 'salary',
            executorOutcome: 'pending',
        };
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
            if (did) openDecisions(did);
            return;
        }
        const did = String(salaryRowForUi?.id || '').trim();
        if (did) {
            openDecisions(did);
            return;
        }
        if (coerciveUiLocked) return;
        setInlineActionGateKey('seizure_salary');
    }, [
        coerciveUiLocked,
        hasActiveSalarySeizure,
        openDecisions,
        salaryRowForUi?.id,
        seizureActionsDisabled,
        setInlineActionGateKey,
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
        openDecisions,
        saveCoerciveAction,
        showToast,
    };

    return {
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
