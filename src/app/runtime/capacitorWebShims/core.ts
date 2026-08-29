/** ويب فقط — بديل خفيف لـ @capacitor/core في بناء الإنتاج (VITE_BUILD_NATIVE≠true). */
export type PluginListenerHandle = {
    remove: () => Promise<void>;
};

export const Capacitor = {
    isNativePlatform: () => false,
    getPlatform: () => 'web' as const,
    isPluginAvailable: (_name: string) => false,
};

/**
 * كل حزمة @capacitor/* تستورد registerPlugin من النواة. غيابه من هذا البديل
 * أسقط بناء الويب بالكامل لحظة إضافة @capacitor/local-notifications: rollup
 * حزَم الحزمة الحقيقية ثم لم يجد التصدير. البديل العام يمنع تكرار ذلك مع أي
 * إضافة تُضاف مستقبلاً قبل أن يُسجَّل لها alias.
 *
 * لا يُنفَّذ فعلياً على الويب: كل نداء أصلي محروس بـisCapacitorNativePlatform().
 */
export function registerPlugin<T = Record<string, unknown>>(_name: string, _impls?: unknown): T {
    const handle: PluginListenerHandle = { remove: async () => undefined };
    const target: Record<string, unknown> = {};
    return new Proxy(target, {
        get(_obj, prop) {
            if (prop === 'addListener') return async () => handle;
            if (prop === 'removeAllListeners') return async () => undefined;
            if (typeof prop === 'symbol') return undefined;
            return async () => undefined;
        },
    }) as T;
}

export const WebPlugin = class {
    async addListener(): Promise<PluginListenerHandle> {
        return { remove: async () => undefined };
    }
    async removeAllListeners(): Promise<void> {
        return undefined;
    }
};

export const Plugins: Record<string, unknown> = {};

/**
 * أشرطة النظام — انتقلت في Capacitor 8 من حزمة @capacitor/status-bar إلى النواة.
 * على الويب لا شريط نظام يُلوَّن، فالتصديرات موجودة للبناء فقط ولا تفعل شيئاً.
 */
export enum SystemBarsStyle {
    Dark = 'DARK',
    Light = 'LIGHT',
    Default = 'DEFAULT',
}

export enum SystemBarType {
    StatusBar = 'STATUS_BAR',
    NavigationBar = 'NAVIGATION_BAR',
    All = 'ALL',
}

export const SystemBars = {
    setStyle: async () => undefined,
    setAnimation: async () => undefined,
    show: async () => undefined,
    hide: async () => undefined,
};
