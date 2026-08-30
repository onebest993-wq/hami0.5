/** جسم الرادار الحي داخل كروم الصدفة — بلا رأس/أسبوع مكرر */
export const SCHEDULE_RADAR_LIVE_BODY_TEST_ID = 'radar-live-body';
export const SCHEDULE_RADAR_LIVE_PAINT_SETTLE_FRAMES = 2;

/** لقطة كاش التقويم لم تُزرع بعد — لا جملة فارغة ولا تسليم حي */
export function isScheduleRadarChromeSnapshotPending(): boolean {
    if (typeof document === 'undefined') return false;
    return document.querySelector('[data-schedule-snapshot="pending"]') instanceof HTMLElement;
}

/** هل رُسم جسم اليوم الحي جاهزاً لاستبدال قائمة الصدفة؟ */
export function isScheduleRadarLivePaintReady(): boolean {
    if (typeof document === 'undefined') return false;
    if (isScheduleRadarChromeSnapshotPending()) return false;
    const body = document.querySelector(`[data-testid="${SCHEDULE_RADAR_LIVE_BODY_TEST_ID}"]`);
    if (!(body instanceof HTMLElement)) return false;
    const liveCard = body.querySelector('[data-testid^="radar-event-card-"]');
    if (liveCard instanceof HTMLElement) return true;
    const chromeEvent = document.querySelector('[data-testid^="radar-open-instant-event-"]');
    if (chromeEvent instanceof HTMLElement) return false;
    /* جملة الفراغ في كروم الصدفة لا تعني أن الجسم الحي استقر */
    return body.querySelector('[data-testid="radar-empty-state"]') instanceof HTMLElement;
}
