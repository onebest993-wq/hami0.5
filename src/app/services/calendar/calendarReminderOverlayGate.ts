export const CALENDAR_REMINDER_OVERLAY_TEST_ID = 'calendar-reminder-modal-overlay';
export const CALENDAR_LIVE_RADAR_TEST_ID = 'smart-legal-radar';
export const CALENDAR_EVENT_FORM_OVERLAY_TEST_ID = 'radar-event-form-overlay';
export const CALENDAR_EVENT_FORM_PENDING_TEST_ID = 'radar-event-form-pending';
export const CALENDAR_PAINT_COVER_TEST_ID = 'schedule-radar-paint-cover';
export const CALENDAR_INSTANT_CHROME_ATTR = 'data-schedule-instant';

export function isCalendarInstantChromeActive(): boolean {
    if (typeof document === 'undefined') return false;
    return Boolean(document.querySelector(`[${CALENDAR_INSTANT_CHROME_ATTR}="1"]`));
}

function isTestIdPresent(testId: string): boolean {
    return typeof document !== 'undefined' && Boolean(document.querySelector(`[data-testid="${testId}"]`));
}

/** المنبّه فوق النموذج/القشرة — لا يُسرق Escape من الطبقات الأدنى */
export function isCalendarReminderOverlayOpen(): boolean {
    return isTestIdPresent(CALENDAR_REMINDER_OVERLAY_TEST_ID);
}

export function isCalendarEventFormOpen(): boolean {
    return (
        isTestIdPresent(CALENDAR_EVENT_FORM_OVERLAY_TEST_ID) ||
        isTestIdPresent(CALENDAR_EVENT_FORM_PENDING_TEST_ID)
    );
}

/** غطاء الفتح ما زال السطح التفاعلي (لم يبدأ تسليم الرادار الحي) */
export function isCalendarPaintCoverInteractive(): boolean {
    if (typeof document === 'undefined') return false;
    const cover = document.querySelector(`[data-testid="${CALENDAR_PAINT_COVER_TEST_ID}"]`);
    return cover instanceof HTMLElement && cover.getAttribute('data-handoff') !== '1';
}

/** الرادار الحي مركّب (قد يكون تحت غطاء الطلاء) — يملك Escape/Cap بعد رفع الغطاء */
export function isCalendarLiveRadarMounted(): boolean {
    return isTestIdPresent(CALENDAR_LIVE_RADAR_TEST_ID);
}
