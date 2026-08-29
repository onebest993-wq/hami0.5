export type NativeNotificationSheetRoute = 'inbox' | 'alert-controls';
export type NativeNotificationSheetTab = 'forum' | 'system';

export type NativeNotificationSheetItem = {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    tab: NativeNotificationSheetTab;
};

export type NativeChannelPrefs = {
    enabled: boolean;
    sound: boolean;
    push: boolean;
    inApp: boolean;
};

export type PresentNativeNotificationSheetOptions = {
    route?: NativeNotificationSheetRoute;
    activeTab?: NativeNotificationSheetTab;
    unreadCount: number;
    forumCount: number;
    systemCount: number;
    sessionMuted: boolean;
    notifications: NativeNotificationSheetItem[];
    channels: Record<string, NativeChannelPrefs>;
    channelLabels?: Record<string, string>;
    soundMaster: boolean;
    vibrateMaster: boolean;
};

export type NativeNotificationSheetSettingsPatch = {
    sessionMuteMinutes?: number;
    /** كتم حتى timestamp مطلق (مللي ثانية) */
    sessionMuteUntil?: number;
    sessionMuteUntilMorning?: boolean;
    sessionMuteClear?: boolean;
    soundMaster?: boolean;
    vibrateMaster?: boolean;
    channel?: string;
    sound?: boolean;
    push?: boolean;
    inApp?: boolean;
    enabled?: boolean;
};

export interface HamiNotificationSheetPlugin {
    present(options: PresentNativeNotificationSheetOptions): Promise<void>;
    dismiss(): Promise<void>;
    addListener(
        eventName: 'dismissed',
        listenerFunc: () => void,
    ): Promise<import('@capacitor/core').PluginListenerHandle>;
    addListener(
        eventName: 'notificationTapped',
        listenerFunc: (data: { id: string; type: string }) => void,
    ): Promise<import('@capacitor/core').PluginListenerHandle>;
    addListener(
        eventName: 'routeChanged',
        listenerFunc: (data: { route: NativeNotificationSheetRoute }) => void,
    ): Promise<import('@capacitor/core').PluginListenerHandle>;
    addListener(
        eventName: 'settingsPatch',
        listenerFunc: (data: NativeNotificationSheetSettingsPatch) => void,
    ): Promise<import('@capacitor/core').PluginListenerHandle>;
}
