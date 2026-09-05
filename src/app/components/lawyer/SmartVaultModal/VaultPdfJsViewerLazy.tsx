import React, { lazy, Suspense } from 'react';
import type { VaultPdfSource } from '@/app/services/vault/vaultPdfDocument';

type VaultPdfJsViewerModule = typeof import('@/app/components/lawyer/SmartVaultModal/VaultPdfJsViewer');

const vaultPdfJsViewerImport = (): Promise<VaultPdfJsViewerModule> =>
    import('@/app/components/lawyer/SmartVaultModal/VaultPdfJsViewer');

const LazyVaultPdfJsViewer = lazy(() =>
    vaultPdfJsViewerImport().then((m) => ({
        default: m.VaultPdfJsViewer,
    })),
);

type VaultPdfJsViewerLazyProps = {
    source: VaultPdfSource;
    title: string;
    openUrl?: string;
    fallbackClassName?: string;
};

function VaultPdfJsViewerFallback({ className }: { className?: string }) {
    return (
        <div
            className={className ?? 'flex h-full items-center justify-center'}
            aria-busy="true"
            aria-label="PDF"
        >
            <div className="h-10 w-48 rounded-xl border border-white/10 bg-white/[0.04]" aria-hidden />
        </div>
    );
}

export function prefetchVaultPdfJsViewer(): void {
    void vaultPdfJsViewerImport().catch(() => undefined);
}

export function VaultPdfJsViewerLazy({
    source,
    title,
    openUrl,
    fallbackClassName,
}: VaultPdfJsViewerLazyProps) {
    return (
        <Suspense fallback={<VaultPdfJsViewerFallback className={fallbackClassName} />}>
            <LazyVaultPdfJsViewer source={source} title={title} openUrl={openUrl} />
        </Suspense>
    );
}
