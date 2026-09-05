import React from 'react';
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import {
    PreloadableOverlayGate,
    type PreloadableLike,
} from '@/app/utils/lazy/preloadableOverlayGate';
import { FocModalPortal } from './components/FocModalPortal';

export { focPointerPrefetch, focPrepareOverlay } from './focPointerPrefetch';

export const LazyFocDisburseModal = createPreloadableLazyComponent(() =>
    import('./components/FocDisburseModal').then((m) => ({ default: m.FocDisburseModal })),
);
export const LazyFocGhuramaaModal = createPreloadableLazyComponent(() =>
    import('./components/FocGhuramaaModal').then((m) => ({ default: m.FocGhuramaaModal })),
);
export const LazyDebtTotalsEditModal = createPreloadableLazyComponent(() =>
    import('./components/DebtTotalsEditModal').then((m) => ({ default: m.DebtTotalsEditModal })),
);
export const LazyFocFeesSheet = createPreloadableLazyComponent(() =>
    import('./components/FocFeesSheet').then((m) => ({ default: m.FocFeesSheet })),
);
export const LazyFocExpenseSheet = createPreloadableLazyComponent(() =>
    import('./components/FocExpenseSheet').then((m) => ({ default: m.FocExpenseSheet })),
);
export const LazyFocGarnishModal = createPreloadableLazyComponent(() =>
    import('./components/FocGarnishModal').then((m) => ({ default: m.FocGarnishModal })),
);
export const LazyFocAlimonyDetailOverlay = createPreloadableLazyComponent(() =>
    import('./components/FocAlimonyDetailOverlay').then((m) => ({ default: m.FocAlimonyDetailOverlay })),
);

export function prefetchFocDisburseModal(): void {
    void LazyFocDisburseModal.preload();
}
export function prefetchFocGhuramaaModal(): void {
    void LazyFocGhuramaaModal.preload();
}
export function prefetchFocDebtTotalsEditModal(): void {
    void LazyDebtTotalsEditModal.preload();
}
export function prefetchFocFeesSheet(): void {
    void LazyFocFeesSheet.preload();
}
export function prefetchFocExpenseSheet(): void {
    void LazyFocExpenseSheet.preload();
}
export function prefetchFocGarnishModal(): void {
    void LazyFocGarnishModal.preload();
}
export function prefetchFocAlimonyDetailOverlay(): void {
    void LazyFocAlimonyDetailOverlay.preload();
}

export function FocOverlaySilentFallback({
    backdropClassName = 'bg-black/55',
}: {
    backdropClassName?: string;
}): React.ReactElement {
    return (
        <FocModalPortal open backdropClassName={backdropClassName}>
            <div className="min-h-[44px] w-full max-w-sm" aria-hidden />
        </FocModalPortal>
    );
}

export function FocLazyOverlay<P extends object>({
    lazy,
    lazyProps,
    fallback,
}: {
    lazy: PreloadableLike<P>;
    lazyProps: P;
    fallback?: React.ReactNode;
}): React.ReactElement {
    return (
        <PreloadableOverlayGate
            lazy={lazy}
            lazyProps={lazyProps}
            fallback={fallback === undefined ? <FocOverlaySilentFallback /> : fallback}
        />
    );
}
