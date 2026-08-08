import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { buildVisitationScheduleBundle } from '@/app/utils/visitationScheduleEngine';
import type { VisitationScheduleConfig } from '@/app/types/visitationSchedule';
import { VisitationScheduleModule } from '../VisitationScheduleModule';

const baseConfig = (): VisitationScheduleConfig => ({
    decisionMode: 'viewing_pickup',
    location: 'مديرية التنفيذ',
    startTime: '10:00',
    endTime: '14:00',
    executionStartDate: '2026-06-01',
    anchorDate: '2026-06-04',
    weekDays: [4, 5],
    monthWeeks: [1, 3],
});

function buildBundle() {
    const built = buildVisitationScheduleBundle(baseConfig());
    if ('error' in built) throw new Error(built.error);
    return built.bundle;
}

function renderModule(
    overrides: Partial<React.ComponentProps<typeof VisitationScheduleModule>> = {},
) {
    const persistExecutionMerge = vi.fn();
    const pushTimelineEvent = vi.fn();
    const showToast = vi.fn();
    const bundle = buildBundle();

    const view = render(
        <VisitationScheduleModule
            executionData={{
                id: 'exec-1',
                visitationSchedule: bundle,
            } as never}
            visitChildNames={['أحمد', 'سارة']}
            fileNumber="12"
            todayYmd="2026-06-04"
            persistExecutionMerge={persistExecutionMerge}
            pushTimelineEvent={pushTimelineEvent}
            nextTimelineId={() => 'tl-vs-1'}
            showToast={showToast}
            {...overrides}
        />,
    );

    return { persistExecutionMerge, pushTimelineEvent, showToast, bundle, view };
}

describe('VisitationScheduleModule', () => {
    beforeEach(() => {
        vi.stubGlobal('confirm', vi.fn(() => true));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.style.overflow = '';
    });

    it('يعرض بطاقة ملخص مضغوطة ولا يعرض مساحة العمل قبل الفتح', () => {
        renderModule();

        expect(screen.getByTestId('visitation-schedule-launcher')).toBeInTheDocument();
        expect(screen.getByText(/أحمد/)).toBeInTheDocument();
        expect(screen.queryByTestId('visitation-schedule-workspace')).not.toBeInTheDocument();
    });

    it('يفتح مساحة الإدارة عند الضغط على البطاقة', () => {
        renderModule();

        fireEvent.click(screen.getByTestId('visitation-schedule-launcher'));

        expect(screen.getByTestId('visitation-schedule-workspace')).toBeInTheDocument();
        expect(screen.getByText('أقرب موعد')).toBeInTheDocument();
    });

    it('يغلق مساحة الإدارة من زر الإغلاق', () => {
        renderModule();

        fireEvent.click(screen.getByTestId('visitation-schedule-launcher'));
        fireEvent.click(screen.getByTestId('visitation-schedule-close'));

        expect(screen.queryByTestId('visitation-schedule-workspace')).not.toBeInTheDocument();
    });

    it('يعرض تبويب التقويم داخل مساحة العمل', () => {
        renderModule();

        fireEvent.click(screen.getByTestId('visitation-schedule-launcher'));
        fireEvent.click(screen.getByTestId('visitation-tab-calendar'));

        expect(screen.getByText(/نافذة \d+ أشهر/)).toBeInTheDocument();
    });

    it('يدفع حدث procedure عند توثيق النجاح', () => {
        const { pushTimelineEvent } = renderModule();

        fireEvent.click(screen.getByTestId('visitation-schedule-launcher'));
        fireEvent.click(screen.getByTestId('visitation-document-success'));

        expect(pushTimelineEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'tl-vs-1',
                type: 'procedure',
            }),
        );
    });

    it('يعرض إعداد الجدول عند غياب الحزمة', () => {
        renderModule({
            executionData: { id: 'exec-1' } as never,
            visitChildNames: [],
        });

        expect(screen.getByText('إعداد الجدول')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('visitation-schedule-launcher'));
        expect(screen.getByText('إعداد جدول المواعيد')).toBeInTheDocument();
    });
});
