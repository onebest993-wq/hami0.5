import { useLegalRepositoryDelete } from './useLegalRepositoryDelete';
import { useLegalRepositoryReport } from './useLegalRepositoryReport';
import { useLegalRepositoryUpload } from './useLegalRepositoryUpload';
import type { UseLegalRepositoryMutationsParams } from './useLegalRepositoryMutations.types';

export type { UseLegalRepositoryMutationsParams } from './useLegalRepositoryMutations.types';

export function useLegalRepositoryMutations(params: UseLegalRepositoryMutationsParams) {
    const upload = useLegalRepositoryUpload(params);
    const deletion = useLegalRepositoryDelete(params);
    const report = useLegalRepositoryReport({ userId: params.userId });

    return {
        deletingId: deletion.deletingId,
        isUploadModalOpen: upload.isUploadModalOpen,
        editingDoc: upload.editingDoc,
        isSubmitting: upload.isSubmitting,
        deleteTarget: deletion.deleteTarget,
        openUploadModal: upload.openUploadModal,
        closeUploadModal: upload.closeUploadModal,
        handleDeleteRequest: deletion.handleDeleteRequest,
        handleConfirmDelete: deletion.handleConfirmDelete,
        handleEditDocument: upload.handleEditDocument,
        handleReportDocument: report.handleReportDocument,
        handleUploadSubmit: upload.handleUploadSubmit,
        cancelDelete: deletion.cancelDelete,
    };
}
