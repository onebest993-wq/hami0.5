import { describe, expect, it, vi } from 'vitest';
import type { Dispatch, SetStateAction } from 'react';
import type { TimelineEvent } from '@/app/types/execution';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import {
    applyMaritalFurnitureDeliveryOutcome,
    areAllMaritalFurnitureItemsDeliveryLocked,
    isMaritalFurnitureItemDeliveryLocked,
    resolveMaritalFurnitureDeliveryOutcome,
} from '@/app/utils/maritalFurniture';
import {
    buildMaritalFurnitureFailedFinancialTimelineEvent,
    runPersistMaritalFurnitureDeliverySchedule,
    runPersistMaritalFurnitureItemDeliveryOutcome,
} from '@/app/utils/maritalFurnitureDeliveryPersistence';

describe('maritalFurniture delivery persistence', () => {
    it('persists schedule atomically with timeline via mergePatch', () => {
        const persistExecutionMerge = vi.fn(() => true);
        const pushTimelineEvent = vi.fn(() => true);
        const ok = runPersistMaritalFurnitureDeliverySchedule(
            {
                ymd: '2026-08-01',
                displayAr: 'السبت 1 آب 2026',
                scheduleLabel: 'موعد التسليم: السبت 1 آب 2026',
            },
            { persistExecutionMerge, pushTimelineEvent, nextTimelineId: () => 'tl-1' },
        );
        expect(ok).toBe(true);
        expect(persistExecutionMerge).not.toHaveBeenCalled();
        expect(pushTimelineEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'tl-1',
                type: 'appointment',
                date: '2026-08-01',
            }),
            expect.objectContaining({
                mergePatch: expect.objectContaining({
                    maritalFurnitureDeliveryScheduleYmd: '2026-08-01',
                }),
            }),
        );
    });

    it('returns false when schedule timeline persist fails entirely', () => {
        const persistExecutionMerge = vi.fn(() => false);
        const pushTimelineEvent = vi.fn(() => false);
        const ok = runPersistMaritalFurnitureDeliverySchedule(
            {
                ymd: '2026-08-01',
                displayAr: 'السبت 1 آب 2026',
                scheduleLabel: 'موعد التسليم: السبت 1 آب 2026',
            },
            { persistExecutionMerge, pushTimelineEvent, nextTimelineId: () => 'tl-1' },
        );
        expect(ok).toBe(false);
        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({
                maritalFurnitureDeliveryScheduleYmd: '2026-08-01',
                timelineEvents: expect.any(Array),
            }),
        );
    });

    it('falls back to persistExecutionMerge when pushTimelineEvent fails', () => {
        const items: MaritalFurnitureItem[] = [
            { id: 'a', name: 'كنبة', quantity: 1, unitPriceIqd: 1000 },
        ];
        const persistExecutionMerge = vi.fn(() => true);
        const pushTimelineEvent = vi.fn(() => false);
        const setTimelineEvents = vi.fn();
        const ok = runPersistMaritalFurnitureItemDeliveryOutcome(
            { itemId: 'a', outcome: 'external_delivered' },
            {
                executionData: { maritalFurnitureItems: items },
                items,
                persistExecutionMerge,
                pushTimelineEvent,
                setTimelineEvents,
                getTimelineEvents: () => [],
                nextTimelineId: () => 'tl-fallback',
                showToast: vi.fn(),
            },
        );
        expect(ok).toBe(true);
        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({
                maritalFurnitureItems: expect.arrayContaining([
                    expect.objectContaining({ id: 'a', deliveryOutcome: 'external_delivered' }),
                ]),
                timelineEvents: expect.any(Array),
            }),
        );
        expect(setTimelineEvents).toHaveBeenCalled();
    });

    it('locks item after delivery outcome and updates execution blob atomically', () => {
        const items: MaritalFurnitureItem[] = [
            { id: 'a', name: 'كنبة', quantity: 1, unitPriceIqd: 1000 },
            { id: 'b', name: 'طاولة', quantity: 1, unitPriceIqd: 2000 },
        ];
        const pushTimelineEvent = vi.fn(() => true);
        const ok = runPersistMaritalFurnitureItemDeliveryOutcome(
            { itemId: 'a', outcome: 'delivered' },
            {
                executionData: { maritalFurnitureItems: items },
                persistExecutionMerge: vi.fn(() => true),
                pushTimelineEvent,
                nextTimelineId: () => 'tl-2',
                showToast: vi.fn(),
            },
        );
        expect(ok).toBe(true);
        expect(pushTimelineEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'tl-2',
                type: 'procedure',
            }),
            expect.objectContaining({
                mergePatch: expect.objectContaining({
                    maritalFurnitureItems: expect.arrayContaining([
                        expect.objectContaining({
                            id: 'a',
                            deliveryOutcome: 'delivered',
                            delivered: true,
                        }),
                    ]),
                }),
            }),
        );
    });

    it('adds financial timeline event and debt when delivery fails', () => {
        const items: MaritalFurnitureItem[] = [
            { id: 'a', name: 'كنبة', quantity: 1, unitPriceIqd: 500_000 },
        ];
        const pushTimelineEvent = vi.fn(() => true);
        const ok = runPersistMaritalFurnitureItemDeliveryOutcome(
            { itemId: 'a', outcome: 'failed' },
            {
                executionData: { maritalFurnitureItems: items },
                persistExecutionMerge: vi.fn(() => true),
                pushTimelineEvent,
                nextTimelineId: () => 'tl-3',
                showToast: vi.fn(),
            },
        );
        expect(ok).toBe(true);
        expect(pushTimelineEvent).toHaveBeenCalledTimes(2);
        expect(pushTimelineEvent).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ type: 'procedure', title: 'تعذّر تسليم قطعة أثاث' }),
            expect.objectContaining({
                mergePatch: expect.objectContaining({
                    debtAmount: 500_000,
                    totalAmount: 500_000,
                }),
            }),
        );
        expect(pushTimelineEvent).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                type: 'action',
                title: 'تحويل قيمة أثاث إلى المركز المالي',
            }),
        );
        expect(
            buildMaritalFurnitureFailedFinancialTimelineEvent(items[0]!, 500_000, () => 'x').type,
        ).toBe('action');
    });

    it('falls back to setTimelineEvents when pushTimelineEvent is missing', () => {
        const items: MaritalFurnitureItem[] = [
            { id: 'a', name: 'كنبة', quantity: 1, unitPriceIqd: 1000 },
        ];
        const persistExecutionMerge = vi.fn(() => true);
        const setTimelineEvents = vi.fn((updater: SetStateAction<TimelineEvent[]>) => {
            const next =
                typeof updater === 'function'
                    ? updater([])
                    : updater;
            expect(next).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: 'tl-3',
                        type: 'procedure',
                    }),
                ]),
            );
        });
        const ok = runPersistMaritalFurnitureItemDeliveryOutcome(
            { itemId: 'a', outcome: 'external_delivered' },
            {
                executionData: { maritalFurnitureItems: items },
                persistExecutionMerge,
                setTimelineEvents,
                getTimelineEvents: () => [],
                nextTimelineId: () => 'tl-3',
                showToast: vi.fn(),
            },
        );
        expect(ok).toBe(true);
        expect(setTimelineEvents).toHaveBeenCalledTimes(1);
        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({
                timelineEvents: expect.any(Array),
                maritalFurnitureItems: expect.any(Array),
            }),
        );
    });

    it('resolves delivery lock states', () => {
        const locked = applyMaritalFurnitureDeliveryOutcome(
            { id: '1', name: 'x', quantity: 1, unitPriceIqd: 1 },
            'failed',
            '2026-01-01T00:00:00.000Z',
        );
        expect(isMaritalFurnitureItemDeliveryLocked(locked)).toBe(true);
        expect(resolveMaritalFurnitureDeliveryOutcome(locked)).toBe('failed');
        expect(
            areAllMaritalFurnitureItemsDeliveryLocked([
                locked,
                applyMaritalFurnitureDeliveryOutcome(
                    { id: '2', name: 'y', quantity: 1, unitPriceIqd: 1 },
                    'external_delivered',
                    '2026-01-01T00:00:00.000Z',
                ),
            ]),
        ).toBe(true);
    });
});
