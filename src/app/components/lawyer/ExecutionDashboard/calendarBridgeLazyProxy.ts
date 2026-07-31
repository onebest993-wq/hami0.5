/**
 * غلاف كسول لـ CalendarBridge — لا يسحب syncEngine/cloud عند تحميل نطاق ED الثابت.
 */
type CalendarBridgeApi = typeof import('@/app/services/calendar/bridge').CalendarBridge;

function loadCalendarBridge(): Promise<CalendarBridgeApi> {
    return import('@/app/services/calendar/bridge').then((m) => m.CalendarBridge);
}

export const CalendarBridge: CalendarBridgeApi = new Proxy({} as CalendarBridgeApi, {
    get(_target, prop: string | symbol) {
        return (...args: unknown[]) => {
            void loadCalendarBridge().then((api) => {
                const fn = (api as Record<string | symbol, unknown>)[prop];
                if (typeof fn === 'function') {
                    (fn as (...a: unknown[]) => unknown).apply(api, args);
                }
            });
        };
    },
});
