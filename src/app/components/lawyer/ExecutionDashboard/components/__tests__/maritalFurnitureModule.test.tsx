import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import { MaritalFurnitureModule } from '../MaritalFurnitureModule';

const sampleItems: MaritalFurnitureItem[] = [
    { id: 'item-a', name: 'كنبة', quantity: 1, unitPriceIqd: 100_000 },
    { id: 'item-b', name: 'طاولة', quantity: 2, unitPriceIqd: 50_000 },
];

function renderModule(
    overrides: Partial<React.ComponentProps<typeof MaritalFurnitureModule>> = {},
) {
    const persistExecutionMerge = vi.fn(() => true);
    const pushTimelineEvent = vi.fn(() => true);
    const showToast = vi.fn();

    const view = render(
        <MaritalFurnitureModule
            executionData={{
                id: 'exec-1',
                maritalFurnitureItems: sampleItems,
            } as never}
            persistExecutionMerge={persistExecutionMerge}
            pushTimelineEvent={pushTimelineEvent}
            nextTimelineId={() => 'tl-mf-1'}
            todayYmd="2026-07-31"
            showToast={showToast}
            {...overrides}
        />,
    );

    return { persistExecutionMerge, pushTimelineEvent, showToast, view };
}

describe('MaritalFurnitureModule', () => {
    beforeEach(() => {
        vi.stubGlobal('confirm', vi.fn(() => true));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.style.overflow = '';
    });

    it('يعرض بطاقة ملخص مضغوطة ولا يعرض مساحة العمل قبل الفتح', () => {
        renderModule();

        expect(screen.getByTestId('marital-furniture-launcher')).toBeInTheDocument();
        expect(screen.getByText('2 قطعة')).toBeInTheDocument();
        expect(screen.queryByTestId('marital-furniture-workspace')).not.toBeInTheDocument();
    });

    it('يفتح مساحة الإدارة عند الضغط على البطاقة', () => {
        renderModule();

        fireEvent.click(screen.getByTestId('marital-furniture-launcher'));

        expect(screen.getByTestId('marital-furniture-workspace')).toBeInTheDocument();
        expect(screen.getByText('موعد التسليم الميداني')).toBeInTheDocument();
        expect(screen.getByText('كنبة')).toBeInTheDocument();
        expect(screen.getByText('طاولة')).toBeInTheDocument();
    });

    it('يغلق مساحة الإدارة من زر الإغلاق', () => {
        renderModule();

        fireEvent.click(screen.getByTestId('marital-furniture-launcher'));
        fireEvent.click(screen.getByTestId('marital-furniture-close'));

        expect(screen.queryByTestId('marital-furniture-workspace')).not.toBeInTheDocument();
    });

    it('يحفظ موعد التسليم ويدفعه للسجل الزمني', () => {
        const { persistExecutionMerge, pushTimelineEvent, showToast } = renderModule();

        fireEvent.click(screen.getByTestId('marital-furniture-launcher'));
        fireEvent.change(screen.getByDisplayValue(''), {
            target: { value: '2026-08-10' },
        });
        fireEvent.click(screen.getByTestId('marital-furniture-save-schedule'));

        expect(persistExecutionMerge).not.toHaveBeenCalled();
        expect(pushTimelineEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'tl-mf-1',
                type: 'appointment',
                date: '2026-08-10',
            }),
            expect.objectContaining({
                mergePatch: expect.objectContaining({
                    maritalFurnitureDeliveryScheduleYmd: '2026-08-10',
                }),
            }),
        );
        expect(showToast).toHaveBeenCalledWith('تم حفظ موعد التسليم الميداني', 'success');
    });

    it('يسجّل التسليم الخارجي ويحفظه في الإضبارة', () => {
        const { persistExecutionMerge, pushTimelineEvent } = renderModule();

        fireEvent.click(screen.getByTestId('marital-furniture-launcher'));
        fireEvent.click(screen.getByTestId('marital-furniture-external-item-a'));
        fireEvent.click(screen.getByTestId('marital-furniture-confirm-outcome'));

        expect(persistExecutionMerge).not.toHaveBeenCalled();
        expect(pushTimelineEvent).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'tl-mf-1', type: 'procedure' }),
            expect.objectContaining({
                mergePatch: expect.objectContaining({
                    maritalFurnitureItems: expect.arrayContaining([
                        expect.objectContaining({
                            id: 'item-a',
                            deliveryOutcome: 'external_delivered',
                        }),
                    ]),
                }),
            }),
        );
        expect(screen.queryByTestId('marital-furniture-external-item-a')).not.toBeInTheDocument();
    });

    it('يدخل وضع التعديل ويحفظ القائمة', () => {
        const { persistExecutionMerge, showToast } = renderModule();

        fireEvent.click(screen.getByTestId('marital-furniture-launcher'));
        fireEvent.click(screen.getByTestId('marital-furniture-start-edit'));
        fireEvent.click(screen.getByTestId('marital-furniture-save-list'));

        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({
                maritalFurnitureItems: expect.arrayContaining([
                    expect.objectContaining({ id: 'item-a', name: 'كنبة' }),
                ]),
            }),
        );
        expect(showToast).toHaveBeenCalledWith('تم حفظ قائمة الأثاث', 'success');
    });

    it('يطلب تأكيداً قبل الإغلاق أثناء التعديل', async () => {
        renderModule();

        fireEvent.click(screen.getByTestId('marital-furniture-launcher'));
        fireEvent.click(screen.getByTestId('marital-furniture-start-edit'));
        fireEvent.click(screen.getByTestId('marital-furniture-close'));

        // حوار من التطبيق لا من نظام التشغيل — الإلغاء يُبقي مساحة الإدارة مفتوحة
        const dialog = await screen.findByRole('dialog', { name: 'تأكيد' });
        fireEvent.click(within(dialog).getByRole('button', { name: 'إلغاء' }));

        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: 'تأكيد' })).not.toBeInTheDocument(),
        );
        expect(screen.getByTestId('marital-furniture-workspace')).toBeInTheDocument();
    });

    it('لا ينفّذ التسليم عند الإلغاء من شريط التأكيد', () => {
        const { persistExecutionMerge, pushTimelineEvent } = renderModule();

        fireEvent.click(screen.getByTestId('marital-furniture-launcher'));
        fireEvent.click(screen.getByTestId('marital-furniture-external-item-a'));
        fireEvent.click(screen.getByTestId('marital-furniture-cancel-outcome'));

        expect(persistExecutionMerge).not.toHaveBeenCalled();
        expect(pushTimelineEvent).not.toHaveBeenCalled();
        expect(screen.getByTestId('marital-furniture-external-item-a')).toBeInTheDocument();
    });

    it('يعرض أزرار التسليم وتعذّر بعد حلول الموعد', () => {
        renderModule({
            executionData: {
                id: 'exec-1',
                maritalFurnitureItems: sampleItems,
                maritalFurnitureDeliveryScheduleYmd: '2026-07-01',
                maritalFurnitureDeliveryScheduleLabel: 'موعد سابق',
            } as never,
            todayYmd: '2026-07-31',
        });

        fireEvent.click(screen.getByTestId('marital-furniture-launcher'));

        const workspace = screen.getByTestId('marital-furniture-workspace');
        expect(within(workspace).getByTestId('marital-furniture-deliver-item-a')).toBeInTheDocument();
        expect(within(workspace).getByTestId('marital-furniture-fail-item-a')).toBeInTheDocument();
    });
});
