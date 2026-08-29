/** فتح تنبيهات/تثبيت الدوك — منطق موحّد قابل للاختبار */
export const ALERTS_DOCK_FEATURE = 'البطاقة';

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

let pendingAlertsDockOpen = false;

/** لمسة هيكل الهاب قبل جاهزية الورقة — تُستهلك عند تركيب الدوك */
export function armPendingAlertsDockOpen(): void {
    pendingAlertsDockOpen = true;
}

export function consumePendingAlertsDockOpen(): boolean {
    const pending = pendingAlertsDockOpen;
    pendingAlertsDockOpen = false;
    return pending;
}

export function resetPendingAlertsDockOpenForTests(): void {
    pendingAlertsDockOpen = false;
}
