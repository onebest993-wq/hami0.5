/** مسار داخل ورقة الإشعارات — ورقة واحدة، scrim واحد، بدون bottom sheets متداخلة. */
export type NotificationPanelRoute = 'inbox' | 'alert-controls';

export function isNotificationInboxRoute(route: NotificationPanelRoute): route is 'inbox' {
    return route === 'inbox';
}
