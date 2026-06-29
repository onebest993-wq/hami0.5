import { useCallback, useEffect, useMemo, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useAuthSafe } from '@/app/context/AuthContext';
import {
    RepositoryDB,
    LawyerStorage,
    uuidv4,
    type RepositoryDocument,
} from '@/app/services/lawyer-cloud';
import { notifyFollowers } from '@/app/services/cloud/lawyerCommunityCloud';
import { repositorySortLabel, type RepositorySortKey } from '../repositoryListFilters';
import { repositoryDocMatchesTag, repositoryDocMatchesSearch, resolveRepositoryDocTags } from '../repositoryTagUtils';
import { cacheRepositoryFileLocally, resolveRepositoryStorageUrl } from '../repositoryStorageService';
import { inferRepositoryMimeType, getRepositoryMediaKind } from '../components/repositoryMedia';
import {
    sanitizeRepositoryUploadDescription,
    sanitizeRepositoryUploadTitle,
    validateRepositoryUploadFile,
} from '../repositoryUploadValidation';

export type LegalRepositoryFilters = {
    searchTerm?: string;
    selectedType?: string;
    sortBy?: RepositorySortKey;
    selectedTag?: string | null;
};

export type RepositoryUploadPayload = {
    title: string;
    type: string;
    description: string;
    file: File | null;
    tags: string[];
};

export function useLegalRepositoryDocuments({
    searchTerm = '',
    selectedType = 'الكل',
    sortBy = 'newest',
    selectedTag = null,
}: LegalRepositoryFilters = {}) {
    const { user, hasRole } = useAuthSafe();
    const userId = user?.id ?? null;

    const [documents, setDocuments] = useState<RepositoryDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState<RepositoryDocument | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<RepositoryDocument | null>(null);
    const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<RepositoryDocument | null>(null);

    const canUpload = Boolean(user && hasRole('lawyer'));
    const authorName = user?.user_metadata?.fullName || user?.email || 'محامي';

    const isOwner = useCallback(
        (doc: RepositoryDocument) => userId !== null && doc.authorId === userId,
        [userId],
    );

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const docs = await RepositoryDB.listDocuments();
            setDocuments(
                docs.map((doc) => ({
                    ...doc,
                    tags: resolveRepositoryDocTags(doc.title, doc.description, doc.tags),
                })),
            );
        } catch {
            SmartToast.error('فشل تحميل المستندات');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchDocuments();
    }, [fetchDocuments]);

    const filteredDocuments = useMemo(() => {
        const filtered = documents.filter((doc) => {
            const matchesType = selectedType === 'الكل' || doc.type === selectedType;
            const matchesSearch = repositoryDocMatchesSearch(doc, searchTerm);
            const docTags = resolveRepositoryDocTags(doc.title, doc.description, doc.tags);
            const matchesTag = repositoryDocMatchesTag(docTags, selectedTag);
            return matchesType && matchesSearch && matchesTag;
        });
        return [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'oldest':
                    return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
                case 'name':
                    return a.title.localeCompare(b.title);
                case 'newest':
                default:
                    return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
            }
        });
    }, [searchTerm, selectedType, selectedTag, documents, sortBy]);

    const handleDownload = useCallback(async (doc: RepositoryDocument) => {
        setDownloadingId(doc.id);
        try {
            if (!doc.storagePath) {
                SmartToast.warning('الملف غير متاح للتحميل');
                return;
            }
            const url = await resolveRepositoryStorageUrl(doc.storagePath);
            if (url) {
                const a = document.createElement('a');
                a.href = url;
                a.download = doc.fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                SmartToast.success(`جاري تحميل "${doc.title}"`);
            } else {
                SmartToast.warning('رابط التحميل غير متاح');
            }
        } catch {
            SmartToast.error('فشل تحميل المستند');
        } finally {
            setDownloadingId(null);
        }
    }, []);

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

    const handleConfirmDelete = useCallback(async () => {
        if (!deleteTarget) return;
        if (!isOwner(deleteTarget)) {
            SmartToast.warning('غير مصرح لك بحذف هذا المستند');
            setDeleteTarget(null);
            return;
        }
        setDeletingId(deleteTarget.id);
        try {
            await RepositoryDB.deleteDocument(deleteTarget.id);
            setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
            SmartToast.success(`تم حذف "${deleteTarget.title}"`);
            setDeleteTarget(null);
        } catch {
            SmartToast.error('فشل حذف المستند');
        } finally {
            setDeletingId(null);
        }
    }, [deleteTarget, isOwner]);

    const handleEditDocument = useCallback(
        (doc: RepositoryDocument) => {
            if (!isOwner(doc)) {
                SmartToast.warning('غير مصرح لك بتعديل هذا المستند');
                return;
            }
            setEditingDoc(doc);
            setIsUploadModalOpen(true);
        },
        [isOwner],
    );

    const handleReportDocument = useCallback((doc: RepositoryDocument) => {
        SmartToast.success(`تم الإبلاغ عن "${doc.title}" — شكراً لك`);
    }, []);

    const handlePreview = useCallback(async (doc: RepositoryDocument) => {
        setPreviewDoc(doc);
        if (!doc.storagePath) {
            setPreviewSignedUrl(null);
            return;
        }
        setPreviewLoading(true);
        try {
            const url = await resolveRepositoryStorageUrl(doc.storagePath);
            setPreviewSignedUrl(url);
        } catch {
            setPreviewSignedUrl(null);
        } finally {
            setPreviewLoading(false);
        }
    }, []);

    const closePreview = useCallback(() => {
        setPreviewDoc(null);
        setPreviewSignedUrl(null);
    }, []);

    const openUploadModal = useCallback(() => {
        setEditingDoc(null);
        setIsUploadModalOpen(true);
    }, []);

    const closeUploadModal = useCallback(() => {
        setIsUploadModalOpen(false);
        setEditingDoc(null);
    }, []);

    const handleUploadSubmit = useCallback(
        async (data: RepositoryUploadPayload) => {
            if (!user) {
                SmartToast.warning('سجّل الدخول أولاً');
                throw new Error('auth');
            }

            const title = sanitizeRepositoryUploadTitle(data.title);
            const description = sanitizeRepositoryUploadDescription(data.description);
            if (!title || !description) {
                SmartToast.warning('يرجى ملء جميع الحقول المطلوبة');
                throw new Error('invalid-fields');
            }

            if (!editingDoc && !data.file) {
                SmartToast.warning('يرجى اختيار ملف أو صورة للرفع');
                throw new Error('no-file');
            }

            if (data.file) {
                const kind =
                    getRepositoryMediaKind(inferRepositoryMimeType(data.file), data.file.name) === 'image'
                        ? 'image'
                        : 'document';
                const fileError = validateRepositoryUploadFile(data.file, kind);
                if (fileError) {
                    SmartToast.warning(fileError);
                    throw new Error('invalid-file');
                }
            }

            setIsSubmitting(true);
            try {
                let storagePath = editingDoc?.storagePath ?? '';
                let fileName = editingDoc?.fileName ?? '';
                let mimeType = editingDoc?.mimeType ?? '';
                let fileSize = editingDoc?.fileSize ?? 0;

                if (data.file) {
                    try {
                        const uploadResult = await LawyerStorage.uploadSmartFile(user.id, data.file, 'repository');
                        storagePath = uploadResult.path;
                        fileName = data.file.name;
                        mimeType = inferRepositoryMimeType(data.file);
                        fileSize = data.file.size;
                    } catch {
                        const cached = await cacheRepositoryFileLocally(data.file);
                        storagePath = cached.storagePath;
                        fileName = cached.fileName;
                        mimeType = cached.mimeType;
                        fileSize = cached.fileSize;
                    }
                }

                if (!storagePath) {
                    SmartToast.error('فشل رفع الملف — لم يُحفظ مسار التخزين');
                    throw new Error('no-storage');
                }

                const savedDoc: RepositoryDocument = editingDoc
                    ? {
                          ...editingDoc,
                          title,
                          description,
                          type: data.type as RepositoryDocument['type'],
                          tags: resolveRepositoryDocTags(title, description, data.tags),
                          fileName,
                          mimeType,
                          storagePath,
                          fileSize,
                      }
                    : {
                          id: uuidv4(),
                          title,
                          description,
                          type: data.type as RepositoryDocument['type'],
                          tags: resolveRepositoryDocTags(title, description, data.tags),
                          authorId: user.id,
                          authorName,
                          uploadDate: new Date().toISOString().split('T')[0],
                          fileName,
                          mimeType,
                          storagePath,
                          fileSize,
                      };

                await RepositoryDB.saveDocument(savedDoc);

                if (editingDoc) {
                    setDocuments((prev) => prev.map((d) => (d.id === savedDoc.id ? savedDoc : d)));
                    SmartToast.success('تم تحديث المستند');
                } else {
                    setDocuments((prev) => [savedDoc, ...prev]);
                    SmartToast.success('تم رفع المستند بنجاح');
                    notifyFollowers(
                        user.id,
                        'new_document',
                        'مستند جديد من متابَع',
                        `أضاف ${savedDoc.authorName} مستند "${savedDoc.title}" في المستودع القانوني`,
                    );
                }

                closeUploadModal();
            } catch (err) {
                if (
                    err instanceof Error &&
                    ['auth', 'no-file', 'no-storage', 'invalid-fields', 'invalid-file'].includes(err.message)
                ) {
                    /* toast shown */
                } else {
                    SmartToast.error('فشل رفع المستند');
                }
                throw err;
            } finally {
                setIsSubmitting(false);
            }
        },
        [user, editingDoc, authorName, closeUploadModal],
    );

    return {
        canUpload,
        authorName,
        loading,
        filteredDocuments,
        activeSortLabel: repositorySortLabel(sortBy),
        downloadingId,
        deletingId,
        isUploadModalOpen,
        editingDoc,
        isSubmitting,
        previewDoc,
        previewSignedUrl,
        previewLoading,
        deleteTarget,
        isOwner,
        openUploadModal,
        closeUploadModal,
        closePreview,
        handleDownload,
        handleDeleteRequest,
        handleConfirmDelete,
        handleEditDocument,
        handleReportDocument,
        handlePreview,
        handleUploadSubmit,
        cancelDelete: () => {
            if (deletingId) return;
            setDeleteTarget(null);
        },
    };
}
