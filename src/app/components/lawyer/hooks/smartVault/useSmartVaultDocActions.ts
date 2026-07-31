import { useCallback, useEffect, useRef, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { confirmRepositoryAction } from '@/app/components/lawyer/SmartRepository/repositoryDialog';
import { SmartVaultDB } from '@/app/services/vault/smartVaultRuntime';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { resolveVaultDocForViewing } from '@/app/services/vaultUploadService';
import { revokeBlobUrlIfNeeded } from '@/app/services/vault/vaultDocUtils';
import { prefetchVaultBlobStore } from '@/app/services/vaultBlobStore';
import type { DropdownAction, VaultFileViewerState } from './types';

type UseSmartVaultDocActionsParams = {
    currentUserId: string;
    docsRef: React.RefObject<SmartVaultDoc[]>;
    loadDocs: () => Promise<void>;
    removeDocFromState: (docId: string) => void;
    addVaultCategory: (name: string) => void;
    setActiveFilter: React.Dispatch<React.SetStateAction<string>>;
    setOpenDropdownId: React.Dispatch<React.SetStateAction<string | null>>;
};

export function useSmartVaultDocActions({
    currentUserId,
    docsRef,
    loadDocs,
    removeDocFromState,
    addVaultCategory,
    setActiveFilter,
    setOpenDropdownId,
}: UseSmartVaultDocActionsParams) {
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [fileViewer, setFileViewer] = useState<VaultFileViewerState>(null);
    const [editDoc, setEditDoc] = useState<SmartVaultDoc | null>(null);
    const [viewingDocId, setViewingDocId] = useState<string | null>(null);
    const fileViewerUrlRef = useRef<string | null>(null);
    const fileViewerRevokeRef = useRef(false);
    const fileViewerRef = useRef(fileViewer);
    fileViewerUrlRef.current = fileViewer?.url ?? null;
    fileViewerRevokeRef.current = fileViewer?.revokeOnClose ?? false;
    fileViewerRef.current = fileViewer;

    useEffect(
        () => () => {
            if (fileViewerRevokeRef.current) revokeBlobUrlIfNeeded(fileViewerUrlRef.current);
        },
        [],
    );

    useEffect(() => {
        if (!viewingDocId) return;
        const timer = window.setTimeout(() => setViewingDocId(null), 20_000);
        return () => window.clearTimeout(timer);
    }, [viewingDocId]);

    const closeFileViewer = useCallback(() => {
        setFileViewer((prev) => {
            if (prev?.revokeOnClose) revokeBlobUrlIfNeeded(prev.url);
            return null;
        });
    }, []);

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
            const authorId = doc.authorId || currentUserId;
            closeFileViewer();
            removeDocFromState(doc.id);
            try {
                await SmartVaultDB.deleteDoc(doc.id, authorId);
                SmartToast.success('تم حذف الملف بنجاح');
            } catch {
                await loadDocs();
                SmartToast.error('فشل حذف الملف');
            }
        },
        [closeFileViewer, currentUserId, loadDocs, removeDocFromState],
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
        if (fileViewerRef.current?.doc.id === doc.id) {
            closeFileViewer();
            return;
        }

        prefetchVaultBlobStore();
        setViewingDocId(doc.id);
        try {
            const fresh = docsRef.current?.find((d) => d.id === doc.id) ?? doc;
            const payload = await resolveVaultDocForViewing(fresh);
            if (!payload) {
                SmartToast.error('تعذر فتح الملف — قد يكون غير محفوظ على الجهاز. أعد رفعه أو حدّث الصفحة');
                return;
            }

            if (payload.kind === 'file') {
                const opened = window.open(payload.url, '_blank', 'noopener,noreferrer');
                if (!opened) {
                    SmartToast.error('تعذّر فتح الملف — اسمح بالنوافذ المنبثقة أو استخدم زر التحميل');
                }
                return;
            }

            setFileViewer({
                doc: payload.doc,
                url: payload.url,
                blob: payload.blob,
                kind: payload.kind,
                revokeOnClose: payload.revokeOnClose,
            });
        } catch {
            SmartToast.error('تعذر فتح الملف');
        } finally {
            setViewingDocId(null);
        }
    }, [closeFileViewer, docsRef]);

    const handleDropdownAction = useCallback(
        async (doc: SmartVaultDoc, action: DropdownAction) => {
            setOpenDropdownId(null);
            if (action === 'edit') handleEdit(doc);
            else if (action === 'delete') {
                const ok = await confirmRepositoryAction(`هل أنت متأكد من حذف "${doc.title}"؟`);
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
