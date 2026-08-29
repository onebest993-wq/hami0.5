import React from 'react';
import { useExecutorDecisions } from '@/app/components/lawyer/ExecutionDashboard/hooks/useExecutorDecisions';
import {
    isExecutorHubRowSuperseded,
    isExecutorRowRejectedAndFinal,
    listEvictionProcedureHubRowsForMatch,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import { summarizeExecutorHubRequestLifecycle } from '@/app/utils/executorRequestLifecycle';
import {
    isSpecificDeliveryMovableValuationDecisionRow,
    SPECIFIC_DELIVERY_MOVABLE_VALUATION_TITLE,
} from '@/app/utils/specificDeliveryMovableValuationRequest';
import {
    parseSpecificDeliveryConversionPayload,
    isSpecificDeliveryConversionDecisionRow,
} from '@/app/utils/specificDeliveryConversionRequest';
import { readSpecificDeliveryItems } from '@/app/utils/specificDeliveryItemsUtils';
import { formatNumberInput } from '@/app/utils/execution/amountInput';
import { readExpertCommitteeSize } from '@/app/components/lawyer/ExecutionDashboard/utils/expertCommitteeUtils';
import { useExecutionSectionConfirm } from '@/app/components/lawyer/execution/useExecutionSectionConfirm';
import { useSpecificDeliveryMovableValuationExpertActions } from './useSpecificDeliveryMovableValuationExpertActions';
import {
    type SpecificDeliveryMovableValuationExpertCardProps,
    buildExpertNameSlots,
} from './specificDeliveryMovableValuationExpertCard.helpers';

export function useSpecificDeliveryMovableValuationExpertCardImpl({
    decisionsStorageExecutionId,
    setInlineActionGateKey,
    showToast,
    specificDeliveryItemName = '',
    specificDeliveryItems = null,
    onExpenseRecorded,
    onValuationFinancialized,
    hasPendingDeliveryItems = false,
}: SpecificDeliveryMovableValuationExpertCardProps) {
    const { executionId, decisions } = useExecutorDecisions(decisionsStorageExecutionId);
    const { confirm: confirmInSection, dialog: sectionConfirmDialog } = useExecutionSectionConfirm();
    const [expanded, setExpanded] = React.useState(false);
    const [estimatedValueInput, setEstimatedValueInput] = React.useState('');
    const [expertNames, setExpertNames] = React.useState('');
    const [expertNameSlots, setExpertNameSlots] = React.useState<string[]>(['']);
    const [partyDecisionLane, setPartyDecisionLane] = React.useState<'choose' | 'approve' | 'objection'>(
        'choose'
    );

    const allItems = React.useMemo(
        () =>
            Array.isArray(specificDeliveryItems) && specificDeliveryItems.length > 0
                ? specificDeliveryItems
                : readSpecificDeliveryItems({ specificDeliveryItemName, specificDeliveryItems }),
        [specificDeliveryItemName, specificDeliveryItems]
    );

    const decisionRows = React.useMemo(
        () => (Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : []),
        [decisions]
    );

    const linkedConversionItem = React.useMemo(() => {
        const conversionRow = decisionRows.find(
            (row) =>
                isSpecificDeliveryConversionDecisionRow(row) &&
                !isExecutorHubRowSuperseded(row) &&
                !isExecutorRowRejectedAndFinal(row) &&
                (Boolean(String(row.specificDeliveryConversionSavedAt || '').trim()) ||
                    isExecutorRowApprovedWorkflowActive(row, decisionRows))
        );
        const payload = parseSpecificDeliveryConversionPayload(conversionRow ?? null);
        if (payload.itemId) {
            const hit = allItems.find((item) => item.id === payload.itemId);
            if (hit) return hit;
        }
        if (payload.itemName) {
            const hit = allItems.find((item) => item.name === payload.itemName);
            if (hit) return hit;
        }
        return allItems.find((item) => item.nature === 'movable' && item.declaredDestroyed && item.status === 'pending') ?? null;
    }, [allItems, decisionRows]);

    const valuedItemLabel = String(linkedConversionItem?.name || specificDeliveryItemName || '').trim();

    const lifecycleSummary = React.useMemo(
        () =>
            summarizeExecutorHubRequestLifecycle(
                listEvictionProcedureHubRowsForMatch(decisionRows, {
                    title: SPECIFIC_DELIVERY_MOVABLE_VALUATION_TITLE,
                })
            ),
        [decisionRows]
    );

    const latestRow = React.useMemo(() => {
        const hits = decisionRows
            .filter(
                (d) =>
                    isSpecificDeliveryMovableValuationDecisionRow(d) &&
                    !isExecutorHubRowSuperseded(d)
            )
            .sort((a, b) => {
                const da = String(a?.resolvedAt ?? a?.date ?? '');
                const db = String(b?.resolvedAt ?? b?.date ?? '');
                return db.localeCompare(da, undefined, { numeric: true });
            });
        return hits[0] || null;
    }, [decisionRows]);

    const savedAt = String(latestRow?.specificDeliveryMovableValuationSavedAt || '').trim();
    const reportSavedAt = String(latestRow?.specificDeliveryMovableValuationReportSavedAt || '').trim();
    const requiredExperts = readExpertCommitteeSize(latestRow || {});
    const hasRequest =
        Boolean(latestRow?.id) &&
        !isExecutorRowRejectedAndFinal(latestRow as Record<string, unknown>) &&
        !savedAt;
    const executorApproved =
        Boolean(latestRow?.id) &&
        isExecutorRowApprovedWorkflowActive(latestRow as Record<string, unknown>, decisionRows) &&
        !savedAt;

    React.useEffect(() => {
        if (hasRequest) setExpanded(true);
        if (savedAt) setExpanded(false);
    }, [hasRequest, savedAt, latestRow?.id]);

    React.useEffect(() => {
        if (!latestRow) return;
        const value = Number(latestRow.specificDeliveryMovableValuationAmount);
        if (Number.isFinite(value) && value > 0) {
            setEstimatedValueInput(formatNumberInput(String(value)));
        }
        const joined = buildExpertNameSlots(latestRow, requiredExperts).filter(Boolean).join('، ');
        if (joined) setExpertNames(joined);
    }, [latestRow, requiredExperts]);

    React.useEffect(() => {
        setExpertNameSlots(buildExpertNameSlots(latestRow, requiredExperts));
    }, [latestRow?.id, requiredExperts]);

    const openAppeals = React.useCallback(
        (decisionId: string) => {
            if (!executionId || !decisionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: { executionId, tab: 'previous', decisionId },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [executionId]
    );

    const expertNamesForSave = React.useCallback((): string[] => {
        if (requiredExperts <= 1) {
            return String(expertNames || '')
                .split(/[,،]/)
                .map((x) => x.trim())
                .filter(Boolean);
        }
        return expertNameSlots.map((slot) => String(slot || '').trim()).filter(Boolean);
    }, [expertNameSlots, expertNames, requiredExperts]);

    React.useEffect(() => {
        if (reportSavedAt) setPartyDecisionLane('choose');
    }, [reportSavedAt, latestRow?.id, requiredExperts]);

    const { saveExpertReport, submitExpertObjection, financializeAfterReportApproval, onConfirmSend } =
        useSpecificDeliveryMovableValuationExpertActions({
            latestRow,
            valuedItemLabel,
            estimatedValueInput,
            expertNamesForSave,
            requiredExperts,
            showToast,
            decisionsStorageExecutionId,
            decisionRows,
            setPartyDecisionLane,
            setEstimatedValueInput,
            setExpertNames,
            setExpertNameSlots,
            reportSavedAt,
            linkedConversionItem,
            hasPendingDeliveryItems,
            confirmInSection,
            onExpenseRecorded: onExpenseRecorded as never,
            onValuationFinancialized,
            executorApproved,
            setExpanded,
            setInlineActionGateKey,
        });

    return {
        executionId,
        sectionConfirmDialog,
        expanded,
        setExpanded,
        estimatedValueInput,
        setEstimatedValueInput,
        expertNames,
        setExpertNames,
        expertNameSlots,
        setExpertNameSlots,
        partyDecisionLane,
        setPartyDecisionLane,
        valuedItemLabel,
        lifecycleSummary,
        latestRow,
        decisionRows,
        savedAt,
        reportSavedAt,
        requiredExperts,
        hasRequest,
        executorApproved,
        openAppeals,
        saveExpertReport,
        submitExpertObjection,
        financializeAfterReportApproval,
        onConfirmSend,
    };
}
