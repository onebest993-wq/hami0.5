import type { Dispatch, SetStateAction } from 'react';

import type { TimelineEvent } from '@/app/types/execution';

import type { ExecutionFile } from '@/app/types/execution';

import { insertTimelineEventWithThreadReplace } from '@/app/utils/timelineDedup';

import type {

    MaritalFurnitureDeliveryOutcome,

    MaritalFurnitureItem,

} from '@/app/types/maritalFurniture';

import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';

import { patchExecutorDecisionRowReliable } from '@/app/utils/executorSeizureDecisionQueue';

import {

    applyMaritalFurnitureDeliveryOutcome,

    areAllMaritalFurnitureItemsDeliveryLocked,

    formatMaritalFurnitureIqd,

    furnitureDetailsFromItems,

    hasAnyMaritalFurnitureDeliveryRecorded,

    lineTotalIqd,

    normalizeMaritalFurnitureItems,

    readMaritalFurnitureItems,

    sumMaritalFurnitureTotal,

    sumUndeliveredMaritalFurnitureTotal,

} from '@/app/utils/maritalFurniture';



export type MaritalFurnitureDeliveryScheduleInput = {

    ymd: string;

    displayAr: string;

    scheduleLabel: string;

    decisionId?: string;

};



export type MaritalFurnitureItemOutcomeInput = {

    itemId: string;

    outcome: Exclude<MaritalFurnitureDeliveryOutcome, 'pending'>;

    decisionId?: string;

    decisionsStorageId?: string;

};



export type MaritalFurnitureTimelineDeps = {

    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;

    pushTimelineEvent?: (

        event: TimelineEvent,

        options?: { mergePatch?: Record<string, unknown> },

    ) => boolean | void;

    setTimelineEvents?: Dispatch<SetStateAction<TimelineEvent[]>>;

    getTimelineEvents?: () => TimelineEvent[];

    nextTimelineId?: () => string;

};



function stampTimelineNow(event: TimelineEvent): TimelineEvent {

    const now = new Date().toISOString();

    return {

        ...event,

        timestamp: event.timestamp ?? now,

        date: event.date ?? getLocalTodayYmd(),

    };

}



export function buildMaritalFurnitureScheduleTimelineEvent(

    input: MaritalFurnitureDeliveryScheduleInput,

    nextTimelineId: () => string,

): TimelineEvent {

    return stampTimelineNow({

        id: nextTimelineId(),

        type: 'appointment',

        title: 'موعد تسليم الأثاث الزوجية',

        description: input.scheduleLabel,

        date: input.ymd,

        source: 'تسليم أثاث زوجية',

        metadata: {

            maritalFurnitureDeliveryScheduleYmd: input.ymd,

        },

    });

}



export function buildMaritalFurnitureItemTimelineEvent(

    item: MaritalFurnitureItem,

    outcome: Exclude<MaritalFurnitureDeliveryOutcome, 'pending'>,

    nextTimelineId: () => string,

): TimelineEvent {

    const today = getLocalTodayYmd();

    const titles: Record<typeof outcome, string> = {

        delivered: 'تسليم قطعة أثاث زوجية',

        failed: 'تعذّر تسليم قطعة أثاث',

        external_delivered: 'تسليم خارجي لقطعة أثاث',

    };

    const statusLabels: Record<typeof outcome, string> = {

        delivered: 'تم التسليم',

        failed: 'تعذّر التسليم — مرتبط بالمركز المالي',

        external_delivered: 'تسليم خارجي قبل الموعد',

    };

    return stampTimelineNow({

        id: nextTimelineId(),

        type: 'procedure',

        title: titles[outcome],

        description: `${item.name} × ${item.quantity} — ${statusLabels[outcome]}`,

        date: today,

        source: 'تسليم أثاث زوجية',

        metadata: {

            maritalFurnitureItemId: item.id,

            maritalFurnitureDeliveryOutcome: outcome,

        },

    });

}



export function buildMaritalFurnitureFailedFinancialTimelineEvent(

    item: MaritalFurnitureItem,

    amountIqd: number,

    nextTimelineId: () => string,

): TimelineEvent {

    return stampTimelineNow({

        id: nextTimelineId(),

        type: 'action',

        title: 'تحويل قيمة أثاث إلى المركز المالي',

        description: `${item.name} × ${item.quantity} — ${formatMaritalFurnitureIqd(amountIqd)} د.ع (تعذّر التسليم الميداني)`,

        date: getLocalTodayYmd(),

        source: 'المركز المالي — أثاث زوجية',

        metadata: {

            maritalFurnitureItemId: item.id,

            maritalFurnitureFinancialTransfer: true,

            maritalFurnitureTransferAmountIqd: amountIqd,

        },

    });

}



function foldTimelineEvents(prev: TimelineEvent[], events: TimelineEvent[]): TimelineEvent[] {

    return events.reduce(

        (acc, event) => insertTimelineEventWithThreadReplace(acc, event),

        prev,

    );

}



function persistMaritalFurnitureTimelineWithPatch(
    dataPatch: Record<string, unknown>,
    events: TimelineEvent[],
    deps: MaritalFurnitureTimelineDeps,
): boolean {
    if (events.length === 0) {
        return deps.persistExecutionMerge(dataPatch) !== false;
    }

    if (deps.pushTimelineEvent) {
        const [first, ...rest] = events;
        const firstOk = deps.pushTimelineEvent(first, { mergePatch: dataPatch }) === true;
        if (firstOk) {
            let restOk = true;
            for (const event of rest) {
                if (deps.pushTimelineEvent(event) !== true) {
                    restOk = false;
                    break;
                }
            }
            if (restOk) return true;
        }
    }

    const prev = deps.getTimelineEvents?.() ?? [];
    const nextEvents = foldTimelineEvents(prev, events);
    const persisted = deps.persistExecutionMerge({
        ...dataPatch,
        timelineEvents: nextEvents,
    });
    if (persisted === false) return false;
    deps.setTimelineEvents?.(nextEvents);
    return true;
}



function notifyMaritalFurnitureFinancialLedgerUpdated(): void {

    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent('hami-unified-ledger-updated'));

}



export function runPersistMaritalFurnitureDeliverySchedule(

    input: MaritalFurnitureDeliveryScheduleInput,

    deps: MaritalFurnitureTimelineDeps,

): boolean {

    const ts = new Date().toISOString();

    const schedulePatch: Record<string, unknown> = {

        maritalFurnitureDeliveryScheduleYmd: input.ymd,

        maritalFurnitureDeliveryScheduleLabel: input.scheduleLabel,

        maritalFurnitureDeliveryScheduledAt: ts,

    };

    const idFactory =

        deps.nextTimelineId ??

        (() => `tl-mf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

    return persistMaritalFurnitureTimelineWithPatch(

        schedulePatch,

        [buildMaritalFurnitureScheduleTimelineEvent(input, idFactory)],

        deps,

    );

}



export function runPersistMaritalFurnitureItemDeliveryOutcome(

    input: MaritalFurnitureItemOutcomeInput,

    deps: MaritalFurnitureTimelineDeps & {

        executionData: ExecutionFile | Record<string, unknown> | null | undefined;

        items?: MaritalFurnitureItem[];

        showToast?: (message: string, type?: string) => void;

    },

): boolean {

    const items =

        Array.isArray(deps.items) && deps.items.length > 0

            ? deps.items

            : readMaritalFurnitureItems(deps.executionData as ExecutionFile);

    const target = items.find((row) => String(row.id) === String(input.itemId));

    if (!target) {

        deps.showToast?.('تعذر العثور على قطعة الأثاث', 'error');

        return false;

    }



    const ts = new Date().toISOString();

    const nextItems = items.map((row) =>
        String(row.id) === String(input.itemId)
            ? applyMaritalFurnitureDeliveryOutcome(row, input.outcome, ts)
            : row,
    );

    const normalized = normalizeMaritalFurnitureItems(nextItems).map((row) => {

        const src = nextItems.find((n) => n.id === row.id);

        return src

            ? {

                  ...row,

                  delivered: src.delivered,

                  deliveryOutcome: src.deliveryOutcome,

                  deliveryRecordedAt: src.deliveryRecordedAt,

              }

            : row;

    });



    const undeliveredTotal = sumUndeliveredMaritalFurnitureTotal(normalized);

    const furnitureValue = sumMaritalFurnitureTotal(normalized);

    const allLocked = areAllMaritalFurnitureItemsDeliveryLocked(normalized);

    const deliveryRecorded = hasAnyMaritalFurnitureDeliveryRecorded(normalized);

    const patch: Record<string, unknown> = {

        maritalFurnitureItems: normalized,

        furnitureValue,

        furnitureDetails: furnitureDetailsFromItems(normalized),

        totalAmount: deliveryRecorded ? undeliveredTotal : 0,

        debtAmount: deliveryRecorded ? undeliveredTotal : 0,

    };

    if (allLocked) {

        patch.maritalFurnitureDeliveryRecordedAt = ts;

    }



    const decisionId = String(input.decisionId || '').trim();

    const storageId = String(input.decisionsStorageId || '').trim();



    const updatedItem = normalized.find((row) => String(row.id) === String(input.itemId));

    const idFactory =

        deps.nextTimelineId ??

        (() => `tl-mf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

    const timelineEvents: TimelineEvent[] = [];

    if (updatedItem) {

        timelineEvents.push(

            buildMaritalFurnitureItemTimelineEvent(updatedItem, input.outcome, idFactory),

        );

        if (input.outcome === 'failed') {

            timelineEvents.push(

                buildMaritalFurnitureFailedFinancialTimelineEvent(

                    updatedItem,

                    lineTotalIqd(updatedItem),

                    idFactory,

                ),

            );

        }

    }



    const timelineOk = persistMaritalFurnitureTimelineWithPatch(patch, timelineEvents, deps);

    if (!timelineOk) {

        deps.showToast?.('تعذر حفظ حالة التسليم — تحقق من الإضبارة', 'error');

        return false;

    }



    if (decisionId && storageId) {

        patchExecutorDecisionRowReliable(storageId, decisionId, {

            breakInventoryFurnitureLedgerAt: ts,

            breakInventoryFurnitureMode: 'marital_delivery',

            breakInventoryFurnitureLines: normalized.map(

                (row) =>

                    `${row.name}|${row.quantity}|${

                        resolveItemLineDeliveryToken(row)

                    }`,

            ),

        });

    }



    if (deliveryRecorded) {
        notifyMaritalFurnitureFinancialLedgerUpdated();
    }



    const labels: Record<typeof input.outcome, string> = {

        delivered: 'تم تسجيل التسليم',

        failed: `تم تسجيل التعذّر — ${formatMaritalFurnitureIqd(lineTotalIqd(updatedItem!))} د.ع في المركز المالي`,

        external_delivered: 'تم تسجيل التسليم الخارجي',

    };

    deps.showToast?.(labels[input.outcome], 'success');

    return true;

}



function resolveItemLineDeliveryToken(row: MaritalFurnitureItem): string {

    if (row.deliveryOutcome === 'failed') return 'undelivered';

    if (row.deliveryOutcome === 'external_delivered') return 'external_delivered';

    if (row.delivered === true || row.deliveryOutcome === 'delivered') return 'delivered';

    return 'pending';

}


