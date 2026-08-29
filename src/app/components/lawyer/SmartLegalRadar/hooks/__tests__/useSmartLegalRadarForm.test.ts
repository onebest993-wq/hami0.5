import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSmartLegalRadarForm } from '@/app/components/lawyer/SmartLegalRadar/hooks/useSmartLegalRadarForm';

vi.mock('@/app/services/calendar/calendarCloudLoader', () => ({
    prefetchCalendarCloudModule: vi.fn(),
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        warning: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

import { SmartToast } from '@/app/components/ui/SmartToast';

describe('useSmartLegalRadarForm', () => {
    const addEvent = vi.fn();
    const updateEvent = vi.fn();
    const deleteEvent = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        addEvent.mockResolvedValue({
            id: 'evt-1',
            userId: 'user-1',
            title: 'جلسة',
            date: '2026-07-02',
            type: 'custom',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        });
    });

    it('يحفظ موعداً جديداً ويغلق النموذج', async () => {
        const { result } = renderHook(() =>
            useSmartLegalRadarForm({
                selectedDate: '2026-07-02',
                effectiveUserId: 'user-1',
                customEvents: [],
                addEvent,
                updateEvent,
                deleteEvent,
            }),
        );

        act(() => {
            result.current.openAddForm();
        });
        expect(result.current.showForm).toBe(true);

        await act(async () => {
            await result.current.handleSave({
                ...result.current.formData,
                title: 'جلسة مرافعة',
            });
        });

        expect(addEvent).toHaveBeenCalledTimes(1);
        expect(result.current.showForm).toBe(false);
        expect(result.current.saving).toBe(false);
    });

    it('لا يعلن نجاح التحديث إذا أعاد updateEvent null', async () => {
        updateEvent.mockResolvedValueOnce(null);
        const existing = {
            id: 'evt-1',
            userId: 'user-1',
            title: 'جلسة',
            date: '2026-07-02',
            type: 'custom' as const,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        };
        const { result } = renderHook(() =>
            useSmartLegalRadarForm({
                selectedDate: '2026-07-02',
                effectiveUserId: 'user-1',
                customEvents: [existing],
                addEvent,
                updateEvent,
                deleteEvent,
            }),
        );

        act(() => {
            result.current.openEditForm({
                id: 'cal_evt-1',
                title: 'جلسة',
                date: '2026-07-02',
                type: 'custom',
                source: 'calendar',
            });
        });

        await act(async () => {
            await result.current.handleSave({
                ...result.current.formData,
                title: 'جلسة محدّثة',
            });
        });

        expect(updateEvent).toHaveBeenCalledTimes(1);
        expect(SmartToast.success).not.toHaveBeenCalled();
        expect(SmartToast.error).toHaveBeenCalledWith('فشل حفظ الموعد');
        expect(result.current.showForm).toBe(true);
    });

    it('لا يعلن نجاح الحذف إذا أعاد deleteEvent false', async () => {
        deleteEvent.mockResolvedValueOnce(false);
        const { result } = renderHook(() =>
            useSmartLegalRadarForm({
                selectedDate: '2026-07-02',
                effectiveUserId: 'user-1',
                customEvents: [],
                addEvent,
                updateEvent,
                deleteEvent,
            }),
        );

        await act(async () => {
            await result.current.handleDelete({
                id: 'cal_evt-1',
                title: 'جلسة',
                date: '2026-07-02',
                type: 'custom',
                source: 'calendar',
            });
        });

        expect(SmartToast.success).not.toHaveBeenCalled();
        expect(SmartToast.error).toHaveBeenCalledWith('فشل حذف الموعد');
    });

    it('يمنع النقر المزدوج أثناء الحذف', async () => {
        let resolveDelete: (value: boolean) => void = () => undefined;
        deleteEvent.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveDelete = resolve;
                }),
        );

        const { result } = renderHook(() =>
            useSmartLegalRadarForm({
                selectedDate: '2026-07-02',
                effectiveUserId: 'user-1',
                customEvents: [],
                addEvent,
                updateEvent,
                deleteEvent,
            }),
        );

        const event = {
            id: 'cal_evt-1',
            title: 'جلسة',
            date: '2026-07-02',
            type: 'custom' as const,
            source: 'calendar' as const,
        };

        let firstDelete: Promise<void> = Promise.resolve();
        act(() => {
            firstDelete = result.current.handleDelete(event);
        });
        act(() => {
            void result.current.handleDelete(event);
        });

        await act(async () => {
            resolveDelete(true);
            await firstDelete;
        });

        expect(deleteEvent).toHaveBeenCalledTimes(1);
        expect(SmartToast.success).toHaveBeenCalledWith('تم حذف الموعد');
    });

    it('يمنع النقر المزدوج أثناء الحفظ', async () => {
        let resolveAdd: (value: unknown) => void = () => undefined;
        addEvent.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveAdd = resolve;
                }),
        );

        const { result } = renderHook(() =>
            useSmartLegalRadarForm({
                selectedDate: '2026-07-02',
                effectiveUserId: 'user-1',
                customEvents: [],
                addEvent,
                updateEvent,
                deleteEvent,
            }),
        );

        act(() => {
            result.current.openAddForm();
        });

        let firstSave: Promise<void>;
        act(() => {
            firstSave = result.current.handleSave({
                ...result.current.formData,
                title: 'موعد',
            });
        });
        act(() => {
            void result.current.handleSave({
                ...result.current.formData,
                title: 'موعد',
            });
        });

        await act(async () => {
            resolveAdd({
                id: 'evt-2',
                userId: 'user-1',
                title: 'موعد',
                date: '2026-07-02',
                type: 'custom',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            });
            await firstSave!;
        });

        expect(addEvent).toHaveBeenCalledTimes(1);
    });
});
