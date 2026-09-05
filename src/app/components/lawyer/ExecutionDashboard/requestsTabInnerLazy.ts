import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { HiddenFollowupRequestOptionsProps } from './components/HiddenFollowupRequestOptions';

export const LazyHiddenFollowupRequestOptions =
    createPreloadableLazyComponent<HiddenFollowupRequestOptionsProps>(() =>
        import('./components/HiddenFollowupRequestOptions').then((m) => ({
            default: m.HiddenFollowupRequestOptions,
        })),
    );

export function prefetchHiddenFollowupRequestOptions(): void {
    void LazyHiddenFollowupRequestOptions.preload();
}
