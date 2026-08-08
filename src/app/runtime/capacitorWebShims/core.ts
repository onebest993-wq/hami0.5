/** ويب فقط — بديل خفيف لـ @capacitor/core في بناء الإنتاج (VITE_BUILD_NATIVE≠true). */
export type PluginListenerHandle = {
    remove: () => Promise<void>;
};

export const Capacitor = {
    isNativePlatform: () => false,
    getPlatform: () => 'web' as const,
    isPluginAvailable: (_name: string) => false,
};
