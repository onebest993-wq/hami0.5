import { lazy, Suspense } from 'react';
import type { VaultPdfViewerSurfaceProps } from './VaultPdfViewerSurface';

type VaultPdfViewerSurfaceModule = typeof import('./VaultPdfViewerSurface');

const vaultPdfViewerSurfaceImport = (): Promise<VaultPdfViewerSurfaceModule> =>
    import('./VaultPdfViewerSurface');

const LazyVaultPdfViewerSurface = lazy(() =>
    vaultPdfViewerSurfaceImport().then((m) => ({
        default: m.VaultPdfViewerSurface,
    })),
);

function VaultPdfViewerSurfaceFallback({ className }: { className?: string }) {
    return (
        <div className={className ?? 'flex h-full items-center justify-center text-sm text-white/45'}>
            جاري تحميل عارض PDF...
        </div>
    );
}

export function prefetchVaultPdfViewerSurface(): void {
    void vaultPdfViewerSurfaceImport().catch(() => undefined);
}

export function VaultPdfViewerSurfaceLazy(props: VaultPdfViewerSurfaceProps) {
    return (
        <Suspense fallback={<VaultPdfViewerSurfaceFallback className={props.fallbackClassName} />}>
            <LazyVaultPdfViewerSurface {...props} />
        </Suspense>
    );
}
