import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustodyRemovalWardsModule } from '../CustodyRemovalWardsModule';
import { matchesExecutionTimelineFilter } from '@/app/utils/timelineCategoryFilter';
import { buildCustodyWardTimelineEvent } from '@/app/utils/custodyWardDeliveryEngine';

function renderModule(overrides: Partial<React.ComponentProps<typeof CustodyRemovalWardsModule>> = {}) {
    let timelineState: import('@/app/types/execution').TimelineEvent[] = [];
    const setTimelineEvents = vi.fn((updater) => {
        timelineState =
            typeof updater === 'function'
                ? (updater as (prev: typeof timelineState) => typeof timelineState)(timelineState)
                : updater;
    });
    const persistExecutionMerge = vi.fn(() => true);
    const showToast = vi.fn();

    const view = render(
        <CustodyRemovalWardsModule
            executionId="ex-1"
            parentDossierId="ex-1"
            executionData={{ id: 'ex-1' } as never}
            custodyWardNames={['أحمد']}
            timelineEvents={timelineState}
            todayYmd="2026-07-31"
            setTimelineEvents={setTimelineEvents}
            persistExecutionMerge={persistExecutionMerge}
            nextTimelineId={() => 'tl-1'}
            showToast={showToast}
            {...overrides}
        />,
    );

    return { setTimelineEvents, persistExecutionMerge, showToast, view, getTimelineState: () => timelineState };
}

describe('CustodyRemovalWardsModule', () => {
    it('يحفظ موعد التسليم ذرياً في السجل وبيانات المحضونين', () => {
        const { setTimelineEvents, persistExecutionMerge, showToast } = renderModule();

        fireEvent.click(screen.getByRole('button', { name: /أحمد/ }));
        fireEvent.change(screen.getByDisplayValue('') as HTMLInputElement, {
            target: { value: '2026-08-05' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));

        expect(setTimelineEvents).toHaveBeenCalled();
        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({
                custodyWardDelivery: expect.objectContaining({
                    wards: [
                        expect.objectContaining({
                            wardKey: 'ward-0',
                            status: 'scheduled',
                            appointmentYmd: '2026-08-05',
                        }),
                    ],
                }),
                timelineEvents: expect.any(Array),
            }),
        );
        expect(showToast).toHaveBeenCalledWith('تم حفظ موعد التسليم', 'success');
    });

    it('يسجّل تم الاستلام في السجل الزمني', () => {
        const { persistExecutionMerge } = renderModule({
            executionData: {
                id: 'ex-1',
                custodyWardDelivery: {
                    wards: [
                        {
                            wardKey: 'ward-0',
                            name: 'أحمد',
                            status: 'scheduled',
                            appointmentYmd: '2026-07-31',
                        },
                    ],
                },
            } as never,
        });

        fireEvent.click(screen.getByRole('button', { name: /أحمد/ }));
        fireEvent.click(screen.getByRole('button', { name: 'تم الاستلام' }));

        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({
                custodyWardDelivery: expect.objectContaining({
                    wards: [
                        expect.objectContaining({
                            status: 'received',
                        }),
                    ],
                }),
                timelineEvents: expect.arrayContaining([
                    expect.objectContaining({
                        type: 'procedure',
                        title: expect.stringContaining('تسليم'),
                    }),
                ]),
            }),
        );
    });

    it('يوسم أحداث المحضون للإضبارة الأم عند عدم تفعيل الإنابة', () => {
        const { persistExecutionMerge } = renderModule({
            executionId: 'ex-parent',
            parentDossierId: 'ex-parent',
            activeSubFileId: 'inaba-sub-1',
            isInabaActive: false,
            executionData: {
                id: 'ex-parent',
                custodyWardDelivery: {
                    wards: [
                        {
                            wardKey: 'ward-0',
                            name: 'أحمد',
                            status: 'scheduled',
                            appointmentYmd: '2026-07-31',
                        },
                    ],
                },
            } as never,
        });

        fireEvent.click(screen.getByRole('button', { name: /أحمد/ }));
        fireEvent.click(screen.getByRole('button', { name: 'تم الاستلام' }));

        const patch = vi.mocked(persistExecutionMerge).mock.calls.at(-1)?.[0] as {
            timelineEvents?: Array<{ metadata?: Record<string, unknown> }>;
        };
        const wardEvent = patch?.timelineEvents?.find((e) =>
            String(e.metadata?.custodyWardEventKind ?? '') === 'received',
        );
        expect(wardEvent?.metadata?.dossierScope).toBe('parent');
        expect(wardEvent?.metadata?.inabaSubFileId).toBeUndefined();
    });

    it('يعرض الموعد المحفوظ في البطاقة من السجل الزمني', () => {
        const appt = buildCustodyWardTimelineEvent(
            {
                wardKey: 'ward-0',
                name: 'أحمد',
                status: 'scheduled',
                appointmentYmd: '2026-08-05',
            },
            'appointment',
            { id: 'tl-saved', todayYmd: '2026-07-31' },
        );
        renderModule({
            timelineEvents: [appt],
            executionData: { id: 'ex-1' } as never,
        });
        expect(screen.getByText(/٥ آب 2026|5 آب 2026/)).toBeInTheDocument();
    });

    it('يعطّل حفظ الموعد قبل اختيار تاريخ', () => {
        renderModule({ custodyWardNames: ['سارة'] });
        fireEvent.click(screen.getByRole('button', { name: /سارة/ }));
        expect(screen.getByRole('button', { name: 'حفظ' })).toBeDisabled();
    });
});

describe('custody ward timeline taxonomy', () => {
    it('موعد المحضون يظهر تحت تبويب مواعيد والتسليم تحت قرارات ومحاضر', () => {
        const ward = {
            wardKey: 'ward-0',
            name: 'أحمد',
            status: 'scheduled' as const,
            appointmentYmd: '2026-07-31',
        };
        const appt = buildCustodyWardTimelineEvent(ward, 'appointment', {
            id: 'tl-a',
            todayYmd: '2026-07-30',
        });
        const received = buildCustodyWardTimelineEvent(
            { ...ward, status: 'received' },
            'received',
            { id: 'tl-b', todayYmd: '2026-07-30' },
        );

        expect(matchesExecutionTimelineFilter(appt, 'مواعيد')).toBe(true);
        expect(matchesExecutionTimelineFilter(received, 'قرارات ومحاضر')).toBe(true);
        expect(appt.metadata?.timelineThreadKey).toBe('custody_ward_appt:ward-0');
    });
});
