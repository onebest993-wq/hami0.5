import { Suspense } from 'react';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import type { RepositoryUploadPayload } from '../legalRepositoryTypes';
import { ForumRepositoryModalInstantCover } from '@/app/components/lawyer/CommunityScreen/components/ForumOverlayInstantCovers';
import {
    LazyForumDeleteConfirmModal,
    LazyRepositoryPreviewModal,
    LazyUploadDocumentModal,
} from '../legalRepositoryLazyModals';

type LegalRepositoryModalsProps = {
    isUploadModalOpen: boolean;
    closeUploadModal: () => void;
    handleUploadSubmit: (data: RepositoryUploadPayload) => Promise<void>;
    editingDoc: RepositoryDocument | null;
    authorName: string;
    isSubmitting: boolean;
    previewDoc: RepositoryDocument | null;
    previewSignedUrl: string | null;
    previewLoading: boolean;
    previewMode: 'peek' | 'open';
    closePreview: () => void;
    handleDownload: (doc: RepositoryDocument) => void | Promise<void>;
    handleOpenDocument: (doc: RepositoryDocument) => void | Promise<void>;
    deleteTarget: RepositoryDocument | null;
    deletingId: string | null;
    handleConfirmDelete: () => Promise<void> | void;
    cancelDelete: () => void;
};

export function LegalRepositoryModals(props: LegalRepositoryModalsProps) {
    return (
        <>
            {props.isUploadModalOpen ? (
                <Suspense
                    fallback={
                        <ForumRepositoryModalInstantCover
                            onClose={props.closeUploadModal}
                            label="رفع مستند"
                        />
                    }
                >
                    <LazyUploadDocumentModal
                        isOpen
                        onClose={props.closeUploadModal}
                        onSubmit={props.handleUploadSubmit}
                        editDoc={props.editingDoc}
                        authorName={props.authorName}
                        isSubmitting={props.isSubmitting}
                    />
                </Suspense>
            ) : null}

            {props.previewDoc ? (
                <Suspense
                    fallback={
                        <ForumRepositoryModalInstantCover
                            onClose={props.closePreview}
                            label="معاينة المستند"
                        />
                    }
                >
                    <LazyRepositoryPreviewModal
                        doc={props.previewDoc}
                        signedUrl={props.previewSignedUrl}
                        isLoading={props.previewLoading}
                        mode={props.previewMode}
                        onClose={props.closePreview}
                        onDownload={props.handleDownload}
                        onOpen={props.handleOpenDocument}
                    />
                </Suspense>
            ) : null}

            {props.deleteTarget ? (
                <Suspense
                    fallback={
                        <ForumRepositoryModalInstantCover
                            onClose={props.cancelDelete}
                            label="حذف المستند"
                            testId="forum-delete-confirm-modal"
                        />
                    }
                >
                    <LazyForumDeleteConfirmModal
                        open
                        title="حذف المستند"
                        message={`هل تريد حذف "${props.deleteTarget.title}" من المستودع؟ لا يمكن التراجع عن هذا الإجراء.`}
                        loading={props.deletingId !== null}
                        onConfirm={() => void props.handleConfirmDelete()}
                        onCancel={props.cancelDelete}
                    />
                </Suspense>
            ) : null}
        </>
    );
}
