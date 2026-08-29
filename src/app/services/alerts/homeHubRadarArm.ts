/**
 * تسليح رادار البطاقة — قرار نقي بلا I/O.
 * كاش null = لم يُؤكَّد هذا الجلسة → يجب الاكتشاف (موعد قضائي لا يُؤجَّل).
 * كاش [] = فراغ مؤكَّد هذا الجلسة → لا CalendarDB حتى يتغيّر المصدر.
 * deferForInFlightWarm: تسخين جارٍ — ننتظر نتيجته بدل جلب ثانٍ.
 */

export const HOME_HUB_RADAR_WARM_WAIT_MS = 2_000;

export function shouldArmHomeHubLiveRadar(input: {
    alertsPanelActive: boolean;
    secretaryAlertCount: number;
    radarCache: readonly unknown[] | null;
    deferForInFlightWarm?: boolean;
}): boolean {
    if (!input.alertsPanelActive) return false;
    if (input.secretaryAlertCount > 0) return true;
    if (input.radarCache === null && input.deferForInFlightWarm) return false;
    if (input.radarCache === null) return true;
    return input.radarCache.length > 0;
}

/** قفل أحادي الاتجاه: بعد أول تسليح على تبويب التنبيهات لا يُفصل أثناء الجلسة. */
export function resolveHomeHubLiveRadarEnabled(input: {
    alertsPanelActive: boolean;
    secretaryAlertCount: number;
    radarCache: readonly unknown[] | null;
    latched: boolean;
    deferForInFlightWarm?: boolean;
}): { enabled: boolean; latch: boolean } {
    const want = shouldArmHomeHubLiveRadar({
        alertsPanelActive: input.alertsPanelActive,
        secretaryAlertCount: input.secretaryAlertCount,
        radarCache: input.radarCache,
        deferForInFlightWarm: input.deferForInFlightWarm,
    });
    const latch = input.latched || want;
    return {
        enabled: input.alertsPanelActive && latch,
        latch,
    };
}
