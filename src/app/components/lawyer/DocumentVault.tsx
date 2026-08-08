import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Image, File, Calendar, Trash2 } from '@/app/components/ui/lucideIcons';
import { executionDocumentFoldersStorageKey, executionDocumentsStorageKey } from '@/app/utils/executionStorageKeys';
import SecureStoreService from '@/app/services/SecureStoreService';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    prefetchVaultPdfViewerSurface,
    VaultPdfViewerSurfaceLazy,
} from '@/app/components/lawyer/SmartVaultModal/VaultPdfViewerSurfaceLazy';
import { ZoomableContainer } from '@/app/components/shared/ZoomableContainer';

function loadPrivacyScreenSession() {
    return import('@/app/runtime/privacyScreenSession');
}

interface Document {
    id: string;
    name: string;
    type: 'image' | 'pdf';
    folderId: string;
    createdAt: string;
    dataUrl?: string;
    originalFileName?: string;
    source?: 'upload' | 'camera';
    trashedAt?: string;
}

interface Folder {
    id: string;
    name: string;
    createdAt: string;
}

type LegacyStoredDocument = {
    id?: string | number;
    title?: string;
    category?: string;
    fileName?: string;
    uploadDate?: string;
    fileType?: string;
    dataUrl?: string;
};

function isDocumentSortMode(value: string): value is 'newest' | 'oldest' | 'name_asc' {
    return value === 'newest' || value === 'oldest' || value === 'name_asc';
}

function isDocumentFilterType(value: string): value is 'all' | 'image' | 'pdf' {
    return value === 'all' || value === 'image' || value === 'pdf';
}

/**
 * تحويل data URL مخزَّن إلى Blob — العرض عبر Blob/ObjectURL بدل تمرير
 * السلسلة الضخمة نفسها إلى <img>/عارض PDF (ذاكرة أقل + فك تشفير أسرع).
 */
function dataUrlToBlob(dataUrl: string): Blob | null {
    try {
        const commaIdx = dataUrl.indexOf(',');
        if (!dataUrl.startsWith('data:') || commaIdx < 0) return null;
        const meta = dataUrl.slice(5, commaIdx);
        const payload = dataUrl.slice(commaIdx + 1);
        const mime = meta.split(';')[0] || 'application/octet-stream';
        if (!meta.includes('base64')) return new Blob([decodeURIComponent(payload)], { type: mime });
        const binary = atob(payload);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: mime });
    } catch {
        return null;
    }
}

interface DocumentVaultProps {
    executionId: string;
    onClose: () => void;
    onDocumentUploaded?: (info: {
        title: string;
        category: string;
        fileName: string;
        documentId: string;
    }) => void;
}

export const DocumentVault: React.FC<DocumentVaultProps> = ({ executionId, onClose, onDocumentUploaded }) => {
    const documentsStorageKey = executionDocumentsStorageKey(executionId);
    const foldersStorageKey = executionDocumentFoldersStorageKey(executionId);

    const loadVault = (): { docs: Document[]; folders: Folder[] } => {
        const defaultFolder: Folder = { id: 'default', name: 'عام', createdAt: new Date().toISOString() };
        let folders: Folder[] = [defaultFolder];
        try {
            const storedFolders = SecureStoreService.getItemSync(foldersStorageKey);
            if (storedFolders) {
                const parsed = JSON.parse(storedFolders);
                if (Array.isArray(parsed)) folders = parsed;
            }
        } catch {
            /* ignore */
        }
        if (!folders.some((f) => f.id === 'default')) folders = [defaultFolder, ...folders];

        let rawDocs: LegacyStoredDocument[] = [];
        try {
            const storedDocs = SecureStoreService.getItemSync(documentsStorageKey);
            if (storedDocs) {
                const parsed = JSON.parse(storedDocs);
                if (Array.isArray(parsed)) rawDocs = parsed as LegacyStoredDocument[];
            }
        } catch {
            /* ignore */
        }

        const looksNew = rawDocs.every((d) => d && typeof d === 'object' && 'folderId' in d && 'createdAt' in d && 'type' in d);
        if (looksNew) return { docs: rawDocs as Document[], folders };

        const byCategory = new Map<string, string>();
        const ensuredFolders: Folder[] = [...folders];
        const ensureFolderId = (name: string): string => {
            const t = String(name || '').trim();
            if (!t) return 'default';
            const existing = ensuredFolders.find((f) => f.name === t);
            if (existing) return existing.id;
            const id = `folder_${t.replace(/\s+/g, '_').replace(/[^\w\u0600-\u06FF]+/g, '')}_${Date.now()}`;
            ensuredFolders.push({ id, name: t, createdAt: new Date().toISOString() });
            return id;
        };

        const docs: Document[] = rawDocs
            .map((d) => {
                const category = String(d?.category || '').trim();
                const folderId = byCategory.get(category) || ensureFolderId(category);
                if (category) byCategory.set(category, folderId);
                const title = String(d?.title || '').trim();
                const fileName = String(d?.fileName || '').trim();
                const uploadDate = String(d?.uploadDate || '').trim();
                const fileType = String(d?.fileType || '').trim();
                const dataUrl = typeof d?.dataUrl === 'string' ? d.dataUrl : undefined;
                const inferredType = fileType === 'pdf' ? 'pdf' : 'image';
                return {
                    id: String(d?.id || Date.now()),
                    name: title || fileName || 'مستند',
                    type: inferredType,
                    folderId,
                    createdAt: uploadDate || new Date().toISOString(),
                    dataUrl,
                    originalFileName: fileName || undefined,
                } satisfies Document;
            })
            .filter(Boolean);

        try {
            SecureStoreService.setItemSync(foldersStorageKey, JSON.stringify(ensuredFolders));
            SecureStoreService.setItemSync(documentsStorageKey, JSON.stringify(docs));
        } catch {
            /* ignore */
        }

        return { docs, folders: ensuredFolders };
    };

    const initial = loadVault();
    const [folders] = useState<Folder[]>(initial.folders);
    const [documents, setDocuments] = useState<Document[]>(initial.docs);
    
    const [showUploadForm, setShowUploadForm] = useState(false);
    const activeFolderId = 'all';
    const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'name_asc'>('newest');
    const [filterType, setFilterType] = useState<'all' | 'image' | 'pdf'>('all');

    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingName, setPendingName] = useState<string>('');
    const [pendingSource, setPendingSource] = useState<'upload' | 'camera'>('upload');
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string>('');
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [renameDocId, setRenameDocId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState<string>('');
    const [previewDocId, setPreviewDocId] = useState<string | null>(null);
    const previewDocument = useMemo(
        () => documents.find((doc) => doc.id === previewDocId) ?? null,
        [documents, previewDocId],
    );

    /** Blob + ObjectURL للمعاينة — يُنشأ عند الفتح ويُلغى (revoke) حتماً عند الإغلاق/التبديل */
    const [previewObject, setPreviewObject] = useState<{ blob: Blob; url: string } | null>(null);
    useEffect(() => {
        const dataUrl = previewDocument?.dataUrl;
        if (!dataUrl) {
            setPreviewObject(null);
            return;
        }
        const blob = dataUrlToBlob(dataUrl);
        if (!blob) {
            setPreviewObject(null);
            return;
        }
        const url = URL.createObjectURL(blob);
        setPreviewObject({ blob, url });
        return () => {
            URL.revokeObjectURL(url);
            setPreviewObject(null);
        };
    }, [previewDocument]);

    const suggestName = (fileName: string): string => {
        const base = String(fileName || '').trim();
        if (!base) return 'مستند';
        return base.replace(/\.[^.]+$/, '').trim() || 'مستند';
    };

    const readFileAsDataUrl = (file: Blob): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('read failed'));
            reader.readAsDataURL(file);
        });

    const persist = (nextDocs: Document[], nextFolders: Folder[]) => {
        try {
            SecureStoreService.setItemSync(documentsStorageKey, JSON.stringify(nextDocs));
        } catch {
            /* ignore */
        }
        try {
            SecureStoreService.setItemSync(foldersStorageKey, JSON.stringify(nextFolders));
        } catch {
            /* ignore */
        }
    };

    const startPendingSave = async (file: File, source: 'upload' | 'camera') => {
        setPendingFile(file);
        setPendingSource(source);
        setPendingName(suggestName(file.name));
        const isImage = file.type.startsWith('image/');
        if (isImage) {
            try {
                const dataUrl = await readFileAsDataUrl(file);
                setPendingPreviewUrl(dataUrl);
            } catch {
                setPendingPreviewUrl('');
            }
        } else {
            setPendingPreviewUrl('');
        }
        setShowSaveModal(true);
    };

    const handleUploadFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        void startPendingSave(file, 'upload');
        e.target.value = '';
    };

    const handleCameraCaptureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        void loadPrivacyScreenSession().then((m) => m.endPrivacySensitiveSurface());
        if (!file) return;
        void startPendingSave(file, 'camera');
    };

    const openCameraCapture = () => {
        void loadPrivacyScreenSession().then((m) =>
            m.beginPrivacySensitiveSurface().then(() => {
                document.getElementById('vault-camera-input')?.click();
            }),
        );
    };

    const confirmSave = async () => {
        if (!pendingFile) return;
        const nameTrim = pendingName.trim();
        if (!nameTrim) {
            SmartToast.error('يرجى إدخال اسم المستند');
            return;
        }
        setIsSaving(true);
        try {
            const createdAt = new Date().toISOString();
            const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
            const isImage = pendingFile.type.startsWith('image/');
            const finalType: 'image' | 'pdf' = isImage ? 'image' : 'pdf';
            const dataUrl = await readFileAsDataUrl(pendingFile);

            const nextDoc: Document = {
                id,
                name: nameTrim,
                type: finalType,
                folderId: 'default',
                createdAt,
                dataUrl,
                originalFileName: pendingFile.name,
                source: pendingSource,
            };

            const updatedDocs = [nextDoc, ...documents];
            setDocuments(updatedDocs);
            persist(updatedDocs, folders);

            onDocumentUploaded?.({
                title: nextDoc.name,
                category: folders.find((f) => f.id === nextDoc.folderId)?.name || 'عام',
                fileName: nextDoc.originalFileName || nextDoc.name,
                documentId: nextDoc.id,
            });

            setShowSaveModal(false);
            setPendingFile(null);
            setPendingName('');
            setPendingPreviewUrl('');
        } catch {
            SmartToast.error('تعذر حفظ المستند. حاول مرة أخرى.');
        } finally {
            setIsSaving(false);
        }
    };

    const visibleDocuments = useMemo(() => {
        const withinFolder =
            activeFolderId === 'all' ? documents : documents.filter((d) => d.folderId === activeFolderId);
        const typed =
            filterType === 'all' ? withinFolder : withinFolder.filter((d) => d.type === filterType);
        const sorted = [...typed];
        if (sortMode === 'name_asc') sorted.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
        else if (sortMode === 'oldest') sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        else sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return sorted;
    }, [activeFolderId, documents, filterType, sortMode]);

    const activeFolderName = useMemo(() => {
        if (activeFolderId === 'all') return 'الكل';
        return folders.find((f) => f.id === activeFolderId)?.name || 'عام';
    }, [activeFolderId, folders]);

    useEffect(() => {
        if (previewDocument?.type === 'pdf') {
            prefetchVaultPdfViewerSurface();
        }
    }, [previewDocument]);

    const handleRename = (docId: string) => {
        const d = documents.find((x) => x.id === docId);
        if (!d) return;
        setRenameDocId(docId);
        setRenameValue(d.name);
    };

    const confirmRename = () => {
        if (!renameDocId) return;
        const v = renameValue.trim();
        if (!v) return;
        const updatedDocs = documents.map((d) => (d.id === renameDocId ? { ...d, name: v } : d));
        setDocuments(updatedDocs);
        persist(updatedDocs, folders);
        setRenameDocId(null);
        setRenameValue('');
    };

    const handleDeleteDocument = (docId: string) => {
        const target = documents.find((d) => d.id === docId);
        if (!target) return;
        const updatedDocs = documents.filter((d) => d.id !== docId);
        setDocuments(updatedDocs);
        persist(updatedDocs, folders);
        if (previewDocId === docId) setPreviewDocId(null);
        if (renameDocId === docId) {
            setRenameDocId(null);
            setRenameValue('');
        }
        SmartToast.success(`تم حذف «${target.name}»`);
    };

    const getFileIcon = (type: string) => {
        switch (type) {
            case 'image': return <Image size={20} className="text-blue-400" />;
            case 'pdf': return <FileText size={20} className="text-rose-400" />;
            default: return <File size={20} className="text-gray-400" />;
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/90 z-[110] flex items-center justify-center p-4" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#0B1120] border-2 border-cyan-500/40 rounded-3xl w-[95%] md:w-[600px] max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                data-testid="document-vault-modal"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="border-b border-cyan-500/30 p-4 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-all hover:bg-cyan-500/20 touch-manipulation"
                        aria-label="إغلاق الخزينة"
                    >
                        <X size={20} className="text-white" />
                    </button>
                    <h2 className="text-cyan-400 font-bold text-lg">خزينة المستندات</h2>
                </div>
                
                <div className="p-3 border-b border-slate-700/30 space-y-3">
                    <button type="button"
                        onClick={() => setShowUploadForm(!showUploadForm)}
                        className="mx-auto flex min-h-[44px] w-full max-w-md items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-500 hover:to-blue-500 touch-manipulation"
                    >
                        إضافة مستند
                    </button>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <div className="flex items-center gap-2">
                            <select
                                value={sortMode}
                                onChange={(e) => {
                                    const nextValue = e.target.value;
                                    if (isDocumentSortMode(nextValue)) {
                                        setSortMode(nextValue);
                                    }
                                }}
                                className="min-h-[44px] bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2 text-white text-[11px] font-bold touch-manipulation"
                                dir="rtl"
                            >
                                <option value="newest">الأحدث</option>
                                <option value="oldest">الأقدم</option>
                                <option value="name_asc">الاسم أ-ي</option>
                            </select>
                            <select
                                value={filterType}
                                onChange={(e) => {
                                    const nextValue = e.target.value;
                                    if (isDocumentFilterType(nextValue)) {
                                        setFilterType(nextValue);
                                    }
                                }}
                                className="min-h-[44px] bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2 text-white text-[11px] font-bold touch-manipulation"
                                dir="rtl"
                            >
                                <option value="all">الكل</option>
                                <option value="image">صور فقط</option>
                                <option value="pdf">PDF فقط</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <AnimatePresence>
                    {showUploadForm && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-b border-slate-700/30"
                        >
                            <div className="p-4 space-y-3 bg-slate-900/30">
                                <input
                                    id="vault-upload-input"
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={handleUploadFileSelect}
                                    className="hidden"
                                />
                                <input
                                    id="vault-camera-input"
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleCameraCaptureSelect}
                                    className="hidden"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label
                                        htmlFor="vault-upload-input"
                                        className="cursor-pointer flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/40 px-4 py-3 text-sm font-bold text-white transition-all touch-manipulation"
                                    >
                                        رفع من الجهاز
                                    </label>
                                    <button
                                        type="button"
                                        onClick={openCameraCapture}
                                        className="cursor-pointer flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/40 px-4 py-3 text-sm font-bold text-white transition-all w-full touch-manipulation"
                                    >
                                        التقاط بالكاميرا
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* Documents List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {visibleDocuments.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText size={48} className="text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">لا توجد مستندات بعد</p>
                            <p className="text-gray-600 text-xs mt-1">المجلد: {activeFolderName}</p>
                        </div>
                    ) : (
                        visibleDocuments.map((doc) => (
                            <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="backdrop-blur-xl bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 flex items-center gap-3 cursor-pointer"
                                onClick={() => setPreviewDocId(doc.id)}
                            >
                                <div className="w-12 h-12 bg-slate-900/60 rounded-lg flex items-center justify-center flex-shrink-0">
                                    {doc.type === 'image' && doc.dataUrl ? (
                                        <img src={doc.dataUrl} alt={doc.name} className="w-full h-full object-cover rounded-lg" />
                                    ) : (
                                        getFileIcon(doc.type)
                                    )}
                                </div>
                                
                                <div className="flex-1 text-right min-w-0">
                                    <p className="text-white font-semibold text-sm truncate">{doc.name}</p>
                                    <p className="text-gray-400 text-xs truncate">
                                        {folders.find((f) => f.id === doc.folderId)?.name || 'عام'}
                                    </p>
                                    <div className="flex items-center justify-end gap-2 mt-1">
                                        <span className="text-gray-500 text-[10px]">
                                            {new Date(doc.createdAt).toLocaleDateString('ar-EG')}
                                        </span>
                                        <Calendar size={10} className="text-gray-500" />
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        onClick={() => handleRename(doc.id)}
                                        className="min-h-[44px] px-3 py-2 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/40 rounded-lg transition-all text-[11px] font-bold text-white touch-manipulation"
                                        title="إعادة تسمية"
                                    >
                                        تسمية
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteDocument(doc.id)}
                                        className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-[11px] font-bold text-rose-200 transition-all hover:bg-rose-950/50 touch-manipulation"
                                        title="حذف المستند"
                                    >
                                        <Trash2 size={13} />
                                        حذف
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                <AnimatePresence>
                    {showSaveModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4"
                            onClick={() => !isSaving && setShowSaveModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.96, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.96, opacity: 0 }}
                                className="bg-[#0B1120] border-2 border-cyan-500/40 rounded-3xl w-[95%] md:w-[600px] max-w-lg max-h-[90vh] overflow-y-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="border-b border-cyan-500/30 p-4 flex justify-between items-center">
                                    <button type="button"
                                        onClick={() => !isSaving && setShowSaveModal(false)}
                                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-all hover:bg-cyan-500/20 touch-manipulation"
                                        aria-label="إغلاق"
                                    >
                                        <X size={20} className="text-white" />
                                    </button>
                                    <h3 className="text-cyan-400 font-bold text-sm">حفظ المستند</h3>
                                </div>

                                <div className="p-4 space-y-3 bg-slate-900/30">
                                    <div>
                                        <label className="text-xs font-bold text-cyan-400 mb-2 block">اسم المستند *</label>
                                        <input
                                            type="text"
                                            value={pendingName}
                                            onChange={(e) => setPendingName(e.target.value)}
                                            className="w-full min-h-[44px] bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-right"
                                            dir="rtl"
                                        />
                                    </div>

                                    {pendingPreviewUrl ? (
                                        <div className="border border-slate-700/50 rounded-xl p-2">
                                            <img src={pendingPreviewUrl} alt="Preview" className="w-full h-32 object-contain" />
                                        </div>
                                    ) : null}

                                    <button type="button"
                                        onClick={() => void confirmSave()}
                                        disabled={isSaving}
                                        className="w-full min-h-[44px] bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 touch-manipulation"
                                    >
                                        حفظ
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {renameDocId && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4"
                            onClick={() => setRenameDocId(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.96, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.96, opacity: 0 }}
                                className="bg-[#0B1120] border-2 border-cyan-500/40 rounded-3xl w-[95%] md:w-[600px] max-w-lg max-h-[90vh] overflow-y-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="border-b border-cyan-500/30 p-4 flex justify-between items-center">
                                    <button
                                        type="button"
                                        onClick={() => setRenameDocId(null)}
                                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-all hover:bg-cyan-500/20 touch-manipulation"
                                        aria-label="إغلاق"
                                    >
                                        <X size={20} className="text-white" />
                                    </button>
                                    <h3 className="text-cyan-400 font-bold text-sm">إعادة تسمية</h3>
                                </div>
                                <div className="p-4 space-y-3 bg-slate-900/30">
                                    <input
                                        type="text"
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        className="w-full min-h-[44px] bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-right"
                                        dir="rtl"
                                    />
                                    <button
                                        type="button"
                                        onClick={confirmRename}
                                        className="w-full min-h-[44px] bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/30 touch-manipulation"
                                    >
                                        حفظ
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {previewDocId ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-4"
                            onClick={() => setPreviewDocId(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.98, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.98, opacity: 0 }}
                                className="bg-[#0B1120] border-2 border-cyan-500/40 rounded-3xl w-[95%] max-w-5xl h-[85vh] max-h-[90vh] overflow-hidden flex flex-col"
                                data-testid="document-vault-preview"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="border-b border-cyan-500/30 p-4 flex justify-between items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setPreviewDocId(null)}
                                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-all hover:bg-cyan-500/20 touch-manipulation"
                                            aria-label="إغلاق المعاينة"
                                        >
                                            <X size={20} className="text-white" />
                                        </button>
                                        {previewDocId ? (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteDocument(previewDocId)}
                                                className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-950/30 px-2.5 py-1.5 text-[11px] font-bold text-rose-200 hover:bg-rose-950/50 touch-manipulation"
                                                title="حذف المستند"
                                            >
                                                <Trash2 size={14} />
                                                حذف
                                            </button>
                                        ) : null}
                                    </div>
                                    <h3 className="min-w-0 truncate text-cyan-400 font-bold text-sm">
                                        {previewDocument?.name || 'معاينة'}
                                    </h3>
                                </div>
                                <div className="flex-1 overflow-hidden p-3">
                                    {(() => {
                                        const d = previewDocument;
                                        if (!d || !d.dataUrl) return null;
                                        if (d.type === 'pdf') {
                                            return (
                                                <div className="w-full h-full rounded-2xl border border-white/10 bg-[#16111B] p-2">
                                                    {/* التقريب بقرصة اللمس أو Ctrl+عجلة — العجلة العادية تبقى لتمرير الصفحات */}
                                                    <ZoomableContainer
                                                        key={d.id}
                                                        wheelZoom="modifier"
                                                        nativeVerticalScroll
                                                        showControls
                                                    >
                                                        <VaultPdfViewerSurfaceLazy
                                                            source={previewObject?.blob ?? d.dataUrl}
                                                            title={d.name}
                                                            openUrl={previewObject?.url}
                                                            fallbackClassName="flex h-full items-center justify-center text-sm text-white/45"
                                                        />
                                                    </ZoomableContainer>
                                                </div>
                                            );
                                        }
                                        return (
                                            <ZoomableContainer key={d.id} wheelZoom="plain">
                                                <img
                                                    src={previewObject?.url ?? d.dataUrl}
                                                    alt={d.name}
                                                    draggable={false}
                                                    className="w-full h-full min-h-0 select-none object-contain rounded-2xl border border-white/10 bg-black"
                                                />
                                            </ZoomableContainer>
                                        );
                                    })()}
                                </div>
                            </motion.div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>

            </motion.div>
        </div>
    );
};
