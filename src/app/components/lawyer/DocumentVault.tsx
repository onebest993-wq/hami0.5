import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Image, File, Calendar } from 'lucide-react';
import { executionDocumentFoldersStorageKey, executionDocumentsStorageKey } from '@/app/utils/executionStorageKeys';
import SecureStoreService from '@/app/services/SecureStoreService';
import { SmartToast } from '@/app/components/ui/SmartToast';

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

interface DocumentVaultProps {
    executionId: string;
    onClose: () => void;
    onDocumentUploaded?: (info: { title: string; category: string; fileName: string }) => void;
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

        let rawDocs: any[] = [];
        try {
            const storedDocs = SecureStoreService.getItemSync(documentsStorageKey);
            if (storedDocs) {
                const parsed = JSON.parse(storedDocs);
                if (Array.isArray(parsed)) rawDocs = parsed;
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
    const [folders, setFolders] = useState<Folder[]>(initial.folders);
    const [documents, setDocuments] = useState<Document[]>(initial.docs);
    
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [activeFolderId, setActiveFolderId] = useState<string>('all');
    const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'name_asc'>('newest');
    const [filterType, setFilterType] = useState<'all' | 'image' | 'pdf'>('all');

    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingName, setPendingName] = useState<string>('');
    const [pendingFolderId, setPendingFolderId] = useState<string>('default');
    const [pendingSaveAs, setPendingSaveAs] = useState<'image' | 'pdf'>('image');
    const [pendingSource, setPendingSource] = useState<'upload' | 'camera'>('upload');
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string>('');
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [renameDocId, setRenameDocId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState<string>('');
    const [moveDocId, setMoveDocId] = useState<string | null>(null);
    const [moveFolderTarget, setMoveFolderTarget] = useState<string>('default');
    const [previewDocId, setPreviewDocId] = useState<string | null>(null);
    const [createFolderOpen, setCreateFolderOpen] = useState(false);
    const [createFolderName, setCreateFolderName] = useState('');

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

    const makePdfFromImageDataUrl = async (imageDataUrl: string): Promise<string> => {
        const { jsPDF } = await import('jspdf');
        const img = new window.Image();
        const loaded = new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('image load failed'));
        });
        img.src = imageDataUrl;
        await loaded;
        const pdf = new jsPDF({
            orientation: img.width >= img.height ? 'l' : 'p',
            unit: 'px',
            format: [img.width, img.height],
        });
        pdf.addImage(imageDataUrl, 'JPEG', 0, 0, img.width, img.height);
        const blob = pdf.output('blob');
        return await readFileAsDataUrl(blob);
    };

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

    const handleCreateFolder = () => {
        setCreateFolderName('');
        setCreateFolderOpen(true);
    };

    const confirmCreateFolder = () => {
        const t = String(createFolderName || '').trim();
        if (!t) return;
        if (folders.some((f) => f.name === t)) return;
        const next: Folder = { id: `folder_${Date.now()}`, name: t, createdAt: new Date().toISOString() };
        const updated = [...folders, next];
        setFolders(updated);
        persist(documents, updated);
        setActiveFolderId(next.id);
        setCreateFolderOpen(false);
        setCreateFolderName('');
    };

    const startPendingSave = async (file: File, source: 'upload' | 'camera') => {
        setPendingFile(file);
        setPendingSource(source);
        setPendingName(suggestName(file.name));
        setPendingFolderId(activeFolderId === 'all' ? 'default' : activeFolderId);
        const isImage = file.type.startsWith('image/');
        setPendingSaveAs(isImage ? 'image' : 'pdf');
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
        if (!file) return;
        void startPendingSave(file, 'camera');
        e.target.value = '';
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
            let finalType: 'image' | 'pdf' = isImage ? pendingSaveAs : 'pdf';
            let dataUrl = '';
            if (finalType === 'image') {
                dataUrl = await readFileAsDataUrl(pendingFile);
            } else {
                if (isImage) {
                    const imgDataUrl = pendingPreviewUrl || (await readFileAsDataUrl(pendingFile));
                    dataUrl = await makePdfFromImageDataUrl(imgDataUrl);
                } else {
                    dataUrl = await readFileAsDataUrl(pendingFile);
                }
            }

            const nextDoc: Document = {
                id,
                name: nameTrim,
                type: finalType,
                folderId: pendingFolderId || 'default',
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

    const handleMove = (docId: string) => {
        const d = documents.find((x) => x.id === docId);
        if (!d) return;
        setMoveDocId(docId);
        setMoveFolderTarget(d.folderId || 'default');
    };

    const confirmMove = () => {
        if (!moveDocId) return;
        const updatedDocs = documents.map((d) => (d.id === moveDocId ? { ...d, folderId: moveFolderTarget } : d));
        setDocuments(updatedDocs);
        persist(updatedDocs, folders);
        setMoveDocId(null);
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
                className="bg-[#0B1120] border-2 border-cyan-500/40 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="border-b border-cyan-500/30 p-4 flex justify-between items-center">
                    <button type="button" onClick={onClose} className="p-2 hover:bg-cyan-500/20 rounded-lg transition-all">
                        <X size={20} className="text-white" />
                    </button>
                    <h2 className="text-cyan-400 font-bold text-lg">خزينة المستندات</h2>
                </div>
                
                <div className="p-3 border-b border-slate-700/30 space-y-3">
                    <button type="button"
                        onClick={() => setShowUploadForm(!showUploadForm)}
                        className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-500 hover:to-blue-500"
                    >
                        إضافة مستند
                    </button>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCreateFolder();
                                }}
                                className="px-3 py-2 bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/40 rounded-lg transition-all text-[11px] font-bold text-white"
                            >
                                مجلد جديد
                            </button>
                            <select
                                value={activeFolderId}
                                onChange={(e) => setActiveFolderId(e.target.value)}
                                className="bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2 text-white text-[11px] font-bold"
                                dir="rtl"
                            >
                                <option value="all">الكل</option>
                                {folders.map((f) => (
                                    <option key={f.id} value={f.id}>
                                        {f.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <select
                                value={sortMode}
                                onChange={(e) => setSortMode(e.target.value as any)}
                                className="bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2 text-white text-[11px] font-bold"
                                dir="rtl"
                            >
                                <option value="newest">الأحدث</option>
                                <option value="oldest">الأقدم</option>
                                <option value="name_asc">الاسم أ-ي</option>
                            </select>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as any)}
                                className="bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2 text-white text-[11px] font-bold"
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
                                        className="cursor-pointer flex items-center justify-center gap-2 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/40 px-4 py-3 text-sm font-bold text-white transition-all"
                                    >
                                        رفع من الجهاز
                                    </label>
                                    <label
                                        htmlFor="vault-camera-input"
                                        className="cursor-pointer flex items-center justify-center gap-2 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/40 px-4 py-3 text-sm font-bold text-white transition-all"
                                    >
                                        التقاط بالكاميرا
                                    </label>
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
                                        onClick={() => handleMove(doc.id)}
                                        className="px-3 py-2 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/40 rounded-lg transition-all text-[11px] font-bold text-white"
                                        title="نقل"
                                    >
                                        نقل
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRename(doc.id)}
                                        className="px-3 py-2 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/40 rounded-lg transition-all text-[11px] font-bold text-white"
                                        title="إعادة تسمية"
                                    >
                                        تسمية
                                    </button>
                                    {doc.dataUrl ? (
                                        <a
                                            href={doc.dataUrl}
                                            download={doc.originalFileName || doc.name}
                                            className="px-3 py-2 bg-cyan-600/15 hover:bg-cyan-600/25 border border-cyan-500/25 rounded-lg transition-all text-[11px] font-bold text-cyan-100"
                                            title="تحميل"
                                        >
                                            تحميل
                                        </a>
                                    ) : null}
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
                                className="bg-[#0B1120] border-2 border-cyan-500/40 rounded-3xl w-full max-w-lg overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="border-b border-cyan-500/30 p-4 flex justify-between items-center">
                                    <button type="button"
                                        onClick={() => !isSaving && setShowSaveModal(false)}
                                        className="p-2 hover:bg-cyan-500/20 rounded-lg transition-all"
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
                                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-right"
                                            dir="rtl"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-cyan-400 mb-2 block">المجلد</label>
                                        <select
                                            value={pendingFolderId}
                                            onChange={(e) => setPendingFolderId(e.target.value)}
                                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-right"
                                            dir="rtl"
                                        >
                                            {folders.map((f) => (
                                                <option key={f.id} value={f.id}>
                                                    {f.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {pendingFile?.type?.startsWith('image/') ? (
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-cyan-400 block">كيف تريد حفظه؟</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setPendingSaveAs('image')}
                                                    className={`rounded-xl border px-3 py-2 text-[11px] font-black transition-all ${
                                                        pendingSaveAs === 'image'
                                                            ? 'border-white/15 bg-white/10 text-white'
                                                            : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                                                    }`}
                                                >
                                                    كصورة
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setPendingSaveAs('pdf')}
                                                    className={`rounded-xl border px-3 py-2 text-[11px] font-black transition-all ${
                                                        pendingSaveAs === 'pdf'
                                                            ? 'border-white/15 bg-white/10 text-white'
                                                            : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                                                    }`}
                                                >
                                                    PDF
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}

                                    {pendingPreviewUrl ? (
                                        <div className="border border-slate-700/50 rounded-xl p-2">
                                            <img src={pendingPreviewUrl} alt="Preview" className="w-full h-32 object-contain" />
                                        </div>
                                    ) : null}

                                    <button type="button"
                                        onClick={() => void confirmSave()}
                                        disabled={isSaving}
                                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50"
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
                                className="bg-[#0B1120] border-2 border-cyan-500/40 rounded-3xl w-full max-w-lg overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="border-b border-cyan-500/30 p-4 flex justify-between items-center">
                                    <button type="button" onClick={() => setRenameDocId(null)} className="p-2 hover:bg-cyan-500/20 rounded-lg transition-all">
                                        <X size={20} className="text-white" />
                                    </button>
                                    <h3 className="text-cyan-400 font-bold text-sm">إعادة تسمية</h3>
                                </div>
                                <div className="p-4 space-y-3 bg-slate-900/30">
                                    <input
                                        type="text"
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-right"
                                        dir="rtl"
                                    />
                                    <button
                                        type="button"
                                        onClick={confirmRename}
                                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/30"
                                    >
                                        حفظ
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {moveDocId && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4"
                            onClick={() => setMoveDocId(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.96, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.96, opacity: 0 }}
                                className="bg-[#0B1120] border-2 border-cyan-500/40 rounded-3xl w-full max-w-lg overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="border-b border-cyan-500/30 p-4 flex justify-between items-center">
                                    <button type="button" onClick={() => setMoveDocId(null)} className="p-2 hover:bg-cyan-500/20 rounded-lg transition-all">
                                        <X size={20} className="text-white" />
                                    </button>
                                    <h3 className="text-cyan-400 font-bold text-sm">نقل إلى مجلد</h3>
                                </div>
                                <div className="p-4 space-y-3 bg-slate-900/30">
                                    <select
                                        value={moveFolderTarget}
                                        onChange={(e) => setMoveFolderTarget(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-right"
                                        dir="rtl"
                                    >
                                        {folders.map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={confirmMove}
                                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/30"
                                    >
                                        نقل
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
                                className="bg-[#0B1120] border-2 border-cyan-500/40 rounded-3xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="border-b border-cyan-500/30 p-4 flex justify-between items-center">
                                    <button type="button" onClick={() => setPreviewDocId(null)} className="p-2 hover:bg-cyan-500/20 rounded-lg transition-all">
                                        <X size={20} className="text-white" />
                                    </button>
                                    <h3 className="text-cyan-400 font-bold text-sm">
                                        {documents.find((d) => d.id === previewDocId)?.name || 'معاينة'}
                                    </h3>
                                </div>
                                <div className="flex-1 overflow-hidden p-3">
                                    {(() => {
                                        const d = documents.find((x) => x.id === previewDocId);
                                        if (!d || !d.dataUrl) return null;
                                        if (d.type === 'pdf') {
                                            return (
                                                <iframe
                                                    src={d.dataUrl}
                                                    className="w-full h-full rounded-2xl border border-white/10 bg-black"
                                                />
                                            );
                                        }
                                        return (
                                            <img
                                                src={d.dataUrl}
                                                className="w-full h-full object-contain rounded-2xl border border-white/10 bg-black"
                                            />
                                        );
                                    })()}
                                </div>
                            </motion.div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>

                <AnimatePresence>
                    {createFolderOpen ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4"
                            onClick={() => setCreateFolderOpen(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.96, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.96, opacity: 0 }}
                                className="bg-[#0B1120] border-2 border-cyan-500/40 rounded-3xl w-full max-w-lg overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="border-b border-cyan-500/30 p-4 flex justify-between items-center">
                                    <button type="button"
                                        onClick={() => setCreateFolderOpen(false)}
                                        className="p-2 hover:bg-cyan-500/20 rounded-lg transition-all"
                                    >
                                        <X size={20} className="text-white" />
                                    </button>
                                    <h3 className="text-cyan-400 font-bold text-sm">مجلد جديد</h3>
                                </div>
                                <div className="p-4 space-y-3 bg-slate-900/30">
                                    <div>
                                        <label className="text-xs font-bold text-cyan-400 mb-2 block">اسم المجلد</label>
                                        <input
                                            type="text"
                                            value={createFolderName}
                                            onChange={(e) => setCreateFolderName(e.target.value)}
                                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-right"
                                            dir="rtl"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={confirmCreateFolder}
                                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/30"
                                    >
                                        إنشاء
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
