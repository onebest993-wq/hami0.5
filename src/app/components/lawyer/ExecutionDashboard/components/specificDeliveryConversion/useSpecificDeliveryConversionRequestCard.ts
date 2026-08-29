import React from 'react';
import { useExecutorDecisions } from '@/app/components/lawyer/ExecutionDashboard/hooks/useExecutorDecisions';
import {
    isExecutorHubRowSuperseded,
    isExecutorRowRejectedAndFinal,
    listEvictionProcedureHubRowsForMatch,
    dispatchDecisionsReload,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import { summarizeExecutorHubRequestLifecycle } from '@/app/utils/executorRequestLifecycle';
import {
    completeSpecificDeliveryConversionApproval,
    isSpecificDeliveryConversionCycleComplete,
    isSpecificDeliveryConversionDecisionRow,
    parseSpecificDeliveryConversionPayload,
    sendInitialSpecificDeliveryConversionRequest,
    SPECIFIC_DELIVERY_CONVERSION_TITLE,
} from '@/app/utils/specificDeliveryConversionRequest';
import {
    getConversionEligibleSpecificDeliveryItems,
    readSpecificDeliveryItems,
} from '@/app/utils/specificDeliveryItemsUtils';
import type { SpecificDeliveryConversionRequestCardProps } from './SpecificDeliveryConversionRequestCardProps';

export function useSpecificDeliveryConversionRequestCard({
    decisionsStorageExecutionId,
    setInlineActionGateKey,
    showToast,
    specificDeliveryItemName = '',
    specificDeliveryItems = null,
    specificDeliveryFinancialized = false,
    onConversionItemDeclared,
}: SpecificDeliveryConversionRequestCardProps) {
    const { executionId, decisions } = useExecutorDecisions(decisionsStorageExecutionId);
    const storageExecutionId = executionId || decisionsStorageExecutionId;
    const [expanded, setExpanded] = React.useState(false);

    const allItems = React.useMemo(
        () =>
            Array.isArray(specificDeliveryItems) && specificDeliveryItems.length > 0
                ? specificDeliveryItems
                : readSpecificDeliveryItems({
                      specificDeliveryItemName,
                      specificDeliveryItems,
                      specificDeliveryFinancialized,
                  }),
        [specificDeliveryFinancialized, specificDeliveryItemName, specificDeliveryItems]
    );

    const conversionEligibleItems = React.useMemo(
        () => getConversionEligibleSpecificDeliveryItems(allItems),
        [allItems]
    );

    const [selectedItemIds, setSelectedItemIds] = React.useState<Set<string>>(() => new Set());

    React.useEffect(() => {
        if (conversionEligibleItems.length === 0) {
            setSelectedItemIds(new Set());
            return;
        }
        setSelectedItemIds((prev) => {
            const next = new Set<string>();
            for (const id of prev) {
                if (conversionEligibleItems.some((item) => item.id === id)) next.add(id);
            }
            if (next.size === 0 && conversionEligibleItems.length === 1) {
                next.add(conversionEligibleItems[0]!.id);
            }
            return next;
        });
    }, [conversionEligibleItems]);

    const toggleSelectedItem = React.useCallback((itemId: string) => {
        setSelectedItemIds((prev) => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    }, []);

    const decisionRows = React.useMemo(
        () => (Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : []),
        [decisions]
    );

    const lifecycleSummary = React.useMemo(
        () =>
            summarizeExecutorHubRequestLifecycle(
                listEvictionProcedureHubRowsForMatch(decisionRows, {
                    title: SPECIFIC_DELIVERY_CONVERSION_TITLE,
                })
            ),
        [decisionRows]
    );

    const conversionRows = React.useMemo(() => {
        return decisionRows
            .filter(
                (d) =>
                    isSpecificDeliveryConversionDecisionRow(d) && !isExecutorHubRowSuperseded(d),
            )
            .sort((a, b) => {
                const da = String(a?.resolvedAt ?? a?.date ?? '');
                const db = String(b?.resolvedAt ?? b?.date ?? '');
                return db.localeCompare(da, undefined, { numeric: true });
            });
    }, [decisionRows]);

    const latestRow = React.useMemo(() => {
        const active = conversionRows.find(
            (row) =>
                !isSpecificDeliveryConversionCycleComplete(row, { allDecisions: decisionRows }) &&
                !isExecutorRowRejectedAndFinal(row),
        );
        return active ?? conversionRows[0] ?? null;
    }, [conversionRows, decisionRows]);

    const savedAt = String(latestRow?.specificDeliveryConversionSavedAt || '').trim();
    const rowWorkflowComplete = isSpecificDeliveryConversionCycleComplete(latestRow, {
        allDecisions: decisionRows,
    });
    const hasRequest =
        Boolean(latestRow?.id) &&
        !rowWorkflowComplete &&
        !isExecutorRowRejectedAndFinal(latestRow as Record<string, unknown>);
    const workflowComplete =
        conversionEligibleItems.length === 0 &&
        rowWorkflowComplete &&
        Boolean(latestRow?.id);

    React.useEffect(() => {
        if (hasRequest) setExpanded(true);
        if (workflowComplete) setExpanded(false);
    }, [hasRequest, workflowComplete, latestRow?.id]);

    const confirmDestructionAfterApproval = React.useCallback(() => {
        if (!latestRow?.id) return;
        const decisionId = String(latestRow.id || '').trim();
        if (!decisionId) return;
        if (!isExecutorRowApprovedWorkflowActive(latestRow, decisionRows)) {
            showToast('بانتظار موافقة المنفذ على الطلب', 'warning');
            return;
        }
        const payload = parseSpecificDeliveryConversionPayload(latestRow);
        const itemId = String(payload.itemId || '').trim();
        const itemName =
            payload.itemName ||
            allItems.find((item) => item.id === itemId)?.name ||
            '';
        if (!itemId) {
            showToast('تعذر تحديد الشيء المرتبط بالطلب', 'error');
            return;
        }
        const result = completeSpecificDeliveryConversionApproval({
            executionId: storageExecutionId,
            decisionId,
            itemName,
        });
        if (!result.ok) {
            showToast('تعذر تسجيل الهلاك — تحقق من قرار المنفذ.', 'error');
            return;
        }
        onConversionItemDeclared?.(itemId);
        dispatchDecisionsReload();
        setExpanded(false);
        showToast('تم تسجيل الهلاك — يُستكمل تقدير القيمة عبر انتداب الخبير.', 'success', {
            decisionsLink: true,
        });
    }, [
        allItems,
        decisionRows,
        latestRow,
        onConversionItemDeclared,
        showToast,
        storageExecutionId,
    ]);

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

    const onConfirmSend = React.useCallback(
        ({ resubmit }: { resubmit?: boolean } = {}) => {
            let selectedItems = conversionEligibleItems.filter((item) =>
                selectedItemIds.has(item.id),
            );

            if (resubmit && selectedItems.length === 0 && latestRow) {
                const payload = parseSpecificDeliveryConversionPayload(latestRow);
                const itemId = String(payload.itemId || '').trim();
                const fromAll = allItems.find((item) => item.id === itemId);
                if (fromAll) selectedItems = [fromAll];
            }

            if (selectedItems.length === 0) {
                showToast(
                    conversionEligibleItems.length > 1
                        ? 'اختر الشيء أو الأشياء المراد إعلان هلاكها'
                        : resubmit
                          ? 'لا يوجد شيء مؤهل لإعادة الطلب'
                          : 'لا يوجد شيء مؤهل للتحويل',
                    'warning',
                );
                return;
            }

            let sent = 0;
            for (const item of selectedItems) {
                const result = sendInitialSpecificDeliveryConversionRequest({
                    executionId: storageExecutionId,
                    supersedeCompletedHub: resubmit,
                    itemId: item.id,
                    itemName: item.name,
                });
                if (result.ok) sent += 1;
            }

            if (sent === 0) {
                showToast('يوجد طلب قيد البت أو مكتمل لأحد الأشياء المحددة.', 'warning');
                return;
            }

            dispatchDecisionsReload();
            setExpanded(true);
            setInlineActionGateKey(null);
            showToast(
                sent > 1
                    ? `تم إرسال ${sent} طلبات إلى مركز قرارات المنفذ.`
                    : resubmit
                      ? 'تم تقديم طلب جديد إلى مركز قرارات المنفذ.'
                      : 'تم إرسال الطلب إلى مركز قرارات المنفذ.',
                'success',
                { decisionsLink: true },
            );
        },
        [
            allItems,
            conversionEligibleItems,
            latestRow,
            selectedItemIds,
            setInlineActionGateKey,
            showToast,
            storageExecutionId,
        ]
    );

    return {
        executionId,
        decisionRows,
        allItems,
        conversionEligibleItems,
        selectedItemIds,
        toggleSelectedItem,
        expanded,
        setExpanded,
        hasRequest,
        workflowComplete,
        lifecycleSummary,
        latestRow,
        savedAt,
        confirmDestructionAfterApproval,
        openAppeals,
        onConfirmSend,
    };
}
