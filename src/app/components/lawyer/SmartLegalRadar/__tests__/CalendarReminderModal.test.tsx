import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CalendarReminderModal } from '@/app/components/lawyer/SmartLegalRadar/CalendarReminderModal';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import {
    consumeNativeBackForTests,
    resetNativeBackHandlersForTests,
} from '@/app/runtime/nativeBackStack';

vi.mock('@/app/services/calendar/calendarReminderAlarmSound', () => ({
    playHamiLegalReminderAlarm: vi.fn(async () => () => undefined),
    stopHamiLegalReminderAlarm: vi.fn(),
}));

const event: CalendarEvent = {
    id: 'evt-1',
    userId: 'u1',
    title: 'جلسة محكمة',
    date: '2026-08-22',
    time: '10:00',
    type: 'hearing',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    reminderMinutesBefore: 15,
};

describe('CalendarReminderModal', () => {
    beforeEach(() => {
        resetNativeBackHandlersForTests();
    });

    it('Escape وCap يغلقان التذكير دون النقر على الزر', () => {
        const onDismiss = vi.fn();
        render(
            <CalendarReminderModal
                alarm={{ event, fireAt: new Date('2026-08-22T09:45:00.000Z'), reminderMinutesBefore: 15 }}
                onDismiss={onDismiss}
                onSnooze={vi.fn()}
            />,
        );

        expect(screen.getByTestId('calendar-reminder-dismiss')).toHaveTextContent('إيقاف المنبه');
        fireEvent.click(screen.getByTestId('calendar-reminder-mute'));
        expect(screen.getByTestId('calendar-reminder-mute')).toHaveTextContent('الصوت متوقف');
        expect(screen.getByTestId('calendar-reminder-snooze-30')).toHaveTextContent('30 دقيقة');

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onDismiss).toHaveBeenCalledTimes(1);

        expect(consumeNativeBackForTests()).toBe(true);
        expect(onDismiss).toHaveBeenCalledTimes(2);
    });

    it('لا يُسجَّل رجوع أصلي عندما لا يوجد منبّه', () => {
        render(<CalendarReminderModal alarm={null} onDismiss={vi.fn()} onSnooze={vi.fn()} />);
        expect(screen.queryByTestId('calendar-reminder-modal')).not.toBeInTheDocument();
        expect(consumeNativeBackForTests()).toBe(false);
    });
});
