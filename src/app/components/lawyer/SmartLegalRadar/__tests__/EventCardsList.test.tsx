import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EventCardsList, EVENT_LIST_EXPAND_THRESHOLD } from '@/app/components/lawyer/SmartLegalRadar/EventCardsList';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

function makeEvent(id: string): UnifiedEvent {
    return {
        id,
        title: `موعد ${id}`,
        date: '2026-06-01',
        type: 'custom',
        source: 'calendar',
    };
}

/** زر الحذف يحمل `radar-event-card-delete-*` — لا يُحسب بطاقة. */
function visibleEventCards() {
    return screen.getAllByRole('article');
}

describe('EventCardsList', () => {
    it('يعرض الكل عندما العدد ≤ threshold', () => {
        const events = Array.from({ length: EVENT_LIST_EXPAND_THRESHOLD }, (_, i) =>
            makeEvent(`e-${i}`),
        );
        render(
            <EventCardsList events={events} onEdit={vi.fn()} onDelete={vi.fn()} />,
        );
        expect(screen.queryByTestId('radar-show-all-events')).toBeNull();
        expect(visibleEventCards()).toHaveLength(EVENT_LIST_EXPAND_THRESHOLD);
    });

    it('يُظهر زر expand ثم كل البطاقات', async () => {
        const events = Array.from({ length: EVENT_LIST_EXPAND_THRESHOLD + 3 }, (_, i) =>
            makeEvent(`e-${i}`),
        );
        render(
            <EventCardsList events={events} onEdit={vi.fn()} onDelete={vi.fn()} />,
        );
        expect(visibleEventCards()).toHaveLength(EVENT_LIST_EXPAND_THRESHOLD);
        fireEvent.click(screen.getByTestId('radar-show-all-events'));
        await waitFor(() => {
            expect(visibleEventCards()).toHaveLength(events.length);
        });
    });

    it('يميّز البطاقة عند تمرير معرّف CalendarDB الخام', () => {
        const events = [makeEvent('cal_evt-9'), makeEvent('cal_evt-8')];
        render(
            <EventCardsList
                events={events}
                highlightEventId="evt-9"
                onEdit={vi.fn()}
                onDelete={vi.fn()}
            />,
        );
        expect(screen.getByTestId('radar-event-card-cal_evt-9')).toHaveAttribute(
            'data-highlighted',
            '1',
        );
        expect(screen.getByTestId('radar-event-card-cal_evt-8')).not.toHaveAttribute(
            'data-highlighted',
        );
    });
});
