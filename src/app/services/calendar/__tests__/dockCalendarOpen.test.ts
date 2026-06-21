import { describe, expect, it, vi } from 'vitest';
import {
    CALENDAR_DOCK_FEATURE,
    openCalendarFromDock,
    shouldShowCalendarDockBadge,
} from '@/app/services/calendar/dockCalendarOpen';

describe('dockCalendarOpen', () => {
    it('exports Arabic feature label', () => {
        expect(CALENDAR_DOCK_FEATURE).toBe('التقويم');
    });

    it('opens calendar when signed in', () => {
        const onOpenCalendar = vi.fn();
        expect(openCalendarFromDock({ signedIn: true, onOpenCalendar })).toBe(true);
        expect(onOpenCalendar).toHaveBeenCalledTimes(1);
    });

    it('blocks calendar when signed out', () => {
        const onOpenCalendar = vi.fn();
        const onSignedOut = vi.fn();
        expect(
            openCalendarFromDock({ signedIn: false, onOpenCalendar, onSignedOut }),
        ).toBe(false);
        expect(onOpenCalendar).not.toHaveBeenCalled();
        expect(onSignedOut).toHaveBeenCalledTimes(1);
    });

    it('shows badge for urgent alerts without hijacking click', () => {
        expect(shouldShowCalendarDockBadge(0)).toBe(false);
        expect(shouldShowCalendarDockBadge(3)).toBe(true);
    });
});
