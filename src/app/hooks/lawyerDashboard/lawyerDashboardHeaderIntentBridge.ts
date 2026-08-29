/**
 * جسر نوايا هيدر اللوحة — HomeFirstPaint قد يُعرض فوق FullBoot بأزرار فارغة.
 * النقر يُصفّ أو يُنفَّذ فوراً عند تسجيل المعالج من HomeFirstPaint/MainView.
 */
export type LawyerDashboardHeaderIntent =
    | 'notifications'
    | 'search'
    | 'settings'
    | 'profile'
    | 'alerts';

type HeaderIntentHandler = (intent: LawyerDashboardHeaderIntent) => void;

let pendingIntent: LawyerDashboardHeaderIntent | null = null;
let handler: HeaderIntentHandler | null = null;

export function requestLawyerDashboardHeaderIntent(intent: LawyerDashboardHeaderIntent): void {
    if (handler) {
        handler(intent);
        return;
    }
    pendingIntent = intent;
}

export function registerLawyerDashboardHeaderIntentHandler(
    next: HeaderIntentHandler,
): () => void {
    handler = next;
    if (pendingIntent) {
        const intent = pendingIntent;
        pendingIntent = null;
        next(intent);
    }
    return () => {
        if (handler === next) handler = null;
    };
}

/** يُصفّر نية هيدر معلّقة من FirstPaint عند إقلاع جديد */
export function discardPendingLawyerDashboardHeaderIntent(): void {
    pendingIntent = null;
}

/** للاختبارات فقط */
export function resetLawyerDashboardHeaderIntentBridgeForTests(): void {
    pendingIntent = null;
    handler = null;
}
