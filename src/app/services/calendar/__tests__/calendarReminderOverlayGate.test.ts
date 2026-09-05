import { describe, expect, it } from 'vitest';
import {
    CALENDAR_EVENT_FORM_OVERLAY_TEST_ID,
    CALENDAR_EVENT_FORM_PENDING_TEST_ID,
    CALENDAR_LIVE_RADAR_TEST_ID,
    CALENDAR_PAINT_COVER_TEST_ID,
    CALENDAR_REMINDER_OVERLAY_TEST_ID,
    isCalendarEventFormOpen,
    isCalendarInstantChromeActive,
    isCalendarLiveRadarMounted,
    isCalendarPaintCoverInteractive,
    isCalendarReminderOverlayOpen,
} from '@/app/services/calendar/calendarReminderOverlayGate';

describe('calendarReminderOverlayGate', () => {
    it('يكشف غطاء المنبّه في DOM', () => {
        expect(isCalendarReminderOverlayOpen()).toBe(false);
        const node = document.createElement('div');
        node.setAttribute('data-testid', CALENDAR_REMINDER_OVERLAY_TEST_ID);
        document.body.appendChild(node);
        expect(isCalendarReminderOverlayOpen()).toBe(true);
        node.remove();
        expect(isCalendarReminderOverlayOpen()).toBe(false);
    });

    it('يكشف الرادار الحي في DOM', () => {
        expect(isCalendarLiveRadarMounted()).toBe(false);
        const node = document.createElement('div');
        node.setAttribute('data-testid', CALENDAR_LIVE_RADAR_TEST_ID);
        document.body.appendChild(node);
        expect(isCalendarLiveRadarMounted()).toBe(true);
        node.remove();
        expect(isCalendarLiveRadarMounted()).toBe(false);
    });

    it('يكشف النموذج وغطاء الطلاء التفاعلي', () => {
        expect(isCalendarEventFormOpen()).toBe(false);
        expect(isCalendarPaintCoverInteractive()).toBe(false);

        const form = document.createElement('div');
        form.setAttribute('data-testid', CALENDAR_EVENT_FORM_OVERLAY_TEST_ID);
        document.body.appendChild(form);
        expect(isCalendarEventFormOpen()).toBe(true);
        form.remove();

        const cover = document.createElement('div');
        cover.setAttribute('data-testid', CALENDAR_PAINT_COVER_TEST_ID);
        document.body.appendChild(cover);
        expect(isCalendarPaintCoverInteractive()).toBe(true);
        cover.setAttribute('data-handoff', '1');
        expect(isCalendarPaintCoverInteractive()).toBe(false);
        cover.remove();
    });

    it('يكشف صدفة الكروم ونموذج كسول معلّق', () => {
        expect(isCalendarInstantChromeActive()).toBe(false);
        const chrome = document.createElement('div');
        chrome.setAttribute('data-schedule-instant', '1');
        document.body.appendChild(chrome);
        expect(isCalendarInstantChromeActive()).toBe(true);
        chrome.remove();

        const pending = document.createElement('div');
        pending.setAttribute('data-testid', CALENDAR_EVENT_FORM_PENDING_TEST_ID);
        document.body.appendChild(pending);
        expect(isCalendarEventFormOpen()).toBe(true);
        pending.remove();
        expect(isCalendarEventFormOpen()).toBe(false);
    });
});
