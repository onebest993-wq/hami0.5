import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartVaultDB, SmartVaultDoc } from '@/app/services/lawyer-cloud';
import {
    saveFileToVault,
    readFilePreviewUrl,
    resolveVaultDocUrl,
    isVaultDocImage,
    isVaultDocPdf,
    isVaultImageFile,
    isVaultPdfFile,
    VAULT_MAX_FILE_SIZE,
    type VaultUploadKind,
    type VaultDocViewerKind,
} from '@/app/services/vaultUploadService';
import { useAuthUser } from '@/app/context/AuthContext';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { loadPersistedViewMode, persistViewMode } from '@/app/services/settings/builtInBehavior';
import {
    addCustomCategory,
    countDocsInCategory,
    docMatchesCategoryFilter,
    mergeCustomCategoriesFromDocs,
    removeCustomCategory,
} from '@/app/services/vaultCustomCategories';

// --- Types ---
export type ViewMode = 'grid' | 'list';
export type DropdownAction = 'edit' | 'delete';
export type VaultFilterId = string;

export type PendingUploadItem = { file: File; previewUrl?: string; kind: VaultUploadKind };

const MAX_FILE_SIZE = VAULT_MAX_FILE_SIZE;

/** @deprecated use docMatchesCategoryFilter */
export type FilterTag = string;
/** @deprecated */
export const FILTERS: FilterTag[] = ['الكل'];

export function matchesFilter(doc: SmartVaultDoc, filter: string): boolean {
    return docMatchesCategoryFilter(doc, filter);
}

export function formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'اليوم';
        if (days === 1) return 'أمس';
        if (days < 7) return `منذ ${days} أيام`;
        return d.toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric' });
    } catch {
        return dateStr;
    }
}

export function inferDocType(mimeType: string, fileName?: string): 'pdf' | 'image' {
    const mime = (mimeType || '').toLowerCase();
    const name = fileName || '';
    if (mime.startsWith('image/')) return 'image';
    if (/\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(name)) return 'image';
    if (mime === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf';
    return 'pdf';
}

export function inferTags(title: string): string[] {
    const tags: string[] = [];
    if (/عقد|إيجار/.test(title)) tags.push('عقود');
    if (/طابو|تمليك/.test(title)) tags.push('طابو');
    if (/عريضة|عرائض|مرافعات|تعويض/.test(title)) tags.push('عرائض');
    if (tags.length === 0) {
        if (/بحث|مذكرة|دراسة/.test(title)) tags.push('بحث قانوني');
        else if (/حكم|قرار|تمييز/.test(title)) tags.push('قرار حكم');
        else tags.push('أخرى');
    }
    return tags;
}

interface UseSmartVaultReturn {
    // State
    docs: SmartVaultDoc[];
    isLoading: boolean;
    searchQuery: string;
    isSearching: boolean;
    activeFilter: string;
    customCategories: string[];
    viewMode: ViewMode;
    openDropdownId: string | null;
    currentUserId: string;
    pendingUpload: PendingUploadItem | null;
    uploadQueueCount: number;
    fileViewer: { doc: SmartVaultDoc; url: string; kind: VaultDocViewerKind } | null;
    /** @deprecated use fileViewer */
    imageViewer: { doc: SmartVaultDoc; url: string; kind: VaultDocViewerKind } | null;
    editDoc: SmartVaultDoc | null;
    isSavingMeta: boolean;
    isSavingEdit: boolean;
    imageInputRef: React.RefObject<HTMLInputElement | null>;
    pdfInputRef: React.RefObject<HTMLInputElement | null>;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    mounted: boolean;
    filteredDocs: SmartVaultDoc[];

    // Setters
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    setActiveFilter: React.Dispatch<React.SetStateAction<string>>;
    addVaultCategory: (name: string) => void;
    removeVaultCategory: (name: string) => Promise<void>;
    setViewMode: (mode: ViewMode) => void;
    setOpenDropdownId: React.Dispatch<React.SetStateAction<string | null>>;

    // Actions
    handleImageUploadSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    handlePdfUploadSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    confirmPendingUpload: (meta: { title: string; lawyerNote: string; classification: string }) => Promise<void>;
    cancelPendingUpload: () => void;
    closeFileViewer: () => void;
    /** @deprecated use closeFileViewer */
    closeImageViewer: () => void;
    saveDocEdit: (values: { title: string; lawyerNote: string; classification: string }) => Promise<void>;
    closeEditDoc: () => void;
    handleDelete: (doc: SmartVaultDoc) => Promise<void>;
    handleEdit: (doc: SmartVaultDoc) => void;
    handleViewFile: (doc: SmartVaultDoc) => Promise<void>;
    handleAISearch: () => Promise<void>;
    handleSearchSubmit: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    handleDropdownAction: (doc: SmartVaultDoc, action: DropdownAction) => void;
    refreshDocs: () => Promise<void>;
    onClose: () => void;
}

export const useSmartVault = (onClose: () => void, propUserId?: string): UseSmartVaultReturn => {
    const authUser = useAuthUser();
    const currentUserId = propUserId || authUser?.id || '';

    const [docs, setDocs] = useState<SmartVaultDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [activeFilter, setActiveFilter] = useState<string>('الكل');
    const [customCategories, setCustomCategories] = useState<string[]>([]);
    const [viewMode, setViewModeState] = useState<ViewMode>(() => loadPersistedViewMode());

    const setViewMode = useCallback((mode: ViewMode) => {
        setViewModeState(mode);
        persistViewMode(mode);
        if (typeof document !== 'undefined') {
            document.documentElement.dataset.hamiViewMode = mode;
        }
    }, []);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [isSavingMeta, setIsSavingMeta] = useState(false);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [pendingUpload, setPendingUpload] = useState<PendingUploadItem | null>(null);
    const [uploadQueue, setUploadQueue] = useState<File[]>([]);
    const [fileViewer, setFileViewer] = useState<{ doc: SmartVaultDoc; url: string; kind: VaultDocViewerKind } | null>(null);
    const [editDoc, setEditDoc] = useState<SmartVaultDoc | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const docsRef = useRef(docs);
    docsRef.current = docs;

    const filteredDocs = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return docs.filter((doc) => {
            if (!matchesFilter(doc, activeFilter)) return false;
            if (!q) return true;
            return (
                doc.title.toLowerCase().includes(q) ||
                (doc.customCategory?.toLowerCase().includes(q) ?? false) ||
                doc.tags.some((t) => t.toLowerCase().includes(q)) ||
                (doc.lawyerNote?.toLowerCase().includes(q) ?? false) ||
                (doc.aiSummary?.toLowerCase().includes(q) ?? false)
            );
        });
    }, [docs, activeFilter, searchQuery]);

    const loadDocs = useCallback(async () => {
        try {
            const all = await SmartVaultDB.listDocs(currentUserId || undefined);
            setDocs(all);
            if (currentUserId) {
                setCustomCategories(mergeCustomCategoriesFromDocs(currentUserId, all));
            }
        } catch {
            SmartToast.error('فشل تحميل الملفات');
        } finally {
            setIsLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        if (!currentUserId) {
            setDocs([]);
            setCustomCategories([]);
            setIsLoading(false);
            return;
        }
        void loadDocs();
    }, [currentUserId, loadDocs]);

    const addVaultCategory = useCallback(
        (name: string) => {
            if (!currentUserId) return;
            const next = addCustomCategory(currentUserId, name);
            setCustomCategories(next);
        },
        [currentUserId],
    );

    const removeVaultCategory = useCallback(
        async (name: string) => {
            const trimmed = name.trim();
            if (!currentUserId || !trimmed) return;

            const count = countDocsInCategory(docsRef.current, trimmed);
            const ok = await SmartDialog.confirm(
                count > 0
                    ? `هل تريد حذف تصنيف «${trimmed}»؟\nسيتم إزالة التصنيف من ${count} ملف.`
                    : `هل تريد حذف تصنيف «${trimmed}»؟`,
            );
            if (!ok) return;

            try {
                const affected = docsRef.current.filter(
                    (d) => (d.customCategory?.trim() || '') === trimmed,
                );
                for (const doc of affected) {
                    await SmartVaultDB.updateDoc(
                        {
                            ...doc,
                            customCategory: null,
                            tags: doc.tags.filter((t) => t !== trimmed),
                            updatedAt: new Date().toISOString(),
                        },
                        currentUserId,
                    );
                }
                setCustomCategories(removeCustomCategory(currentUserId, trimmed));
                setActiveFilter((f) => (f === trimmed ? 'الكل' : f));
                SmartToast.success('تم حذف التصنيف');
                await loadDocs();
            } catch {
                SmartToast.error('فشل حذف التصنيف');
            }
        },
        [currentUserId, loadDocs],
    );

    useBodyScrollLock(mounted);

    useEffect(() => {
        setMounted(true);
        return () => setOpenDropdownId(null);
    }, []);

    const beginNextPendingUpload = useCallback(async (files: File[], kind: VaultUploadKind) => {
        if (files.length === 0) {
            setPendingUpload(null);
            setUploadQueue([]);
            return;
        }
        const [next, ...rest] = files;
        const previewUrl = kind === 'image' ? await readFilePreviewUrl(next) : undefined;
        setUploadQueue(rest);
        setPendingUpload({ file: next, previewUrl, kind });
    }, []);

    const resetFileInputs = () => {
        if (imageInputRef.current) imageInputRef.current.value = '';
        if (pdfInputRef.current) pdfInputRef.current.value = '';
    };

    const queueUploadFiles = async (fileList: FileList | null, kind: VaultUploadKind) => {
        if (!fileList || fileList.length === 0) return;
        if (!currentUserId) {
            SmartToast.error('يرجى تسجيل الدخول أولاً لرفع الملفات');
            resetFileInputs();
            return;
        }

        const files = Array.from(fileList);
        const wrongType = files.filter((f) =>
            kind === 'image' ? !isVaultImageFile(f) : !isVaultPdfFile(f),
        );
        if (wrongType.length > 0) {
            SmartToast.error(
                kind === 'image'
                    ? 'يرجى اختيار صورة فقط (JPG, PNG, WEBP...)'
                    : 'يرجى اختيار ملف PDF فقط',
            );
            resetFileInputs();
            return;
        }

        const oversized = files.filter((f) => f.size > MAX_FILE_SIZE);
        if (oversized.length > 0) {
            SmartToast.error(`الملفات التالية تتجاوز 50MB: ${oversized.map((f) => f.name).join('، ')}`);
            resetFileInputs();
            return;
        }

        try {
            await beginNextPendingUpload(files, kind);
        } catch {
            SmartToast.error('تعذر تجهيز الملف للرفع');
            resetFileInputs();
        }
    };

    const handleImageUploadSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        await queueUploadFiles(files, 'image');
    };

    const handlePdfUploadSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        await queueUploadFiles(files, 'pdf');
    };

    const cancelPendingUpload = useCallback(() => {
        setPendingUpload(null);
        setUploadQueue([]);
        resetFileInputs();
    }, []);

    const confirmPendingUpload = async (meta: { title: string; lawyerNote: string; classification: string }) => {
        if (!pendingUpload || !currentUserId) return;
        setIsSavingMeta(true);
        let localOnly = false;
        const classification = meta.classification.trim();
        try {
            const saved = await saveFileToVault(currentUserId, pendingUpload.file, {
                title: meta.title,
                lawyerNote: meta.lawyerNote || null,
                customCategory: classification || null,
                tags: classification ? [classification] : [],
            });
            localOnly = saved.localOnly;
            if (classification) {
                addVaultCategory(classification);
                setActiveFilter(classification);
            } else {
                setActiveFilter('الكل');
            }
        } catch (err) {
            if (err instanceof Error && err.message === 'vault persist failed') {
                SmartToast.error('تعذر حفظ الملف على الجهاز — قد تكون مساحة التخزين ممتلئة');
            } else if (err instanceof Error && err.message === 'vault blob store unavailable') {
                SmartToast.error('تعذر حفظ الملف الكبير — المتصفح لا يدعم التخزين المحلي');
            } else if (err instanceof Error && err.message === 'file too large') {
                SmartToast.error('يتجاوز الحد الأقصى 50MB');
            } else {
                SmartToast.error(`فشل رفع ${pendingUpload.file.name}`);
            }
            setIsSavingMeta(false);
            return;
        }

        setIsSavingMeta(false);
        if (uploadQueue.length > 0) {
            SmartToast.success(localOnly ? 'تم الحفظ محلياً — الملف التالي' : 'تم الرفع — الملف التالي');
            await beginNextPendingUpload(uploadQueue, pendingUpload.kind);
            resetFileInputs();
            await loadDocs();
            return;
        }

        setPendingUpload(null);
        setUploadQueue([]);
        resetFileInputs();
        SmartToast.success(localOnly ? 'تم حفظ الملف محلياً' : 'تم رفع الملف بنجاح');
        await loadDocs();
    };

    const handleDelete = async (doc: SmartVaultDoc) => {
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
    };

    const handleEdit = (doc: SmartVaultDoc) => {
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
    };

    const closeEditDoc = () => setEditDoc(null);

    const saveDocEdit = async (values: { title: string; lawyerNote: string; classification: string }) => {
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
    };

    const handleViewFile = async (doc: SmartVaultDoc) => {
        try {
            const fresh = docsRef.current.find((d) => d.id === doc.id) ?? doc;
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
        }
    };

    const closeFileViewer = () => setFileViewer(null);

    const handleAISearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        await new Promise((r) => setTimeout(r, 120));
        if (filteredDocs.length === 0) {
            SmartToast.info('لم يتم العثور على نتائج مطابقة');
        }
        setIsSearching(false);
    };

    const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleAISearch();
    };

    const handleDropdownAction = async (doc: SmartVaultDoc, action: DropdownAction) => {
        setOpenDropdownId(null);
        if (action === 'edit') handleEdit(doc);
        else if (action === 'delete') {
            const ok = await SmartDialog.confirm(`هل أنت متأكد من حذف "${doc.title}"؟`);
            if (ok) handleDelete(doc);
        }
    };

    return {
        docs, isLoading, searchQuery, isSearching,
        activeFilter, customCategories, viewMode, openDropdownId, currentUserId,
        pendingUpload, uploadQueueCount: uploadQueue.length, fileViewer, imageViewer: fileViewer, editDoc, isSavingMeta, isSavingEdit,
        imageInputRef, pdfInputRef, searchInputRef, mounted, filteredDocs,
        setSearchQuery, setActiveFilter, addVaultCategory, removeVaultCategory, setViewMode, setOpenDropdownId,
        handleImageUploadSelect, handlePdfUploadSelect, confirmPendingUpload, cancelPendingUpload,
        closeFileViewer, closeImageViewer: closeFileViewer, saveDocEdit, closeEditDoc,
        handleDelete, handleEdit, handleViewFile,
        handleAISearch, handleSearchSubmit, handleDropdownAction, refreshDocs: loadDocs, onClose,
    };
};
