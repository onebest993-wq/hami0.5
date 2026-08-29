import { useCallback, useState } from 'react';
import { flushSync } from 'react-dom';

import { SmartToast } from '@/app/components/ui/SmartToast';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import type { UseLegalRepositoryMutationsParams } from './useLegalRepositoryMutations.types';

type UseLegalRepositoryUploadModalParams = Pick<UseLegalRepositoryMutationsParams, 'isOwner'>;

export function useLegalRepositoryUploadModal({ isOwner }: UseLegalRepositoryUploadModalParams) {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState<RepositoryDocument | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleEditDocument = useCallback(
        (doc: RepositoryDocument) => {
            if (!isOwner(doc)) {
                SmartToast.warning('غير مصرح لك بتعديل هذا المستند');
                return;
            }
            flushSync(() => {
                setEditingDoc(doc);
                setIsUploadModalOpen(true);
            });
        },
        [isOwner],
    );

    const openUploadModal = useCallback(() => {
        flushSync(() => {
            setEditingDoc(null);
            setIsUploadModalOpen(true);
        });
    }, []);

    const closeUploadModal = useCallback(
        (options?: { force?: boolean }) => {
            if (!options?.force && isSubmitting) return;
            setIsUploadModalOpen(false);
            setEditingDoc(null);
        },
        [isSubmitting],
    );

    return {
        isUploadModalOpen,
        editingDoc,
        isSubmitting,
        setIsSubmitting,
        openUploadModal,
        closeUploadModal,
        handleEditDocument,
    };
}
