import { useEffect } from 'react';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { getRepositoryMediaKind } from './repositoryMedia';
import { prefetchVaultPdfJsViewer } from '@/app/components/lawyer/SmartVaultModal/VaultPdfJsViewerLazy';
import { RepositoryPreviewImage } from './RepositoryPreviewImage';
import { RepositoryPreviewDocument } from './RepositoryPreviewDocument';

export { formatRepositoryFileSize } from './repositoryPreviewFileSize';

export type RepositoryPreviewModalProps = {
    doc: RepositoryDocument;
    signedUrl: string | null;
    isLoading: boolean;
    mode: 'peek' | 'open';
    onClose: () => void;
    onDownload: (doc: RepositoryDocument) => void;
    onOpen: (doc: RepositoryDocument) => void;
};

export function RepositoryPreviewModal({
    doc,
    signedUrl,
    isLoading,
    mode,
    onClose,
    onDownload,
    onOpen,
}: RepositoryPreviewModalProps) {
    const isImage = getRepositoryMediaKind(doc.mimeType, doc.fileName) === 'image';
    const isPdf = getRepositoryMediaKind(doc.mimeType, doc.fileName) === 'pdf';
    const isOpenMode = mode === 'open';

    useEffect(() => {
        if (signedUrl && isPdf) prefetchVaultPdfJsViewer();
    }, [signedUrl, isPdf]);

    if (isImage) {
        return (
            <RepositoryPreviewImage
                title={doc.title}
                signedUrl={signedUrl}
                isLoading={isLoading}
                isOpenMode={isOpenMode}
                onClose={onClose}
            />
        );
    }

    return (
        <RepositoryPreviewDocument
            doc={doc}
            signedUrl={signedUrl}
            isLoading={isLoading}
            isOpenMode={isOpenMode}
            isPdf={isPdf}
            onClose={onClose}
            onDownload={onDownload}
            onOpen={onOpen}
        />
    );
}
