import { lazy } from 'react';

const loadAppDocumentPreviewOverlay = () =>
    import('./AppDocumentPreviewOverlay').then((m) => ({
        default: m.AppDocumentPreviewOverlay,
    }));

export const LazyAppDocumentPreviewOverlay = lazy(loadAppDocumentPreviewOverlay);

export function prefetchAppDocumentPreviewOverlay(): void {
    if (typeof window === 'undefined') return;
    void loadAppDocumentPreviewOverlay().catch(() => undefined);
}
