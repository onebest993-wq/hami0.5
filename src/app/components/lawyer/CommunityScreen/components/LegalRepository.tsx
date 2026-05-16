import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, FileText, Scale, FilePen, BookOpen, FolderOpen, ChevronDown, ArrowUpDown, X, Download } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useAuth } from '@/app/context/AuthContext';
import { RepositoryDB, LawyerStorage, notifyFollowers, uuidv4, type RepositoryDocument } from '@/app/services/lawyer-cloud';
import { RepositoryCard } from './RepositoryCard';
import { UploadDocumentModal } from './UploadDocumentModal';

const DOCUMENT_TYPES = ['الكل', 'عقد', 'قرار حكم', 'عريضة', 'بحث قانوني', 'أخرى'] as const;

const TYPE_ICONS: Record<string, React.ReactNode> = {
    'عقد': <FileText size={14} />,
    'قرار حكم': <Scale size={14} />,
    'عريضة': <FilePen size={14} />,
    'بحث قانوني': <BookOpen size={14} />,
    'أخرى': <FolderOpen size={14} />,
};

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
    const isImage = doc.mimeType?.startsWith('image/');
    const isPdf = doc.mimeType === 'application/pdf';

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
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
                            <div className="w-12 h-12 rounded-xl bg-[#E6C673]/10 flex items-center justify-center shrink-0">
                                <FileText size={24} className="text-[#E6C673]" />
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
                        ) : signedUrl && (isImage || isPdf) ? (
                            <div className="h-48 rounded-xl overflow-hidden bg-[#25293C]">
                                {isImage ? (
                                    <img
                                        src={signedUrl}
                                        alt={doc.title}
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <iframe
                                        src={signedUrl}
                                        title={doc.title}
                                        className="w-full h-full"
                                    />
                                )}
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

export const LegalRepository = () => {
    const { user, hasRole } = useAuth();
    const userId = user?.id ?? null;

    const [documents, setDocuments] = useState<RepositoryDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<string>('الكل');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sortBy, setSortBy] = useState<string>('newest');
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<RepositoryDocument | null>(null);
    const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const canUpload = Boolean(user && hasRole('lawyer'));
    const isOwner = useCallback(
        (doc: RepositoryDocument) => userId !== null && doc.authorId === userId,
        [userId]
    );

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const docs = await RepositoryDB.listDocuments();
            setDocuments(docs);
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
            const matchesSearch =
                searchTerm === '' ||
                doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.description.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesType && matchesSearch;
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
    }, [searchTerm, selectedType, documents, sortBy]);

    const handleDownload = useCallback(async (doc: RepositoryDocument) => {
        setDownloadingId(doc.id);
        try {
            if (!doc.storagePath) {
                SmartToast.warning('الملف غير متاح للتحميل');
                return;
            }
            const url = await LawyerStorage.getSignedUrl(doc.storagePath);
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

    const handleDeleteDocument = useCallback(async (doc: RepositoryDocument) => {
        if (!isOwner(doc)) {
            SmartToast.warning('غير مصرح لك بحذف هذا المستند');
            return;
        }
        setDeletingId(doc.id);
        try {
            await RepositoryDB.deleteDocument(doc.id);
            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
            SmartToast.success(`تم حذف "${doc.title}"`);
        } catch {
            SmartToast.error('فشل حذف المستند');
        } finally {
            setDeletingId(null);
        }
    }, [isOwner]);

    const handleEditDocument = useCallback((doc: RepositoryDocument) => {
        if (!isOwner(doc)) {
            SmartToast.warning('غير مصرح لك بتعديل هذا المستند');
            return;
        }
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
                const url = await LawyerStorage.getSignedUrl(doc.storagePath);
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

    const handleUploadSubmit = useCallback(async (data: { title: string; type: string; description: string; file: File | null }) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            let storagePath = '';
            let fileName = '';
            let mimeType = '';
            let fileSize = 0;

            if (data.file) {
                const uploadResult = await LawyerStorage.uploadSmartFile(user.id, data.file, 'repository');
                storagePath = uploadResult.path;
                fileName = data.file.name;
                mimeType = data.file.type;
                fileSize = data.file.size;
            }

            const newDoc: RepositoryDocument = {
                id: uuidv4(),
                title: data.title,
                description: data.description,
                type: data.type as RepositoryDocument['type'],
                authorId: user.id,
                authorName: user?.user_metadata?.fullName || user?.email || 'محامي',
                uploadDate: new Date().toISOString().split('T')[0],
                fileName,
                mimeType,
                storagePath,
                fileSize,
            };

            await RepositoryDB.saveDocument(newDoc);
            setIsUploadModalOpen(false);
            SmartToast.success('تم رفع المستند بنجاح');
            notifyFollowers(user.id, 'new_document', 'مستند جديد من متابَع', `أضاف ${newDoc.authorName} مستند "${newDoc.title}" في المستودع القانوني`);
        } catch {
            SmartToast.error('فشل رفع المستند');
        } finally {
            setIsSubmitting(false);
        }
    }, [user]);

    const activeTypeIcon = TYPE_ICONS[selectedType] || <FolderOpen size={14} />;
    const sortOptions = [
        { value: 'newest', label: 'الأحدث أولاً' },
        { value: 'oldest', label: 'الأقدم أولاً' },
        { value: 'name', label: 'الاسم أ-ي' },
    ];
    const activeSortLabel = sortOptions.find((o) => o.value === sortBy)?.label || 'الأحدث أولاً';

    return (
        <div className="px-4 pb-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-white font-bold text-base">المستودع القانوني العام</h2>
                    <p className="text-white/40 text-[11px]">مكتبة رقمية للمستندات القانونية</p>
                </div>
                {canUpload && (
                    <button type="button"
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E6C673]/10 border border-[#E6C673]/20 text-[#E6C673] hover:bg-[#E6C673]/15 text-xs font-bold transition-all"
                    >
                        رفع مستند للمستودع 📤
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-[#25293C] rounded-xl px-4 h-12 border border-white/5 focus-within:border-[#E6C673]/30 transition-colors">
                    <Search size={18} className="text-white/30 shrink-0" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="ابحث في المستندات..."
                        className="w-full bg-transparent text-white text-sm placeholder-white/30 focus:outline-none"
                    />
                </div>

                <div className="relative">
                    <button type="button"
                        onClick={() => setIsSortOpen((v) => !v)}
                        className="h-12 px-3 rounded-xl bg-[#25293C] border border-white/5 flex items-center gap-1.5 text-white/70 hover:text-white hover:border-white/20 transition-colors"
                        title="ترتيب"
                    >
                        <ArrowUpDown size={16} />
                        <ChevronDown size={14} className={`transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isSortOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                            <div className="absolute left-0 top-full mt-2 w-40 z-50 bg-[#25293C] border border-white/10 rounded-2xl p-2 shadow-2xl">
                                {sortOptions.map((opt) => (
                                    <button type="button"
                                        key={opt.value}
                                        onClick={() => { setSortBy(opt.value); setIsSortOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                                            sortBy === opt.value
                                                ? 'bg-[#E6C673]/10 text-[#E6C673] font-bold'
                                                : 'text-white/70 hover:bg-white/5 hover:text-white'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="relative">
                    <button type="button"
                        onClick={() => setIsFilterOpen((v) => !v)}
                        className="h-12 px-4 rounded-xl bg-[#25293C] border border-white/5 flex items-center gap-2 text-white/70 hover:text-white hover:border-white/20 transition-colors"
                    >
                        {activeTypeIcon}
                        <span className="text-sm font-medium">{selectedType}</span>
                        <ChevronDown size={16} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isFilterOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                            <div className="absolute left-0 top-full mt-2 w-44 z-50 bg-[#25293C] border border-white/10 rounded-2xl p-2 shadow-2xl">
                                {DOCUMENT_TYPES.map((type) => (
                                    <button type="button"
                                        key={type}
                                        onClick={() => {
                                            setSelectedType(type);
                                            setIsFilterOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                                            selectedType === type
                                                ? 'bg-[#E6C673]/10 text-[#E6C673] font-bold'
                                                : 'text-white/70 hover:bg-white/5 hover:text-white'
                                        }`}
                                    >
                                        {TYPE_ICONS[type] || <FolderOpen size={14} />}
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

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
                            onDelete={handleDeleteDocument}
                            onEdit={handleEditDocument}
                            onReport={handleReportDocument}
                            onPreview={handlePreview}
                        />
                    ))}
                </div>
            )}

            <UploadDocumentModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onSubmit={handleUploadSubmit}
                onUploadSuccess={handleAddNewDocument}
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
        </div>
    );
};
