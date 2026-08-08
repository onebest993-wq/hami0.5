/**
 * ويب فقط — بديل @capacitor/local-notifications.
 *
 * السطح يطابق ما يستدعيه HamiNotificationBridge بالضبط. لا يُنفَّذ على الويب:
 * loadNativePlugin() يعود null قبل الوصول إليه عندما لا تكون المنصّة أصلية،
 * ومسار الويب يذهب إلى PushNotificationService.
 */
export const LocalNotifications = {
    createChannel: async () => undefined,
    deleteChannel: async () => undefined,
    listChannels: async () => ({ channels: [] }),
    requestPermissions: async () => ({ display: 'denied' as const }),
    checkPermissions: async () => ({ display: 'denied' as const }),
    schedule: async () => ({ notifications: [] }),
    cancel: async () => undefined,
    getPending: async () => ({ notifications: [] as { id: number }[] }),
    addListener: async () => ({ remove: async () => undefined }),
    removeAllListeners: async () => undefined,
};
