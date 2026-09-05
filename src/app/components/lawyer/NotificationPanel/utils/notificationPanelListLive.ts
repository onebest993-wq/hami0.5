export function isNotificationPanelListLive(isOpen: boolean, snapPresent: boolean): boolean {
    return isOpen || snapPresent;
}
