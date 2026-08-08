/** فتح تنبيهات/تثبيت الدوك — منطق موحّد قابل للاختبار */
export const ALERTS_DOCK_FEATURE = 'البطاقة الذكية';

export type AlertsDockSheetMode = 'alerts' | 'pins';

export type DockAlertsOpenInput = {
    signedIn: boolean;
    pinnedCount: number;
    urgentAlertsCount: number;
    onOpen: (mode: AlertsDockSheetMode) => void;
    onSignedOut?: () => void;
};

export function resolveAlertsDockSheetMode(
    pinnedCount: number,
    urgentAlertsCount: number,
): AlertsDockSheetMode {
    return pinnedCount > 0 && urgentAlertsCount === 0 ? 'pins' : 'alerts';
}

export function openAlertsDockFromShell(input: DockAlertsOpenInput): boolean {
    if (!input.signedIn) {
        input.onSignedOut?.();
        return false;
    }
    input.onOpen(resolveAlertsDockSheetMode(input.pinnedCount, input.urgentAlertsCount));
    return true;
}

export function shouldShowAlertsDockBadge(pinnedCount: number, urgentAlertsCount: number): boolean {
    return urgentAlertsCount > 0 || pinnedCount > 0;
}
