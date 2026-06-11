import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FileText, FolderOpen, X, Download, Upload, FileImage } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useAuth } from '@/app/context/AuthContext';
import { RepositoryDB, LawyerStorage, notifyFollowers, uuidv4, type RepositoryDocument } from '@/app/services/lawyer-cloud';
import { RepositoryCard } from './RepositoryCard';
import { UploadDocumentModal } from './UploadDocumentModal';
import { ForumDeleteConfirmModal } from './ForumDeleteConfirmModal';
import { getRepositoryMediaKind, getRepositoryMediaIconKind, inferRepositoryMimeType } from './repositoryMedia';
import { repositorySortLabel, type RepositorySortKey } from '../repositoryListFilters';
import { repositoryDocMatchesTag, repositoryDocMatchesSearch, resolveRepositoryDocTags } from '../repositoryTagUtils';
import { cacheRepositoryFileLocally, resolveRepositoryStorageUrl } from '../repositoryStorageService';

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const idx = Math.min(i, sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, idx)).toFixed(1)) + ' ' + sizes[idx];
};

const PreviewModal = ({
    doc,
    signedUrl,
    isLoading,
    onClose,
    onDownload,
}: {
    doc: RepositoryDocument;
    signedUrl: string | null;
    isLoading: boolean;
    onClose: () => void;
    onDownload: (doc: RepositoryDocument) => void;
}) => {
    const isImage = getRepositoryMediaKind(doc.mimeType, doc.fileName) === 'image';
    const isPdf = getRepositoryMediaKind(doc.mimeType, doc.fileName) === 'pdf';

    if (isImage) {
        return (
            <>
                <div
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm"
                    onClick={onClose}
                    aria-hidden
                />
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors pointer-events-auto"
                        aria-label="إغلاق"
                    >
                        <X size={22} />
                    </button>
                    {isLoading ? (
                        <svg
                            className="animate-spin h-8 w-8 text-white/30 pointer-events-auto"
                            viewBox="0 0 24 24"
                        >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : signedUrl ? (
                        <img
                            src={signedUrl}
                            alt={doc.title}
                            className="max-w-full max-h-[min(85vh,720px)] w-auto h-auto object-contain pointer-events-auto select-none"
                            onClick={(e) => e.stopPropagation()}
                            draggable={false}
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-white/40 pointer-events-auto">
                            <FileImage size={40} />
                            <p className="text-sm">الصورة غير متاحة</p>
                        </div>
                    )}
                </div>
            </>
        );
    }

    return (
        <>
            <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="w-full max-w-lg bg-[#1A1D2D] rounded-2xl border border-white/10 shadow-2xl pointer-events-auto overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                        <h3 className="text-white font-bold text-base">معاينة المستند</h3>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="px-5 py-4 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-[#E6C673]/10 flex items-center justify-center shrink-0 text-[#E6C673]">
                                {getRepositoryMediaIconKind(doc) === 'image' ? (
                                    <FileImage size={24} />
                                ) : (
                                    <FileText size={24} className="text-[#E6C673]" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-white font-bold text-sm truncate">{doc.title}</h4>
                                <p className="text-white/40 text-[11px]">{doc.type} • {doc.authorName}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#25293C] rounded-xl px-3 py-2.5">
                                <p className="text-white/30 text-[10px] mb-0.5">نوع الملف</p>
                                <p className="text-white text-xs font-bold truncate">
                                    {doc.mimeType || 'غير معروف'}
                                </p>
                            </div>
                            <div className="bg-[#25293C] rounded-xl px-3 py-2.5">
                                <p className="text-white/30 text-[10px] mb-0.5">الحجم</p>
                                <p className="text-white text-xs font-bold">
                                    {formatFileSize(doc.fileSize)}
                                </p>
                            </div>
                        </div>

                        {doc.description && (
                            <div className="bg-[#25293C] rounded-xl px-4 py-3">
                                <p className="text-white/30 text-[10px] mb-1">الوصف</p>
                                <p className="text-white/70 text-xs leading-relaxed">{doc.description}</p>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="h-48 bg-[#25293C] rounded-xl flex items-center justify-center">
                                <svg className="animate-spin h-6 w-6 text-white/20" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </div>
                        ) : signedUrl && isPdf ? (
                            <div className="h-64 rounded-xl overflow-hidden bg-[#25293C]">
                                <iframe
                                    src={signedUrl}
                                    title={doc.title}
                                    className="w-full h-full"
                                />
                            </div>
                        ) : signedUrl ? (
                            <div className="h-32 bg-[#25293C] rounded-xl flex flex-col items-center justify-center gap-2">
                                <FileText size={32} className="text-white/20" />
                                <p className="text-white/40 text-xs">المعاينة غير متاحة لهذا النوع من الملفات</p>
                            </div>
                        ) : (
                            <div className="h-32 bg-[#25293C] rounded-xl flex flex-col items-center justify-center gap-2">
                                <FileText size={32} className="text-white/20" />
                                <p className="text-white/40 text-xs">الملف غير متاح حالياً</p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/5">
                        <p className="text-white/30 text-[10px]">Uploaded: {doc.uploadDate}</p>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl text-sm text-white/50 hover:text-white transition-colors"
                            >
                                إغلاق
                            </button>
                            <button
                                type="button"
                                onClick={() => onDownload(doc)}
                                className="px-5 py-2.5 rounded-xl bg-[#E6C673] hover:bg-[#d4b560] text-black text-sm font-bold transition-colors flex items-center gap-2"
                            >
                                <Download size={16} />
                                تحميل الملف 📥
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export const LegalRepository = ({
    searchTerm = '',
    selectedType = 'الكل',
    sortBy = 'newest',
    selectedTag = null,
}: {
    searchTerm?: string;
    selectedType?: string;
    sortBy?: RepositorySortKey;
    selectedTag?: string | null;
} = {}) => {
    const { user, hasRole } = useAuth();
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
    const isOwner = useCallback(
        (doc: RepositoryDocument) => userId !== null && doc.authorId === userId,
        [userId]
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
        fetchDocuments();
    }, [fetchDocuments]);

    const filteredDocuments = useMemo(() => {
        const filtered = documents.filter((doc) => {
            const matchesType = selectedType === 'الكل' || doc.type === selectedType;
            const matchesSearch = repositoryDocMatchesSearch(doc, searchTerm);
            const docTags = resolveRepositoryDocTags(doc.title, doc.description, doc.tags);
            const matchesTag = repositoryDocMatchesTag(docTags, selectedTag);
            return matchesType && matchesSearch && matchesTag;
        });
        const sorted = [...filtered].sort((a, b) => {
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
        return sorted;
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

    const handleDeleteRequest = useCallback((doc: RepositoryDocument) => {
        if (!isOwner(doc)) {
            SmartToast.warning('غير مصرح لك بحذف هذا المستند');
            return;
        }
        setDeleteTarget(doc);
    }, [isOwner]);

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

    const handleEditDocument = useCallback((doc: RepositoryDocument) => {
        if (!isOwner(doc)) {
            SmartToast.warning('غير مصرح لك بتعديل هذا المستند');
            return;
        }
        setEditingDoc(doc);
        setIsUploadModalOpen(true);
    }, [isOwner]);

    const handleReportDocument = useCallback((doc: RepositoryDocument) => {
        SmartToast.success(`تم الإبلاغ عن "${doc.title}" — شكراً لك`);
    }, []);

    const handleAddNewDocument = useCallback((newDoc: RepositoryDocument) => {
        setDocuments((prev) => [newDoc, ...prev]);
    }, []);

    const handlePreview = useCallback(async (doc: RepositoryDocument) => {
        setPreviewDoc(doc);
        if (doc.storagePath) {
            setPreviewLoading(true);
            try {
                const url = await resolveRepositoryStorageUrl(doc.storagePath);
                setPreviewSignedUrl(url);
            } catch {
                setPreviewSignedUrl(null);
            } finally {
                setPreviewLoading(false);
            }
        } else {
            setPreviewSignedUrl(null);
        }
    }, []);

    const handleUploadSubmit = useCallback(async (data: { title: string; type: string; description: string; file: File | null; tags: string[] }) => {
        if (!user) {
            SmartToast.warning('سجّل الدخول أولاً');
            throw new Error('auth');
        }
        if (!editingDoc && !data.file) {
            SmartToast.warning('يرجى اختيار ملف أو صورة للرفع');
            throw new Error('no-file');
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
                      title: data.title,
                      description: data.description,
                      type: data.type as RepositoryDocument['type'],
                      tags: resolveRepositoryDocTags(data.title, data.description, data.tags),
                      fileName,
                      mimeType,
                      storagePath,
                      fileSize,
                  }
                : {
                      id: uuidv4(),
                      title: data.title,
                      description: data.description,
                      type: data.type as RepositoryDocument['type'],
                      tags: resolveRepositoryDocTags(data.title, data.description, data.tags),
                      authorId: user.id,
                      authorName: user?.user_metadata?.fullName || user?.email || 'محامي',
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
                handleAddNewDocument(savedDoc);
                SmartToast.success('تم رفع المستند بنجاح');
                notifyFollowers(
                    user.id,
                    'new_document',
                    'مستند جديد من متابَع',
                    `أضاف ${savedDoc.authorName} مستند "${savedDoc.title}" في المستودع القانوني`,
                );
            }

            setEditingDoc(null);
            setIsUploadModalOpen(false);
        } catch (err) {
            if (err instanceof Error && ['auth', 'no-file', 'no-storage'].includes(err.message)) {
                // toast already shown
            } else {
                SmartToast.error('فشل رفع المستند');
            }
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    }, [user, editingDoc, handleAddNewDocument]);

    const activeSortLabel = repositorySortLabel(sortBy);

    return (
        <div className="px-4 pb-28 space-y-4 relative">
            <div>
                <h2 className="text-white font-bold text-base">المستودع القانوني العام</h2>
                <p className="text-white/40 text-[11px]">مكتبة رقمية للمستندات القانونية</p>
            </div>

            {canUpload ? (
                <div className="fixed bottom-6 left-6 z-20">
                    <button
                        type="button"
                        onClick={() => {
                            setEditingDoc(null);
                            setIsUploadModalOpen(true);
                        }}
                        className="flex items-center gap-2 font-bold py-3 px-5 rounded-2xl shadow-xl shadow-black/30 transition-transform active:scale-95 bg-[#E6C673] hover:bg-[#d4b560] text-black"
                    >
                        <Upload size={18} />
                        <span>رفع مستند للمستودع</span>
                    </button>
                </div>
            ) : null}

            <div className="flex items-center justify-between">
                <p className="text-white/40 text-xs">
                    {loading ? 'جاري التحميل...' : filteredDocuments.length === 0
                        ? 'لا توجد نتائج'
                        : `${filteredDocuments.length} مستند${filteredDocuments.length !== 1 ? 'ات' : ''}`}
                </p>
                <p className="text-white/30 text-[10px]">
                    الترتيب: {activeSortLabel}
                </p>
            </div>

            {loading ? (
                <div className="py-14 text-center">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <svg className="animate-spin h-8 w-8 text-white/20" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">جاري تحميل المستندات...</h3>
                    <p className="text-white/40 text-sm">يرجى الانتظار</p>
                </div>
            ) : filteredDocuments.length === 0 ? (
                <div className="py-14 text-center">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <FolderOpen size={36} className="text-white/20" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">لا توجد مستندات تطابق بحثك</h3>
                    <p className="text-white/40 text-sm">حاول تغيير كلمة البحث أو اختيار نوع آخر.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredDocuments.map((doc) => (
                        <RepositoryCard
                            key={doc.id}
                            doc={doc}
                            isOwner={isOwner(doc)}
                            downloadingId={downloadingId}
                            deletingId={deletingId}
                            onDownload={handleDownload}
                            onDelete={handleDeleteRequest}
                            onEdit={handleEditDocument}
                            onReport={handleReportDocument}
                            onPreview={handlePreview}
                        />
                    ))}
                </div>
            )}

            <UploadDocumentModal
                isOpen={isUploadModalOpen}
                onClose={() => {
                    setIsUploadModalOpen(false);
                    setEditingDoc(null);
                }}
                onSubmit={handleUploadSubmit}
                editDoc={editingDoc}
                authorName={user?.user_metadata?.fullName || user?.email || 'محامي'}
                isSubmitting={isSubmitting}
            />

            {previewDoc && (
                <PreviewModal
                    doc={previewDoc}
                    signedUrl={previewSignedUrl}
                    isLoading={previewLoading}
                    onClose={() => { setPreviewDoc(null); setPreviewSignedUrl(null); }}
                    onDownload={handleDownload}
                />
            )}

            <ForumDeleteConfirmModal
                open={deleteTarget !== null}
                title="حذف المستند"
                message={
                    deleteTarget
                        ? `هل تريد حذف "${deleteTarget.title}" من المستودع؟ لا يمكن التراجع عن هذا الإجراء.`
                        : ''
                }
                loading={deletingId !== null}
                onConfirm={() => void handleConfirmDelete()}
                onCancel={() => {
                    if (deletingId) return;
                    setDeleteTarget(null);
                }}
            />
        </div>
    );
};
