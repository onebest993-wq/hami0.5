import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useAuthSafe } from '@/app/context/AuthContext';
import {
    RepositoryDB,
    LawyerStorage,
    listRepositoryDocumentsSync,
    uuidv4,
    type RepositoryDocument,
} from '@/app/services/lawyer-cloud';
import { notifyFollowers } from '@/app/services/cloud/lawyerCommunityCloud';
import {
    repositoryHasActiveListFilters,
    repositorySortLabel,
    type RepositorySortKey,
} from '../repositoryListFilters';
import { repositoryDocMatchesTag, repositoryDocMatchesSearch, resolveRepositoryDocTags } from '../repositoryTagUtils';
import {
    downloadRepositoryFile,
    releaseRepositoryBlobUrl,
    reserveRepositoryFileLocally,
    resolveRepositoryStorageUrl,
} from '../repositoryStorageService';
import { inferRepositoryMimeType, getRepositoryMediaKind } from '../components/repositoryMedia';
import {
    sanitizeRepositoryUploadDescription,
    sanitizeRepositoryUploadTitle,
    validateRepositoryUploadFile,
} from '../repositoryUploadValidation';
import { withForumAsyncTimeout } from '../forumAsync';
import { peekRepositoryDocsCache, readRepositoryDocsCache, setRepositoryDocsCache } from '@/app/services/forum/repositoryDocsWarmCache';

const REPOSITORY_CACHE_HYDRATE_TIMEOUT_MS = 2_000;
const REPOSITORY_FETCH_TIMEOUT_MS = 6_000;

function resolveInitialRepositoryDocuments(): RepositoryDocument[] {
    const cached = peekRepositoryDocsCache();
    if (cached && cached.length > 0) {
        return normalizeRepositoryRows(cached);
    }
    const local = listRepositoryDocumentsSync();
    if (local.length > 0) {
        return normalizeRepositoryRows(local);
    }
    return [];
}

export type LegalRepositoryFilters = {
    searchTerm?: string;
    selectedType?: string;
    sortBy?: RepositorySortKey;
    selectedTag?: string | null;
    /** keepAlive مغلق: أغلق نوافذ الرفع/المعاينة/الحذف */
    surfaceOpen?: boolean;
};

export type RepositoryUploadPayload = {
    title: string;
    type: string;
    description: string;
    file: File | null;
    tags: string[];
};

function normalizeRepositoryRows(docs: RepositoryDocument[]): RepositoryDocument[] {
    return docs.map((doc) => ({
        ...doc,
        tags: resolveRepositoryDocTags(doc.title, doc.description, doc.tags),
    }));
}

export function useLegalRepositoryDocuments({
    searchTerm = '',
    selectedType = 'الكل',
    sortBy = 'newest',
    selectedTag = null,
    surfaceOpen = true,
}: LegalRepositoryFilters = {}) {
    const { user, hasRole } = useAuthSafe();
    const userId = user?.id ?? null;

    const [documents, setDocuments] = useState<RepositoryDocument[]>(resolveInitialRepositoryDocuments);
    const [syncing, setSyncing] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [openingId, setOpeningId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState<RepositoryDocument | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<RepositoryDocument | null>(null);
    const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewMode, setPreviewMode] = useState<'peek' | 'open'>('peek');
    const [deleteTarget, setDeleteTarget] = useState<RepositoryDocument | null>(null);
    const actionInflightRef = useRef(new Set<string>());
    const documentsRef = useRef<RepositoryDocument[]>([]);
    documentsRef.current = documents;

    const canUpload = Boolean(user && hasRole('lawyer'));
    const authorName = user?.user_metadata?.fullName || user?.email || 'محامي';

    const hasActiveFilters =
        repositoryHasActiveListFilters(selectedType, sortBy, selectedTag) ||
        searchTerm.trim().length > 0;

    const isOwner = useCallback(
        (doc: RepositoryDocument) => userId !== null && doc.authorId === userId,
        [userId],
    );

    const applyDocuments = useCallback((docs: RepositoryDocument[]) => {
        const normalized = normalizeRepositoryRows(docs);
        setDocuments(normalized);
        setRepositoryDocsCache(normalized);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const runBootstrap = async () => {
            let hydratedCount = documentsRef.current.length;

            const cached = peekRepositoryDocsCache();
            if (cached && cached.length > 0) {
                applyDocuments(cached);
                hydratedCount = Math.max(hydratedCount, cached.length);
            }

            const localSync = listRepositoryDocumentsSync();
            if (localSync.length > 0) {
                applyDocuments(localSync);
                hydratedCount = Math.max(hydratedCount, localSync.length);
            }

            const warmed = await withForumAsyncTimeout(
                readRepositoryDocsCache(),
                REPOSITORY_CACHE_HYDRATE_TIMEOUT_MS,
                [],
            );
            if (!cancelled && warmed.length > 0) {
                applyDocuments(warmed);
                hydratedCount = Math.max(hydratedCount, warmed.length);
            }

            if (cancelled) return;

            if (hydratedCount === 0) {
                setSyncing(true);
            }

            try {
                const docs = await withForumAsyncTimeout(
                    RepositoryDB.listDocuments(),
                    REPOSITORY_FETCH_TIMEOUT_MS,
                    documentsRef.current,
                );
                if (!cancelled) {
                    applyDocuments(docs);
                }
            } catch {
                if (!cancelled && documentsRef.current.length === 0) {
                    SmartToast.error('فشل تحميل المستندات');
                }
            } finally {
                if (!cancelled) {
                    setSyncing(false);
                }
            }
        };

        void runBootstrap();
        return () => {
            cancelled = true;
            setSyncing(false);
        };
         
    }, [applyDocuments]);

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
        if (actionInflightRef.current.has(`dl:${doc.id}`)) return;
        actionInflightRef.current.add(`dl:${doc.id}`);
        setDownloadingId(doc.id);
        try {
            if (!doc.storagePath) {
                SmartToast.warning('الملف غير متاح للتحميل');
                return;
            }
            const url = await withForumAsyncTimeout(
                resolveRepositoryStorageUrl(doc.storagePath),
                8_000,
                null,
            );
            if (!url) {
                SmartToast.warning('رابط التحميل غير متاح — جرّب بعد لحظات');
                return;
            }
            await downloadRepositoryFile(url, doc.fileName || doc.title);
            SmartToast.success(`تم تحميل "${doc.title}"`);
        } catch {
            SmartToast.error('فشل تحميل المستند');
        } finally {
            actionInflightRef.current.delete(`dl:${doc.id}`);
            setDownloadingId(null);
        }
    }, []);

    const openPreviewWithMode = useCallback(
        async (doc: RepositoryDocument, mode: 'peek' | 'open') => {
            const inflightKey = `${mode}:${doc.id}`;
            if (actionInflightRef.current.has(inflightKey)) return;

            actionInflightRef.current.add(inflightKey);
            if (mode === 'open') {
                setOpeningId(doc.id);
            }

            setPreviewDoc(doc);
            setPreviewMode(mode);

            if (!doc.storagePath) {
                setPreviewSignedUrl(null);
                setPreviewLoading(false);
                actionInflightRef.current.delete(inflightKey);
                if (mode === 'open') setOpeningId(null);
                SmartToast.warning(mode === 'open' ? 'الملف غير متاح للفتح' : 'الملف غير متاح للاطلاع');
                return;
            }

            setPreviewLoading(true);
            try {
                const url = await withForumAsyncTimeout(
                    resolveRepositoryStorageUrl(doc.storagePath),
                    mode === 'open' ? 8_000 : 5_000,
                    null,
                );
                setPreviewSignedUrl(url);
                if (!url) {
                    SmartToast.warning(mode === 'open' ? 'تعذر فتح الملف حالياً' : 'تعذر تحميل المعاينة');
                }
            } catch {
                setPreviewSignedUrl(null);
                SmartToast.error(mode === 'open' ? 'فشل فتح الملف' : 'فشل تحميل المعاينة');
            } finally {
                setPreviewLoading(false);
                actionInflightRef.current.delete(inflightKey);
                if (mode === 'open') setOpeningId(null);
            }
        },
        [],
    );

    const handleOpenDocument = useCallback(async (doc: RepositoryDocument) => {
        await openPreviewWithMode(doc, 'open');
    }, [openPreviewWithMode]);

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
        const target = deleteTarget;
        const snapshot = documents;
        setDeleteTarget(null);
        setDocuments((prev) => prev.filter((d) => d.id !== target.id));
        setDeletingId(target.id);
        SmartToast.success(`تم حذف "${target.title}"`);
        try {
            await RepositoryDB.deleteDocument(target.id);
        } catch {
            setDocuments(snapshot);
            SmartToast.error('فشل حذف المستند');
        } finally {
            setDeletingId(null);
        }
    }, [deleteTarget, documents, isOwner]);

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

    const handleReportDocument = useCallback((doc: RepositoryDocument) => {
        SmartToast.success(`تم الإبلاغ عن "${doc.title}" — شكراً لك`);
    }, []);

    const handlePreview = useCallback(async (doc: RepositoryDocument) => {
        await openPreviewWithMode(doc, 'peek');
    }, [openPreviewWithMode]);

    const closePreview = useCallback(() => {
        setPreviewDoc(null);
        setPreviewSignedUrl(null);
        setPreviewMode('peek');
    }, []);

    const openUploadModal = useCallback(() => {
        flushSync(() => {
            setEditingDoc(null);
            setIsUploadModalOpen(true);
        });
    }, []);

    const closeUploadModal = useCallback((options?: { force?: boolean }) => {
        if (!options?.force && isSubmitting) return;
        setIsUploadModalOpen(false);
        setEditingDoc(null);
    }, [isSubmitting]);

    useEffect(() => {
        if (surfaceOpen !== false) return;
        closeUploadModal({ force: true });
        setPreviewDoc(null);
        setPreviewSignedUrl(null);
        setPreviewMode('peek');
        if (!deletingId) setDeleteTarget(null);
    }, [surfaceOpen, closeUploadModal, deletingId]);

    const syncRepositoryDocToCloud = useCallback(
        async (savedDoc: RepositoryDocument, file: File, ownerId: string) => {
            const localPath = savedDoc.storagePath;
            try {
                const uploadResult = await LawyerStorage.uploadSmartFile(ownerId, file, 'repository');
                if (!uploadResult?.path) return;
                const signedUrl = await withForumAsyncTimeout(
                    LawyerStorage.getSignedUrl(uploadResult.path),
                    6_000,
                    null,
                );
                if (!signedUrl) return;
                const cloudDoc: RepositoryDocument = {
                    ...savedDoc,
                    storagePath: uploadResult.path,
                    fileName: file.name,
                    mimeType: inferRepositoryMimeType(file),
                    fileSize: file.size,
                };
                await RepositoryDB.saveDocument(cloudDoc);
                setDocuments((prev) => prev.map((d) => (d.id === cloudDoc.id ? cloudDoc : d)));
                if (localPath?.startsWith('idb:forum:')) {
                    releaseRepositoryBlobUrl(localPath);
                }
            } catch {
                /* النسخة المحلية تبقى متاحة */
            }
        },
        [],
    );

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
                const uploadFile = data.file;

                if (uploadFile) {
                    const reserved = reserveRepositoryFileLocally(uploadFile);
                    storagePath = reserved.storagePath;
                    fileName = reserved.fileName;
                    mimeType = reserved.mimeType;
                    fileSize = reserved.fileSize;
                    try {
                        await reserved.persist();
                    } catch {
                        SmartToast.error('تعذّر حفظ نسخة الملف محلياً');
                        throw new Error('persist-failed');
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

                const snapshot = documentsRef.current;
                if (editingDoc) {
                    setDocuments((prev) => prev.map((d) => (d.id === savedDoc.id ? savedDoc : d)));
                    setRepositoryDocsCache(
                        snapshot.map((d) => (d.id === savedDoc.id ? savedDoc : d)),
                    );
                } else {
                    const nextDocs = [savedDoc, ...snapshot];
                    setDocuments(nextDocs);
                    setRepositoryDocsCache(nextDocs);
                }

                try {
                    await RepositoryDB.saveDocument(savedDoc);
                } catch {
                    setDocuments(snapshot);
                    setRepositoryDocsCache(snapshot);
                    SmartToast.error('فشل حفظ المستند محلياً');
                    throw new Error('save-failed');
                }

                flushSync(() => {
                    closeUploadModal({ force: true });
                });

                if (editingDoc) {
                    SmartToast.success('تم تحديث المستند');
                } else {
                    SmartToast.success('تم رفع المستند بنجاح');
                    void notifyFollowers(
                        user.id,
                        'new_document',
                        'مستند جديد من متابَع',
                        `أضاف ${savedDoc.authorName} مستند "${savedDoc.title}" في المستودع القانوني`,
                    );
                }

                if (uploadFile) {
                    void syncRepositoryDocToCloud(savedDoc, uploadFile, user.id);
                }
            } catch (err) {
                if (
                    err instanceof Error &&
                    ['auth', 'no-file', 'no-storage', 'invalid-fields', 'invalid-file', 'persist-failed', 'save-failed'].includes(
                        err.message,
                    )
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
        [user, editingDoc, authorName, closeUploadModal, syncRepositoryDocToCloud],
    );

    return {
        canUpload,
        authorName,
        syncing,
        filteredDocuments,
        totalDocuments: documents.length,
        hasActiveFilters,
        activeSortLabel: repositorySortLabel(sortBy),
        downloadingId,
        openingId,
        deletingId,
        isUploadModalOpen,
        editingDoc,
        isSubmitting,
        previewDoc,
        previewSignedUrl,
        previewLoading,
        previewMode,
        deleteTarget,
        isOwner,
        openUploadModal,
        closeUploadModal,
        closePreview,
        handleDownload,
        handleOpenDocument,
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
