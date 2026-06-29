import { useCallback, useEffect, useRef, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartVaultDB, type SmartVaultDoc } from '@/app/services/lawyer-cloud';
import {
    resolveVaultDocUrl,
    isVaultDocImage,
    isVaultDocPdf,
} from '@/app/services/vaultUploadService';
import { revokeBlobUrlIfNeeded } from '@/app/services/vault/vaultDocUtils';
import type { DropdownAction, VaultFileViewerState } from './types';

type UseSmartVaultDocActionsParams = {
    currentUserId: string;
    docsRef: React.RefObject<SmartVaultDoc[]>;
    loadDocs: () => Promise<void>;
    addVaultCategory: (name: string) => void;
    setActiveFilter: React.Dispatch<React.SetStateAction<string>>;
    setOpenDropdownId: React.Dispatch<React.SetStateAction<string | null>>;
};

export function useSmartVaultDocActions({
    currentUserId,
    docsRef,
    loadDocs,
    addVaultCategory,
    setActiveFilter,
    setOpenDropdownId,
}: UseSmartVaultDocActionsParams) {
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [fileViewer, setFileViewer] = useState<VaultFileViewerState>(null);
    const [editDoc, setEditDoc] = useState<SmartVaultDoc | null>(null);
    const [viewingDocId, setViewingDocId] = useState<string | null>(null);
    const fileViewerUrlRef = useRef<string | null>(null);
    fileViewerUrlRef.current = fileViewer?.url ?? null;

    useEffect(
        () => () => {
            revokeBlobUrlIfNeeded(fileViewerUrlRef.current);
        },
        [],
    );

    const handleDelete = useCallback(
        async (doc: SmartVaultDoc) => {
            if (!currentUserId) {
                SmartToast.error('يرجى تسجيل الدخول أولاً');
                return;
            }
            if (doc.authorId && doc.authorId !== currentUserId) {
                SmartToast.error('ليس لديك صلاحية لحذف هذا الملف');
                return;
            }
            try {
                await SmartVaultDB.deleteDoc(doc.id, doc.authorId || currentUserId);
                SmartToast.success('تم حذف الملف بنجاح');
                await loadDocs();
            } catch {
                SmartToast.error('فشل حذف الملف');
            }
        },
        [currentUserId, loadDocs],
    );

    const handleEdit = useCallback(
        (doc: SmartVaultDoc) => {
            if (!currentUserId) {
                SmartToast.error('يرجى تسجيل الدخول أولاً');
                return;
            }
            if (doc.authorId && doc.authorId !== currentUserId) {
                SmartToast.error('ليس لديك صلاحية لتعديل هذا الملف');
                return;
            }
            setOpenDropdownId(null);
            setEditDoc(doc);
        },
        [currentUserId, setOpenDropdownId],
    );

    const closeEditDoc = useCallback(() => setEditDoc(null), []);

    const saveDocEdit = useCallback(
        async (values: { title: string; lawyerNote: string; classification: string }) => {
            if (!editDoc || !currentUserId) return;
            setIsSavingEdit(true);
            const classification = values.classification.trim();
            try {
                const updated: SmartVaultDoc = {
                    ...editDoc,
                    title: values.title,
                    lawyerNote: values.lawyerNote || null,
                    customCategory: classification || null,
                    tags: classification ? [classification] : [],
                    updatedAt: new Date().toISOString(),
                };
                await SmartVaultDB.updateDoc(updated, currentUserId);
                if (classification) {
                    addVaultCategory(classification);
                    setActiveFilter(classification);
                }
                SmartToast.success('تم تحديث الملف بنجاح');
                setEditDoc(null);
                await loadDocs();
            } catch {
                SmartToast.error('فشل تحديث الملف');
            } finally {
                setIsSavingEdit(false);
            }
        },
        [addVaultCategory, currentUserId, editDoc, loadDocs, setActiveFilter],
    );

    const handleViewFile = useCallback(async (doc: SmartVaultDoc) => {
        setViewingDocId(doc.id);
        try {
            const fresh = docsRef.current?.find((d) => d.id === doc.id) ?? doc;
            const url = await resolveVaultDocUrl(fresh);
            if (!url) {
                SmartToast.error('تعذر فتح الملف — قد تحتاج إعادة رفعه');
                return;
            }
            if (isVaultDocImage(fresh)) {
                setFileViewer({ doc: fresh, url, kind: 'image' });
                return;
            }
            if (isVaultDocPdf(fresh)) {
                setFileViewer({ doc: fresh, url, kind: 'pdf' });
                return;
            }
            window.open(url, '_blank');
        } catch {
            SmartToast.error('تعذر فتح الملف');
        } finally {
            setViewingDocId(null);
        }
    }, [docsRef]);

    const closeFileViewer = useCallback(() => {
        setFileViewer((prev) => {
            revokeBlobUrlIfNeeded(prev?.url);
            return null;
        });
    }, []);

    const handleDropdownAction = useCallback(
        async (doc: SmartVaultDoc, action: DropdownAction) => {
            setOpenDropdownId(null);
            if (action === 'edit') handleEdit(doc);
            else if (action === 'delete') {
                const ok = await SmartDialog.confirm(`هل أنت متأكد من حذف "${doc.title}"؟`);
                if (ok) void handleDelete(doc);
            }
        },
        [handleDelete, handleEdit, setOpenDropdownId],
    );

    return {
        isSavingEdit,
        fileViewer,
        editDoc,
        viewingDocId,
        handleDelete,
        handleEdit,
        closeEditDoc,
        saveDocEdit,
        handleViewFile,
        closeFileViewer,
        handleDropdownAction,
    };
}
