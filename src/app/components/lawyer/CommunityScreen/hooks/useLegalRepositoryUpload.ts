import { useCallback } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import type { RepositoryUploadPayload } from '../legalRepositoryTypes';
import type { UseLegalRepositoryMutationsParams } from './useLegalRepositoryMutations.types';
import { useLegalRepositoryUploadModal } from './useLegalRepositoryUploadModal';
import { runLegalRepositoryUploadSubmit } from './runLegalRepositoryUploadSubmit';

type UseLegalRepositoryUploadParams = Pick<
    UseLegalRepositoryMutationsParams,
    'user' | 'authorName' | 'isOwner' | 'documentsRef' | 'applyDocuments' | 'actionInflightRef'
>;

export function useLegalRepositoryUpload({
    user,
    authorName,
    isOwner,
    documentsRef,
    applyDocuments,
    actionInflightRef,
}: UseLegalRepositoryUploadParams) {
    const modal = useLegalRepositoryUploadModal({ isOwner });
    const {
        isUploadModalOpen,
        editingDoc,
        isSubmitting,
        setIsSubmitting,
        openUploadModal,
        closeUploadModal,
        handleEditDocument,
    } = modal;

    const handleUploadSubmit = useCallback(
        async (data: RepositoryUploadPayload) => {
            await runLegalRepositoryUploadSubmit({
                user,
                authorName,
                documentsRef,
                applyDocuments,
                actionInflightRef,
                editingDoc,
                data,
                setIsSubmitting,
                closeUploadModal,
            });
        },
        [
            actionInflightRef,
            applyDocuments,
            authorName,
            closeUploadModal,
            documentsRef,
            editingDoc,
            setIsSubmitting,
            user,
        ],
    );

    return {
        isUploadModalOpen,
        editingDoc,
        isSubmitting,
        openUploadModal,
        closeUploadModal,
        handleEditDocument,
        handleUploadSubmit,
    };
}
