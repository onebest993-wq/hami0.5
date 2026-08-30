import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { RadarOpenInstantAddHost } from '@/app/components/lawyer/dashboard/schedule/RadarOpenInstantAddHost';
import { getCachedCalendarEvents, resetCalendarEventsCacheForTests } from '@/app/services/calendar/calendarEventsCache';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        warning: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        info: vi.fn(),
    },
}));

vi.mock('@/app/components/lawyer/dashboard/schedule/prefetchRadarEventForm', () => ({
    prefetchRadarEventForm: vi.fn(),
    loadRadarEventFormModule: () =>
        Promise.resolve({
            EventForm: ({
                show,
                formData,
                onSave,
            }: {
                show: boolean;
                formData: { title: string; date: string };
                onSave: (data: { title: string; date: string; time: string; type: string; location: string; notes: string; clientName: string; clientPhone: string; reminderMinutesBefore: null }) => void;
            }) =>
                show ? (
                    <div data-testid="radar-event-form">
                        <button
                            type="button"
                            data-testid="radar-event-save"
                            onClick={() =>
                                onSave({
                                    title: formData.title || 'موعد من الصدفة',
                                    date: formData.date,
                                    time: '',
                                    type: 'custom',
                                    location: '',
                                    notes: '',
                                    clientName: '',
                                    clientPhone: '',
                                    reminderMinutesBefore: null,
                                })
                            }
                        >
                            حفظ
                        </button>
                    </div>
                ) : null,
        }),
}));

const { saveCalendarEvent } = vi.hoisted(() => ({
    saveCalendarEvent: vi.fn(async () => undefined),
}));

vi.mock('@/app/services/calendar/calendarCloudRuntime', () => ({
    saveCalendarEvent: (...args: unknown[]) => saveCalendarEvent(...args),
    updateCalendarEvent: vi.fn(),
    deleteCalendarEvent: vi.fn(),
}));

describe('RadarOpenInstantAddHost', () => {
    beforeEach(() => {
        resetCalendarEventsCacheForTests();
        saveCalendarEvent.mockClear();
    });

    it('يحفظ موعداً من الصدفة ويحدّث الكاش', async () => {
        const onClose = vi.fn();
        render(
            <RadarOpenInstantAddHost
                userId="lawyer-1"
                selectedDate="2026-08-30"
                show
                editingEventId={null}
                onClose={onClose}
            />,
        );

        await waitFor(() => {
            expect(screen.getByTestId('radar-event-form')).toBeTruthy();
        });

        await act(async () => {
            screen.getByTestId('radar-event-save').click();
        });

        await waitFor(() => {
            expect(saveCalendarEvent).toHaveBeenCalled();
            expect(onClose).toHaveBeenCalled();
        });
        const saved = saveCalendarEvent.mock.calls[0]?.[0] as { title: string; userId: string; id: string };
        expect(saved.title).toBe('موعد من الصدفة');
        expect(saved.userId).toBe('lawyer-1');
        expect(getCachedCalendarEvents('lawyer-1')?.some((row) => row.id === saved.id)).toBe(true);
    });
});
