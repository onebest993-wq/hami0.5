let panelModuleResolved = false;

export function isNotificationPanelModuleResolved(): boolean {
    return panelModuleResolved;
}

export function markNotificationPanelModuleResolved(): void {
    panelModuleResolved = true;
}

export function resetNotificationPanelModuleStateForTests(): void {
    panelModuleResolved = false;
}
