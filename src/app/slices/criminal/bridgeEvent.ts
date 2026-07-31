/**
 * ثابت/طلب تفعيل جسر الجزائي — بلا سحب بوابة المخزن أو الـ Provider.
 * يُستورد من مسارات الفتح الحرجة (sync) حتى لا يتأخر ظهور البطاقات خلف dynamic import.
 */

export const CRIMINAL_DASHBOARD_BRIDGE_ACTIVATE_EVENT = 'hami:criminal-dashboard-bridge-activate';

let activateRequested = false;

/** هل طُلب تفعيل الجسر قبل تركيب المستمع؟ (يمنع ضياع الحدث) */
export function consumeCriminalDashboardBridgeActivateRequest(): boolean {
    const pending = activateRequested;
    activateRequested = false;
    return pending;
}

/**
 * تفعيل فوري لقائمة الأضابير الجزائية:
 * - يضع علماً معلّقاً إن لم يُركَّب المستمع بعد
 * - يطلق الحدث للـ Provider
 * - يبدأ تنزيل chunk الـ store بالتوازي
 */
export function requestCriminalDashboardBridgeActivate(): void {
    activateRequested = true;
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(CRIMINAL_DASHBOARD_BRIDGE_ACTIVATE_EVENT));
    void import('@/app/components/lawyer/criminal-system/criminalStore').catch(() => undefined);
}
