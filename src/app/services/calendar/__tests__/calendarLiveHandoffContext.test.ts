import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
    CalendarLiveHandoffContext,
    useCalendarLiveHandoff,
} from '@/app/services/calendar/calendarLiveHandoffContext';
import { createElement, type ReactNode } from 'react';

describe('calendarLiveHandoffContext', () => {
    it('الافتراضي true للرادار المستقل ويُضبط من المزود', () => {
        const { result: standalone } = renderHook(() => useCalendarLiveHandoff());
        expect(standalone.current).toBe(true);

        const { result: pending } = renderHook(() => useCalendarLiveHandoff(), {
            wrapper: ({ children }: { children: ReactNode }) =>
                createElement(CalendarLiveHandoffContext.Provider, { value: false }, children),
        });
        expect(pending.current).toBe(false);
    });
});
