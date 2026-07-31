import { VaultPdfJsViewerLazy } from '@/app/components/lawyer/SmartVaultModal/VaultPdfJsViewerLazy';

export type VaultPdfViewerSurfaceProps = {
    source: string | Blob;
    title: string;
    openUrl?: string;
    fallbackClassName?: string;
};

export function VaultPdfViewerSurface({
    source,
    title,
    openUrl,
    fallbackClassName,
}: VaultPdfViewerSurfaceProps) {
    return (
        <VaultPdfJsViewerLazy
            source={source}
            title={title}
            openUrl={openUrl}
            fallbackClassName={fallbackClassName}
        />
    );
}
