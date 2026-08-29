import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { HiddenFollowupRequestOptionsProps } from './components/HiddenFollowupRequestOptions';
import type { RequestsTabDecisionLogProps } from './components/RequestsTabDecisionLog';

export const LazyHiddenFollowupRequestOptions =
    createPreloadableLazyComponent<HiddenFollowupRequestOptionsProps>(() =>
        import('./components/HiddenFollowupRequestOptions').then((m) => ({
            default: m.HiddenFollowupRequestOptions,
        })),
    );

export const LazyRequestsTabDecisionLog = createPreloadableLazyComponent<RequestsTabDecisionLogProps>(
    () =>
        import('./components/RequestsTabDecisionLog').then((m) => ({
            default: m.RequestsTabDecisionLog,
        })),
);

/** سجل الطلبات يظهر دائماً داخل التبويب — يُسخَّن مع التبويب لا بعده. */
export function prefetchRequestsTabInnerSurfaces(): void {
    void LazyRequestsTabDecisionLog.preload();
}

export function prefetchHiddenFollowupRequestOptions(): void {
    void LazyHiddenFollowupRequestOptions.preload();
}
