// @ts-nocheck
/** Phase C — مصاريف الوحدات (إزالة تجاوز / تسليم شيء معين) */
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { EncroachmentCaseExpenseRow } from '@/app/utils/unifiedFundsLedgerStorage';
import type { SpecificDeliveryCaseExpenseRow } from '@/app/utils/specificDeliveryPropertyExpertRequest';
import {
    markSpecificDeliveryItemDeclaredDestroyed,
    readSpecificDeliveryItems,
} from '@/app/utils/specificDeliveryItemsUtils';

export type UseExecutionDashboardModuleExpenseHandlersParams = {
    executionData: ExecutionFile | null | undefined;
    encroachmentCaseExpenses: EncroachmentCaseExpenseRow[];
    specificDeliveryCaseExpenses: SpecificDeliveryCaseExpenseRow[];
    timelineEvents: TimelineEvent[];
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    setEncroachmentCaseExpenses: Dispatch<SetStateAction<EncroachmentCaseExpenseRow[]>>;
    setSpecificDeliveryCaseExpenses: Dispatch<SetStateAction<SpecificDeliveryCaseExpenseRow[]>>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
};

function dispatchUnifiedLedgerUpdated(): void {
    try {
        window.dispatchEvent(new CustomEvent('hami-unified-ledger-updated'));
    } catch {
        /* ignore */
    }
}

export function useExecutionDashboardModuleExpenseHandlers({
    executionData,
    encroachmentCaseExpenses,
    specificDeliveryCaseExpenses,
    timelineEvents,
    nextTimelineId,
    persistExecutionMerge,
    setEncroachmentCaseExpenses,
    setSpecificDeliveryCaseExpenses,
    setTimelineEvents,
}: UseExecutionDashboardModuleExpenseHandlersParams) {
    const handleEncroachmentExpenseRecorded = useCallback(
        (row: EncroachmentCaseExpenseRow) => {
            const nextExp = [row, ...encroachmentCaseExpenses];
            const tNow = new Date().toISOString();
            const evLine: TimelineEvent = {
                id: nextTimelineId(),
                type: 'payment',
                title: `💸 مصاريف إزالة تجاوز: ${row.amount.toLocaleString('ar-IQ')} د.ع`,
                description: `${row.note} — ${row.requestTitle}`,
                date: row.date,
                timestamp: tNow,
                source: 'إدارة الأموال — إزالة تجاوز',
            };
            const nextTimeline = [evLine, ...timelineEvents];
            setEncroachmentCaseExpenses(nextExp);
            setTimelineEvents(nextTimeline);
            persistExecutionMerge({
                encroachment_case_expenses: nextExp,
                timelineEvents: nextTimeline,
            });
        },
        [
            encroachmentCaseExpenses,
            nextTimelineId,
            persistExecutionMerge,
            setEncroachmentCaseExpenses,
            setTimelineEvents,
            timelineEvents,
        ],
    );

    const handleSpecificDeliveryExpenseRecorded = useCallback(
        (row: SpecificDeliveryCaseExpenseRow) => {
            const nextExp = [row, ...specificDeliveryCaseExpenses];
            const tNow = new Date().toISOString();
            const evLine: TimelineEvent = {
                id: nextTimelineId(),
                type: 'payment',
                title: `💸 مصاريف تسليم شيء معين: ${row.amount.toLocaleString('ar-IQ')} د.ع`,
                description: `${row.note} — ${row.requestTitle}`,
                date: row.date,
                timestamp: tNow,
                source: 'إدارة الأموال — تسليم شيء معين',
            };
            const nextTimeline = [evLine, ...timelineEvents];
            setSpecificDeliveryCaseExpenses(nextExp);
            setTimelineEvents(nextTimeline);
            persistExecutionMerge({
                specific_delivery_case_expenses: nextExp,
                timelineEvents: nextTimeline,
            });
            dispatchUnifiedLedgerUpdated();
        },
        [
            nextTimelineId,
            persistExecutionMerge,
            setSpecificDeliveryCaseExpenses,
            setTimelineEvents,
            specificDeliveryCaseExpenses,
            timelineEvents,
        ],
    );

    const handleSpecificDeliveryFinancialized = useCallback(
        (amount: number) => {
            const trimmed = Math.max(0, Math.trunc(amount));
            if (trimmed <= 0) return;
            const tNow = new Date().toISOString();
            const itemName = String(
                (executionData as { specificDeliveryItemName?: string } | undefined)
                    ?.specificDeliveryItemName || '',
            ).trim();
            const evLine: TimelineEvent = {
                id: nextTimelineId(),
                type: 'payment',
                title: `💰 تحويل تسليم شيء معين: ${trimmed.toLocaleString('ar-IQ')} د.ع`,
                description:
                    (itemName ? `الشيء: ${itemName} — ` : '') +
                    'تحويل المطالبة لتعذر التسليم / هلاك الشيء — حقن الدين الأصلي في المركز المالي',
                date: getLocalTodayYmd(),
                timestamp: tNow,
                source: 'تسليم شيء معين — تحويل مالي',
            };
            const nextTimeline = [evLine, ...timelineEvents];
            setTimelineEvents(nextTimeline);
            persistExecutionMerge({
                debtAmount: trimmed,
                totalAmount: trimmed,
                specificDeliveryFinancialized: true,
                specificDeliveryConvertedAmount: trimmed,
                specificDeliveryFinancializedAt: tNow,
                timelineEvents: nextTimeline,
            });
            dispatchUnifiedLedgerUpdated();
        },
        [executionData, nextTimelineId, persistExecutionMerge, setTimelineEvents, timelineEvents],
    );

    const handleSpecificDeliveryItemDeclaredDestroyed = useCallback(
        (itemId: string) => {
            const ed = executionData as {
                specificDeliveryItemName?: string;
                specificDeliveryItems?: import('@/app/utils/specificDeliveryItemsUtils').SpecificDeliveryItem[];
            } | null | undefined;
            const currentItems = readSpecificDeliveryItems({
                specificDeliveryItemName: ed?.specificDeliveryItemName,
                specificDeliveryItems: ed?.specificDeliveryItems,
            });
            const nextItems = markSpecificDeliveryItemDeclaredDestroyed(currentItems, itemId);
            persistExecutionMerge({ specificDeliveryItems: nextItems });
        },
        [executionData, persistExecutionMerge],
    );

    return {
        handleEncroachmentExpenseRecorded,
        handleSpecificDeliveryExpenseRecorded,
        handleSpecificDeliveryFinancialized,
        handleSpecificDeliveryItemDeclaredDestroyed,
    };
}
