import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSmartLegalRadarForm } from '@/app/components/lawyer/SmartLegalRadar/hooks/useSmartLegalRadarForm';

vi.mock('@/app/runtime/radarWidgetLoader', () => ({
    prefetchRadarEventForm: vi.fn(),
}));

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
