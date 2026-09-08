import React, { useEffect, useMemo, useState } from 'react';
import { X } from '@/app/components/ui/icons/X';
import { FileText } from '@/app/components/ui/icons/FileText';
import { Image } from '@/app/components/ui/icons/Image';
import { File } from '@/app/components/ui/icons/File';
import { Calendar } from '@/app/components/ui/icons/Calendar';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { executionDocumentFoldersStorageKey, executionDocumentsStorageKey } from '@/app/utils/executionStorageKeys';
import SecureStoreService from '@/app/services/SecureStoreService';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    prefetchVaultPdfJsViewer,
    VaultPdfJsViewerLazy,
} from '@/app/components/lawyer/SmartVaultModal/VaultPdfJsViewerLazy';
import { ZoomableContainer } from '@/app/components/shared/ZoomableContainer';
import {
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_OVERLAY_FIELD,
    EXEC_OVERLAY_HEADER,
    EXEC_OVERLAY_NESTED_BACKDROP,
    EXEC_OVERLAY_PHONE_BACKDROP,
    EXEC_OVERLAY_PHONE_SHEET_WIDE,
    EXEC_OVERLAY_PRIMARY_BTN,
    EXEC_OVERLAY_TITLE,
} from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';

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

    const makeDefaultFolder = (): Folder => ({
        id: 'default',
        name: 'عام',
        createdAt: new Date().toISOString(),
    });

    const parseVault = (
        docsRaw: string | null,
        foldersRaw: string | null,
    ): { docs: Document[]; folders: Folder[]; needsLegacyMigrate: boolean } => {
        let folders: Folder[] = [makeDefaultFolder()];
        try {
            if (foldersRaw) {
                const parsed = JSON.parse(foldersRaw);
                if (Array.isArray(parsed)) folders = parsed;
            }
        } catch {
            /* ignore */
        }
        if (!folders.some((f) => f.id === 'default')) folders = [makeDefaultFolder(), ...folders];

        let rawDocs: LegacyStoredDocument[] = [];
        try {
            if (docsRaw) {
                const parsed = JSON.parse(docsRaw);
                if (Array.isArray(parsed)) rawDocs = parsed as LegacyStoredDocument[];
            }
        } catch {
            /* ignore */
        }

        const looksNew = rawDocs.every(
            (d) => d && typeof d === 'object' && 'folderId' in d && 'createdAt' in d && 'type' in d,
        );
        if (looksNew) return { docs: rawDocs as Document[], folders, needsLegacyMigrate: false };

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

        return { docs, folders: ensuredFolders, needsLegacyMigrate: rawDocs.length > 0 };
    };

    const readVaultSync = (): { docs: Document[]; folders: Folder[] } => {
        if (
            SecureStoreService.isUnreadSync(documentsStorageKey) ||
            SecureStoreService.isUnreadSync(foldersStorageKey)
        ) {
            return { docs: [], folders: [makeDefaultFolder()] };
        }
        const parsed = parseVault(
            SecureStoreService.getItemSync(documentsStorageKey),
            SecureStoreService.getItemSync(foldersStorageKey),
        );
        return { docs: parsed.docs, folders: parsed.folders };
    };

    const initial = readVaultSync();
    const [folders, setFolders] = useState<Folder[]>(initial.folders);
    const [documents, setDocuments] = useState<Document[]>(initial.docs);
    const [vaultHydrated, setVaultHydrated] = useState(
        () =>
            !SecureStoreService.isUnreadSync(documentsStorageKey) &&
            !SecureStoreService.isUnreadSync(foldersStorageKey),
    );

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                await SecureStoreService.ensurePersistedReady();
                const [docsRaw, foldersRaw] = await Promise.all([
                    SecureStoreService.getItem(documentsStorageKey),
                    SecureStoreService.getItem(foldersStorageKey),
                ]);
                if (cancelled) return;
                const parsed = parseVault(docsRaw, foldersRaw);
                setDocuments(parsed.docs);
                setFolders(parsed.folders);
                if (parsed.needsLegacyMigrate) {
                    await SecureStoreService.setItem(foldersStorageKey, JSON.stringify(parsed.folders));
                    await SecureStoreService.setItem(documentsStorageKey, JSON.stringify(parsed.docs));
                    await SecureStoreService.waitForPendingSetItem(documentsStorageKey);
                }
            } catch {
                /* keep sync snapshot */
            } finally {
                if (!cancelled) setVaultHydrated(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [documentsStorageKey, foldersStorageKey]);
    
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

    const persist = async (nextDocs: Document[], nextFolders: Folder[]): Promise<boolean> => {
        try {
            await SecureStoreService.ensurePersistedReady();
            if (
                SecureStoreService.isUnreadSync(documentsStorageKey) &&
                nextDocs.length === 0
            ) {
                return false;
            }
            await SecureStoreService.setItem(documentsStorageKey, JSON.stringify(nextDocs));
            await SecureStoreService.setItem(foldersStorageKey, JSON.stringify(nextFolders));
            await SecureStoreService.waitForPendingSetItem(documentsStorageKey);
            await SecureStoreService.waitForPendingSetItem(foldersStorageKey);
            return true;
        } catch {
            return false;
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
            const ok = await persist(updatedDocs, folders);
            if (!ok) {
                SmartToast.error('تعذر حفظ المستند على الجهاز. حاول مرة أخرى.');
                return;
            }
            setDocuments(updatedDocs);

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
            prefetchVaultPdfJsViewer();
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
        void persist(updatedDocs, folders).then((ok) => {
            if (!ok) SmartToast.error('تعذر حفظ إعادة التسمية.');
        });
        setRenameDocId(null);
        setRenameValue('');
    };

    const handleDeleteDocument = (docId: string) => {
        const target = documents.find((d) => d.id === docId);
        if (!target) return;
        const updatedDocs = documents.filter((d) => d.id !== docId);
        setDocuments(updatedDocs);
        void persist(updatedDocs, folders).then((ok) => {
            if (!ok) {
                SmartToast.error('تعذر حذف المستند من التخزين.');
                return;
            }
            SmartToast.success(`تم حذف «${target.name}»`);
        });
        if (previewDocId === docId) setPreviewDocId(null);
        if (renameDocId === docId) {
            setRenameDocId(null);
            setRenameValue('');
        }
    };

    const getFileIcon = (type: string) => {
        switch (type) {
            case 'image': return <Image size={20} className="text-slate-300" />;
            case 'pdf': return <FileText size={20} className="text-slate-300" />;
            default: return <File size={20} className="text-slate-500" />;
        }
    };

    const selectClass = `${EXEC_OVERLAY_FIELD} min-h-[44px] text-[11px] font-bold`;
    const idleAction =
        'flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-transparent px-4 py-2.5 text-sm font-bold text-slate-200 transition-colors hover:bg-white/[0.06] touch-manipulation';
    
    return (
        <div
            className={`${EXEC_OVERLAY_PHONE_BACKDROP} z-[110]`}
            onClick={onClose}
        >
            <div
                className={EXEC_OVERLAY_PHONE_SHEET_WIDE}
                data-testid="document-vault-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={EXEC_OVERLAY_HEADER}>
                    <h2 className={EXEC_OVERLAY_TITLE}>خزينة المستندات</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className={EXEC_MODAL_CLOSE_BTN_CLASS}
                        aria-label="إغلاق الخزينة"
                    >
                        <X size={22} />
                    </button>
                </div>
                
                <div className="space-y-2 border-b border-white/10 px-3 py-2">
                    <button
                        type="button"
                        onClick={() => setShowUploadForm(!showUploadForm)}
                        className={`${EXEC_OVERLAY_PRIMARY_BTN} w-full`}
                    >
                        إضافة مستند
                    </button>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <select
                            value={sortMode}
                            onChange={(e) => {
                                const nextValue = e.target.value;
                                if (isDocumentSortMode(nextValue)) {
                                    setSortMode(nextValue);
                                }
                            }}
                            className={selectClass}
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
                            className={selectClass}
                            dir="rtl"
                        >
                            <option value="all">الكل</option>
                            <option value="image">صور فقط</option>
                            <option value="pdf">PDF فقط</option>
                        </select>
                    </div>
                </div>
                
                {showUploadForm ? (
                    <div className="border-b border-white/10 px-3 py-2">
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
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <label htmlFor="vault-upload-input" className={idleAction}>
                                رفع من الجهاز
                            </label>
                            <button type="button" onClick={openCameraCapture} className={`${idleAction} w-full`}>
                                التقاط بالكاميرا
                            </button>
                        </div>
                    </div>
                ) : null}
                
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-2">
                    {visibleDocuments.length === 0 ? (
                        <div className="py-10 text-center">
                            <FileText size={28} className="mx-auto mb-2 text-slate-600" />
                            <p className="text-sm text-slate-500">
                                {vaultHydrated ? 'لا توجد مستندات بعد' : 'جاري استعادة المستندات…'}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">المجلد: {activeFolderName}</p>
                        </div>
                    ) : (
                        visibleDocuments.map((doc) => (
                            <button
                                key={doc.id}
                                type="button"
                                className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] px-2.5 py-2 w-full text-right"
                                onClick={() => setPreviewDocId(doc.id)}
                                style={{ appearance: 'none', background: 'transparent', borderStyle: 'solid', padding: '10px', margin: '0', font: 'inherit', color: 'inherit' }}
                            >
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10">
                                    {doc.type === 'image' && doc.dataUrl ? (
                                        <img src={doc.dataUrl} alt={doc.name} className="h-full w-full object-cover" />
                                    ) : (
                                        getFileIcon(doc.type)
                                    )}
                                </div>
                                
                                <div className="min-w-0 flex-1 text-right">
                                    <p className="truncate text-sm font-semibold text-white">{doc.name}</p>
                                    <p className="truncate text-xs text-slate-400">
                                        {folders.find((f) => f.id === doc.folderId)?.name || 'عام'}
                                    </p>
                                    <div className="mt-0.5 flex items-center justify-end gap-2">
                                        <span className="text-[10px] text-slate-500">
                                            {new Date(doc.createdAt).toLocaleDateString('ar-EG')}
                                        </span>
                                        <Calendar size={10} className="text-slate-500" />
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        onClick={() => handleRename(doc.id)}
                                        className="min-h-[44px] rounded-lg border border-white/10 px-3 py-2 text-[11px] font-bold text-slate-200 transition-colors hover:bg-white/[0.06] touch-manipulation"
                                        title="إعادة تسمية"
                                    >
                                        تسمية
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteDocument(doc.id)}
                                        className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-rose-500/25 px-3 py-2 text-[11px] font-bold text-rose-200 transition-colors hover:bg-rose-950/40 touch-manipulation"
                                        title="حذف المستند"
                                    >
                                        <Trash2 size={13} />
                                        حذف
                                    </button>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {showSaveModal ? (
                    <div
                        className={EXEC_OVERLAY_NESTED_BACKDROP}
                        onClick={() => !isSaving && setShowSaveModal(false)}
                    >
                        <div
                            className={EXEC_OVERLAY_PHONE_SHEET_WIDE}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={EXEC_OVERLAY_HEADER}>
                                <h3 className={EXEC_OVERLAY_TITLE}>حفظ المستند</h3>
                                <button
                                    type="button"
                                    onClick={() => !isSaving && setShowSaveModal(false)}
                                    className={EXEC_MODAL_CLOSE_BTN_CLASS}
                                    aria-label="إغلاق"
                                >
                                    <X size={22} />
                                </button>
                            </div>
                            <div className="space-y-3 overflow-y-auto px-3 py-3">
                                <div>
                                    <label className="mb-1.5 block text-xs font-bold text-slate-400">اسم المستند *</label>
                                    <input
                                        type="text"
                                        value={pendingName}
                                        onChange={(e) => setPendingName(e.target.value)}
                                        className={EXEC_OVERLAY_FIELD}
                                        dir="rtl"
                                    />
                                </div>
                                {pendingPreviewUrl ? (
                                    <div className="rounded-xl border border-white/10 p-2">
                                        <img src={pendingPreviewUrl} alt="Preview" className="h-32 w-full object-contain" />
                                    </div>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={() => void confirmSave()}
                                    disabled={isSaving}
                                    className={`${EXEC_OVERLAY_PRIMARY_BTN} w-full disabled:opacity-50`}
                                >
                                    حفظ
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {renameDocId ? (
                    <div
                        className={EXEC_OVERLAY_NESTED_BACKDROP}
                        onClick={() => setRenameDocId(null)}
                    >
                        <div
                            className={EXEC_OVERLAY_PHONE_SHEET_WIDE}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={EXEC_OVERLAY_HEADER}>
                                <h3 className={EXEC_OVERLAY_TITLE}>إعادة تسمية</h3>
                                <button
                                    type="button"
                                    onClick={() => setRenameDocId(null)}
                                    className={EXEC_MODAL_CLOSE_BTN_CLASS}
                                    aria-label="إغلاق"
                                >
                                    <X size={22} />
                                </button>
                            </div>
                            <div className="space-y-3 px-3 py-3">
                                <input
                                    type="text"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    className={EXEC_OVERLAY_FIELD}
                                    dir="rtl"
                                />
                                <button
                                    type="button"
                                    onClick={confirmRename}
                                    className={`${EXEC_OVERLAY_PRIMARY_BTN} w-full`}
                                >
                                    حفظ
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {previewDocId ? (
                    <div
                        className={EXEC_OVERLAY_NESTED_BACKDROP}
                        onClick={() => setPreviewDocId(null)}
                    >
                        <div
                            className={`${EXEC_OVERLAY_PHONE_SHEET_WIDE} sm:max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] sm:max-w-5xl`}
                            data-testid="document-vault-preview"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={`${EXEC_OVERLAY_HEADER} gap-2`}>
                                <h3 className={EXEC_OVERLAY_TITLE}>
                                    {previewDocument?.name || 'معاينة'}
                                </h3>
                                <div className="flex shrink-0 items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteDocument(previewDocId)}
                                        className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-rose-500/25 px-2.5 py-1.5 text-[11px] font-bold text-rose-200 hover:bg-rose-950/40 touch-manipulation"
                                        title="حذف المستند"
                                    >
                                        <Trash2 size={14} />
                                        حذف
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewDocId(null)}
                                        className={EXEC_MODAL_CLOSE_BTN_CLASS}
                                        aria-label="إغلاق المعاينة"
                                    >
                                        <X size={22} />
                                    </button>
                                </div>
                            </div>
                            <div className="min-h-0 flex-1 overflow-hidden p-3">
                                {previewDocument?.dataUrl ? (
                                    previewDocument.type === 'pdf' ? (
                                        <div className="h-full w-full rounded-xl border border-white/10 bg-[#0A0F1C] p-2">
                                            <ZoomableContainer
                                                key={previewDocument.id}
                                                wheelZoom="modifier"
                                                nativeVerticalScroll
                                                showControls
                                            >
                                                <VaultPdfJsViewerLazy
                                                    source={previewObject?.blob ?? previewDocument.dataUrl}
                                                    title={previewDocument.name}
                                                    openUrl={previewObject?.url}
                                                    fallbackClassName="flex h-full items-center justify-center text-sm text-white/45"
                                                />
                                            </ZoomableContainer>
                                        </div>
                                    ) : (
                                        <ZoomableContainer key={previewDocument.id} wheelZoom="plain">
                                            <img
                                                src={previewObject?.url ?? previewDocument.dataUrl}
                                                alt={previewDocument.name}
                                                draggable={false}
                                                className="h-full min-h-0 w-full select-none rounded-xl border border-white/10 bg-black object-contain"
                                            />
                                        </ZoomableContainer>
                                    )
                                ) : null}
                            </div>
                        </div>
                    </div>
                ) : null}

            </div>
        </div>
    );
};
