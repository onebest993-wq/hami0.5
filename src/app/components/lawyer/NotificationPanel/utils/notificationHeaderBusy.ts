/**
 * ┘à╪ج╪┤╪▒ ╪د┘╪د┘╪┤╪║╪د┘ ┘┘è ╪▒╪ث╪│ ╪د┘╪ح╪┤╪╣╪د╪▒╪د╪ز ظ¤ ┘è╪╕┘ç╪▒ ┘┘é╪╖ ╪╣┘╪» ╪د┘╪ز╪ص┘à┘è┘ ╪د┘╪ث┘ê┘ ╪ذ╪»┘ê┘ ╪ذ┘è╪د┘╪د╪ز ┘à╪«╪▓┘ّ┘╪ر.
 * ╪د┘╪ز╪ص╪»┘è╪س ╪د┘╪«┘┘┘è (polling) ┘╪د ┘è┘╪╕┘ç╪▒ spinner ┘┘è ╪د┘╪▒╪ث╪│.
 */
export function isNotificationHeaderBusy(
    isLoading: boolean,
    hasCachedNotifications: boolean,
): boolean {
    return isLoading && !hasCachedNotifications;
}

export function isNotificationPanelColdLoading(
    isLoading: boolean,
    visibleCount: number,
    hasCaseShareContent: boolean,
): boolean {
    return isLoading && visibleCount === 0 && !hasCaseShareContent;
}
