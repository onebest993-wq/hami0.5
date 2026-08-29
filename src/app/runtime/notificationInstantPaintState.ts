let forceVisible = false;

export function isNotificationForceVisible(): boolean {
    return forceVisible;
}

export function setNotificationForceVisible(visible: boolean): void {
    forceVisible = visible;
}

export function clearNotificationForceVisible(): void {
    forceVisible = false;
}
