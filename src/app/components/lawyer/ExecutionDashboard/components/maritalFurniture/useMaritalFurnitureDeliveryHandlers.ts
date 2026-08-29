import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import type { MaritalFurnitureDeliveryOutcome, MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import {
    applyMaritalFurnitureDeliveryOutcome,
    isMaritalFurnitureItemDeliveryLocked,
} from '@/app/utils/maritalFurniture';
import { buildArabicScheduleLabel } from '@/app/utils/maritalFurnitureDeliveryWorkflow';
import {
    runPersistMaritalFurnitureDeliverySchedule,
    runPersistMaritalFurnitureItemDeliveryOutcome,
} from '@/app/utils/maritalFurnitureDeliveryPersistence';
import type { MaritalFurnitureModuleProps } from './maritalFurnitureModuleTypes';

export function useMaritalFurnitureDeliveryHandlers(input: {
    locked: boolean;
    savingItemId: string | null;
    setSavingItemId: Dispatch<SetStateAction<string | null>>;
    displayItems: MaritalFurnitureItem[];
    setLocalItems: Dispatch<SetStateAction<MaritalFurnitureItem[]>>;
    persistExecutionMerge: MaritalFurnitureModuleProps['persistExecutionMerge'];
    showToast: MaritalFurnitureModuleProps['showToast'];
    pushTimelineEvent: MaritalFurnitureModuleProps['pushTimelineEvent'];
    setTimelineEvents: MaritalFurnitureModuleProps['setTimelineEvents'];
    timelineEvents: NonNullable<MaritalFurnitureModuleProps['timelineEvents']>;
    nextTimelineId: MaritalFurnitureModuleProps['nextTimelineId'];
    executionData: MaritalFurnitureModuleProps['executionData'];
    scheduleYmdDraft: string;
    scheduleYmd: string;
    setLocalSchedule: Dispatch<SetStateAction<{ ymd: string; label: string }>>;
    setScheduleYmdDraft: Dispatch<SetStateAction<string>>;
    setEditingSchedule: Dispatch<SetStateAction<boolean>>;
    setSavingSchedule: Dispatch<SetStateAction<boolean>>;
    pendingDelivery: {
        itemId: string;
        outcome: Exclude<MaritalFurnitureDeliveryOutcome, 'pending'>;
        itemName: string;
    } | null;
    setPendingDelivery: Dispatch<
        SetStateAction<{
            itemId: string;
            outcome: Exclude<MaritalFurnitureDeliveryOutcome, 'pending'>;
            itemName: string;
        } | null>
    >;
}) {
    const {
        locked,
        savingItemId,
        setSavingItemId,
        displayItems,
        setLocalItems,
        persistExecutionMerge,
        showToast,
        pushTimelineEvent,
        setTimelineEvents,
        timelineEvents,
        nextTimelineId,
        executionData,
        scheduleYmdDraft,
        scheduleYmd,
        setLocalSchedule,
        setScheduleYmdDraft,
        setEditingSchedule,
        setSavingSchedule,
        pendingDelivery,
        setPendingDelivery,
    } = input;

const timelineDeps = useMemo(
        () => ({
            persistExecutionMerge,
            pushTimelineEvent,
            setTimelineEvents,
            getTimelineEvents: () => timelineEvents,
            nextTimelineId,
        }),
        [
            persistExecutionMerge,
            pushTimelineEvent,
            setTimelineEvents,
            timelineEvents,
            nextTimelineId,
        ],
    );

    const handleSaveSchedule = useCallback(() => {
        if (typeof persistExecutionMerge !== 'function') {
            showToast('تعذّر الحفظ — الإضبارة غير جاهزة', 'error');
            return;
        }
        const ymd = (scheduleYmdDraft || scheduleYmd).trim();
        if (!ymd) {
            showToast('اختر تاريخ موعد التسليم', 'warning');
            return;
        }
        setSavingSchedule(true);
        try {
            const nextScheduleLabel = buildArabicScheduleLabel(ymd);
            const ok = runPersistMaritalFurnitureDeliverySchedule(
                { ymd, displayAr: ymd, scheduleLabel: nextScheduleLabel },
                timelineDeps,
            );
            if (!ok) {
                showToast('تعذّر حفظ موعد التسليم — تحقق من الإضبارة', 'error');
                return;
            }
            setLocalSchedule({ ymd, label: nextScheduleLabel });
            setScheduleYmdDraft('');
            setEditingSchedule(false);
            showToast('تم حفظ موعد التسليم الميداني', 'success');
        } finally {
            setSavingSchedule(false);
        }
    }, [scheduleYmdDraft, scheduleYmd, timelineDeps, showToast, persistExecutionMerge]);

    const executeItemOutcome = useCallback(
        (itemId: string, outcome: Exclude<MaritalFurnitureDeliveryOutcome, 'pending'>) => {
            if (locked || savingItemId) return;
            if (typeof persistExecutionMerge !== 'function') {
                showToast('تعذّر الحفظ — الإضبارة غير جاهزة', 'error');
                return;
            }
            const row = displayItems.find((r) => String(r.id) === String(itemId));
            if (!row || isMaritalFurnitureItemDeliveryLocked(row)) return;

            const ts = new Date().toISOString();
            const previousItems = displayItems;
            const optimisticItems = previousItems.map((item) =>
                String(item.id) === String(itemId)
                    ? applyMaritalFurnitureDeliveryOutcome(item, outcome, ts)
                    : item,
            );
            setLocalItems(optimisticItems);
            setSavingItemId(itemId);
            try {
                const ok = runPersistMaritalFurnitureItemDeliveryOutcome(
                    { itemId, outcome },
                    {
                        executionData,
                        items: optimisticItems,
                        showToast: (message, type) =>
                            showToast(
                                message,
                                (type ?? 'info') as 'success' | 'error' | 'warning' | 'info',
                            ),
                        ...timelineDeps,
                    },
                );
                if (!ok) {
                    setLocalItems(previousItems);
                    showToast('تعذّر حفظ حالة التسليم — تحقق من الإضبارة', 'error');
                }
            } catch {
                setLocalItems(previousItems);
                showToast('تعذّر حفظ حالة التسليم', 'error');
            } finally {
                setSavingItemId(null);
            }
        },
        [
            displayItems,
            locked,
            savingItemId,
            executionData,
            timelineDeps,
            showToast,
            persistExecutionMerge,
        ],
    );

    const requestItemOutcome = useCallback(
        (itemId: string, outcome: MaritalFurnitureDeliveryOutcome) => {
            if (locked || savingItemId || outcome === 'pending') return;
            const row = displayItems.find((r) => String(r.id) === String(itemId));
            if (!row || isMaritalFurnitureItemDeliveryLocked(row)) return;
            setPendingDelivery({
                itemId,
                outcome: outcome as Exclude<MaritalFurnitureDeliveryOutcome, 'pending'>,
                itemName: row.name,
            });
        },
        [displayItems, locked, savingItemId],
    );

    const confirmPendingDelivery = useCallback(() => {
        if (!pendingDelivery) return;
        const { itemId, outcome } = pendingDelivery;
        setPendingDelivery(null);
        executeItemOutcome(itemId, outcome);
    }, [pendingDelivery, executeItemOutcome]);

    return {
        handleSaveSchedule,
        requestItemOutcome,
        confirmPendingDelivery,
        executeItemOutcome,
    };
}
