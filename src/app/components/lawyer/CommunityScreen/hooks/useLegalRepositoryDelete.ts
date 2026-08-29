import { useCallback, useState } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { RepositoryDB, type RepositoryDocument } from '@/app/services/lawyer-cloud';
import type { UseLegalRepositoryMutationsParams } from './useLegalRepositoryMutations.types';

type UseLegalRepositoryDeleteParams = Pick<
    UseLegalRepositoryMutationsParams,
    'isOwner' | 'documentsRef' | 'applyDocuments' | 'actionInflightRef'
>;

export function useLegalRepositoryDelete({
    isOwner,
    documentsRef,
    applyDocuments,
    actionInflightRef,
}: UseLegalRepositoryDeleteParams) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<RepositoryDocument | null>(null);

    const handleDeleteRequest = useCallback(
        (doc: RepositoryDocument) => {
            if (!isOwner(doc)) {
                SmartToast.warning('غير مصرح لك بحذف هذا المستند');
                return;
            }
            setDeleteTarget(doc);
        },
        [isOwner],
    );

    const cancelDeleteRequest = useCallback(() => {
        if (deletingId) return;
        setDeleteTarget(null);
    }, [deletingId]);

    const handleConfirmDelete = useCallback(async () => {
        if (!deleteTarget) return;
        if (!isOwner(deleteTarget)) {
            SmartToast.warning('غير مصرح لك بحذف هذا المستند');
            setDeleteTarget(null);
            return;
        }
        const inflightKey = `del:${deleteTarget.id}`;
        if (actionInflightRef.current.has(inflightKey)) return;
        actionInflightRef.current.add(inflightKey);

        const target = deleteTarget;
        const snapshot = documentsRef.current;
        const next = snapshot.filter((doc) => doc.id !== target.id);
        setDeleteTarget(null);
        applyDocuments(next);
        setDeletingId(target.id);
        SmartToast.success(`تم حذف "${target.title}"`);
        try {
            await RepositoryDB.deleteDocument(target.id);
        } catch {
            applyDocuments(snapshot);
            SmartToast.error('فشل حذف المستند');
        } finally {
            actionInflightRef.current.delete(inflightKey);
            setDeletingId(null);
        }
    }, [actionInflightRef, applyDocuments, deleteTarget, documentsRef, isOwner]);

    return {
        deletingId,
        deleteTarget,
        handleDeleteRequest,
        handleConfirmDelete,
        cancelDelete: cancelDeleteRequest,
    };
}
