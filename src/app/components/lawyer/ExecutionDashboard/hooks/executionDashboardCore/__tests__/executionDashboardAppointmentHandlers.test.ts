import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ExecutionFile } from '@/app/types/execution';
import { useExecutionDashboardAppointmentHandlers } from '../useExecutionDashboardAppointmentHandlers';

vi.mock('@/app/services/calendar/bridge', () => ({
    CalendarBridge: {
        syncExecutionAppointment: vi.fn(),
    },
    normalizeDateToYmd: vi.fn((value: string) => value),
}));

describe('useExecutionDashboardAppointmentHandlers', () => {
    const baseParams = () => ({
        appointmentPurpose: 'مراجعة',
        appointmentDateOnly: '2026-06-27',
        appointmentTimeOptional: '',
        editingAppointmentId: null as string | null,
        timelineEventsRef: { current: [] },
        currentFileId: 'file-1',
        executionData: { fileNumber: '123', creditors: [{ name: 'أحمد' }] } as ExecutionFile,
        file: null,
        nextTimelineId: (() => {
            let n = 0;
            return () => `tl-${++n}`;
        })(),
        persistExecutionMerge: vi.fn(),
        showToast: vi.fn(),
        setTimelineEvents: vi.fn(),
        setAppointmentPurpose: vi.fn(),
        setAppointmentDateOnly: vi.fn(),
        setAppointmentTimeOptional: vi.fn(),
        setEditingAppointmentId: vi.fn(),
    });

    beforeEach(() => {
        vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-06-27T12:00:00.000Z');
    });

    it('warns when purpose or date missing', () => {
        const showToast = vi.fn();
        const persistExecutionMerge = vi.fn();

        const { result } = renderHook(() =>
            useExecutionDashboardAppointmentHandlers({
                ...baseParams(),
                appointmentPurpose: '',
                showToast,
                persistExecutionMerge,
            }),
        );

        act(() => {
            result.current.handleSaveAppointment();
        });

        expect(showToast).toHaveBeenCalledWith('يرجى إدخال الغرض وتاريخ الموعد', 'warning');
        expect(persistExecutionMerge).not.toHaveBeenCalled();
    });

    it('creates a new appointment and persists synced timeline', async () => {
        const persistExecutionMerge = vi.fn();
        const setTimelineEvents = vi.fn();
        const showToast = vi.fn();
        const { CalendarBridge } = await import('@/app/services/calendar/bridge');

        const { result } = renderHook(() =>
            useExecutionDashboardAppointmentHandlers({
                ...baseParams(),
                persistExecutionMerge,
                setTimelineEvents,
                showToast,
            }),
        );

        act(() => {
            result.current.handleSaveAppointment();
        });

        expect(setTimelineEvents).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    type: 'appointment',
                    source: 'إضافة موعد',
                }),
            ]),
        );
        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({
                timelineEvents: expect.any(Array),
            }),
        );
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });
        expect(CalendarBridge.syncExecutionAppointment).toHaveBeenCalledWith(
            expect.objectContaining({
                executionId: 'file-1',
                purpose: 'مراجعة',
                date: '2026-06-27',
            }),
        );
        expect(showToast).toHaveBeenCalledWith('تم حفظ الموعد بنجاح', 'success');
    });

    /**
     * حارس انحدار: عقود العناقيد تتجاهل تغيّر مراجع الدوال، فقد يبقى الـ scope
     * ممسكاً بأول نسخة من الدالة. النسخة القديمة يجب أن تقرأ القيم الحديثة
     * عبر draftRef — لا أن تفشل بـ«يرجى إدخال الغرض وتاريخ الموعد».
     */
    it('stale first-render handler reference still saves freshly typed values', () => {
        const persistExecutionMerge = vi.fn();
        const showToast = vi.fn();

        const { result, rerender } = renderHook(
            (props: Parameters<typeof useExecutionDashboardAppointmentHandlers>[0]) =>
                useExecutionDashboardAppointmentHandlers(props),
            {
                initialProps: {
                    ...baseParams(),
                    appointmentPurpose: '',
                    appointmentDateOnly: '',
                    persistExecutionMerge,
                    showToast,
                },
            },
        );

        // الـ scope القديم يمسك بأول مرجع للدالة (قبل الكتابة)
        const staleHandlerReference = result.current.handleSaveAppointment;

        // المستخدم يكتب الغرض والتاريخ → rerender بقيم حديثة
        rerender({
            ...baseParams(),
            appointmentPurpose: 'جلسة متابعة',
            appointmentDateOnly: '2026-07-20',
            persistExecutionMerge,
            showToast,
        });

        act(() => {
            staleHandlerReference();
        });

        expect(showToast).not.toHaveBeenCalledWith('يرجى إدخال الغرض وتاريخ الموعد', 'warning');
        expect(showToast).toHaveBeenCalledWith('تم حفظ الموعد بنجاح', 'success');
        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({ timelineEvents: expect.any(Array) }),
        );
    });

    it('updates an existing appointment by id', () => {
        const persistExecutionMerge = vi.fn();
        const setTimelineEvents = vi.fn();
        const showToast = vi.fn();

        const { result } = renderHook(() =>
            useExecutionDashboardAppointmentHandlers({
                ...baseParams(),
                editingAppointmentId: 'ap-1',
                timelineEventsRef: {
                    current: [
                        {
                            id: 'ap-1',
                            type: 'appointment',
                            date: '2026-06-20T12:00:00',
                            timestamp: '2026-06-20T12:00:00.000Z',
                            title: 'قديم',
                            description: 'قديم',
                            source: 'إضافة موعد',
                        },
                    ],
                },
                persistExecutionMerge,
                setTimelineEvents,
                showToast,
            }),
        );

        act(() => {
            result.current.handleSaveAppointment();
        });

        expect(setTimelineEvents).toHaveBeenCalledWith([
            expect.objectContaining({
                id: 'ap-1',
                source: 'تعديل موعد',
            }),
        ]);
        expect(showToast).toHaveBeenCalledWith('تم تعديل الموعد بنجاح', 'success');
        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({
                timelineEvents: expect.any(Array),
            }),
        );
    });
});
