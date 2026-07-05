import React from 'react';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { VaultDocViewerKind } from '@/app/services/vaultUploadService';
import { VaultDocViewer } from '@/app/components/lawyer/SmartVaultModal/VaultDocViewer';

type AppDocumentPreviewOverlayProps = {
    isOpen: boolean;
    title: string;
    fileUrl: string | null;
    kind: Extract<VaultDocViewerKind, 'image' | 'pdf'>;
    onClose: () => void;
    fileBlob?: Blob | null;
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
    lawyerNote?: string | null;
    createdAt?: string;
    updatedAt?: string;
    authorId?: string;
    storagePath?: string;
    docId?: string;
    overlayScope?: 'panel' | 'viewport';
};

function buildPreviewDoc({
    title,
    kind,
    fileUrl,
    fileName,
    mimeType,
    fileSize,
    lawyerNote,
    createdAt,
    updatedAt,
    authorId,
    storagePath,
    docId,
}: Omit<AppDocumentPreviewOverlayProps, 'isOpen' | 'onClose' | 'fileBlob' | 'overlayScope'>): SmartVaultDoc {
    const nowIso = new Date().toISOString();
    return {
        id: docId ?? `preview:${fileName ?? title}`,
        title,
        type: kind,
        tags: [],
        authorId: authorId ?? 'preview',
        createdAt: createdAt ?? nowIso,
        updatedAt: updatedAt ?? createdAt ?? nowIso,
        fileSize: typeof fileSize === 'number' ? fileSize : 0,
        fileName: fileName ?? title,
        mimeType: mimeType ?? (kind === 'pdf' ? 'application/pdf' : 'image/*'),
        storagePath: storagePath ?? '',
        signedUrl: fileUrl,
        lawyerNote: lawyerNote ?? null,
        customCategory: null,
    };
}

export function AppDocumentPreviewOverlay({
    isOpen,
    title,
    fileUrl,
    kind,
    onClose,
    fileBlob,
    fileName,
    mimeType,
    fileSize,
    lawyerNote,
    createdAt,
    updatedAt,
    authorId,
    storagePath,
    docId,
    overlayScope = 'viewport',
}: AppDocumentPreviewOverlayProps) {
    if (!isOpen || !fileUrl) return null;

    const doc = buildPreviewDoc({
        title,
        kind,
        fileUrl,
        fileName,
        mimeType,
        fileSize,
        lawyerNote,
        createdAt,
        updatedAt,
        authorId,
        storagePath,
        docId,
    });

    return (
        <VaultDocViewer
            doc={doc}
            fileUrl={fileUrl}
            fileBlob={fileBlob}
            kind={kind}
            onClose={onClose}
            overlayScope={overlayScope}
        />
    );
}
