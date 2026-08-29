/** إطارات تأكيد بعد وجود الكروم الحي — يمنح CSS مقطع Host وقت الحقن قبل رفع الغطاء */
export const SCHEDULE_RADAR_LIVE_PAINT_SETTLE_FRAMES = 2;

function isLiveRadarRoot(radar: Element): radar is HTMLElement {
    if (!(radar instanceof HTMLElement)) return false;
    if (radar.closest('[data-testid="schedule-tab-loading"]')) return false;
    if (radar.closest('[data-testid="schedule-radar-paint-cover"]')) return false;
    return true;
}

/** هل رُسم الرادار الحي (لا قشرة الطلاء) بشريط أسبوع ورأس جاهزين؟ */
export function isScheduleRadarLivePaintReady(): boolean {
    if (typeof document === 'undefined') return false;
    const radar = document.querySelector('[data-testid="smart-legal-radar"]');
    if (!radar || !isLiveRadarRoot(radar)) return false;

    const week = radar.querySelector('[data-testid="radar-week-strip"]');
    if (!(week instanceof HTMLElement)) return false;

    const back = radar.querySelector('[data-testid="radar-back"]');
    if (!(back instanceof HTMLElement) || !back.querySelector('svg')) return false;

    const month = radar.querySelector('[data-testid="radar-month-label"]');
    if (!(month instanceof HTMLElement) || !month.textContent?.trim()) return false;

    return true;
}
