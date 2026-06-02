import { useState, useEffect, useRef, useCallback } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartVaultDB, SmartVaultDoc, LawyerStorage, uuidv4 } from '@/app/services/lawyer-cloud';
import { useAuth } from '@/app/context/AuthContext';
import { useLawyerSettingsOptional } from '@/app/context/LawyerSettingsContext';

// --- Types ---
export type FilterTag = 'الكل' | 'عقود' | 'طابو' | 'عرائض' | 'أخرى';
export type ViewMode = 'grid' | 'list';
export type DropdownAction = 'edit' | 'link' | 'delete';

export const FILTERS: FilterTag[] = ['الكل', 'عقود', 'طابو', 'عرائض', 'أخرى'];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export function matchesFilter(doc: SmartVaultDoc, filter: FilterTag): boolean {
    if (filter === 'الكل') return true;
    if (filter === 'عقود') return doc.tags.some((t) => /عقد|إيجار/.test(t));
    if (filter === 'طابو') return doc.tags.some((t) => /طابو|تمليك/.test(t));
    if (filter === 'عرائض') return doc.tags.some((t) => /عريضة|عرائض|مرافعات|تعويض/.test(t));
    if (filter === 'أخرى') return doc.tags.length === 0;
    return true;
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

export function inferDocType(mimeType: string): 'pdf' | 'image' {
    if (mimeType.startsWith('image/')) return 'image';
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
    activeSummaryDoc: SmartVaultDoc | null;
    activeFilter: FilterTag;
    viewMode: ViewMode;
    openDropdownId: string | null;
    isUploading: boolean;
    currentUserId: string;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    mounted: boolean;
    filteredDocs: SmartVaultDoc[];

    // Setters
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    setActiveFilter: React.Dispatch<React.SetStateAction<FilterTag>>;
    setViewMode: (mode: ViewMode) => void;
    setOpenDropdownId: React.Dispatch<React.SetStateAction<string | null>>;
    setActiveSummaryDoc: React.Dispatch<React.SetStateAction<SmartVaultDoc | null>>;

    // Actions
    handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    handleDelete: (doc: SmartVaultDoc) => Promise<void>;
    handleEdit: (doc: SmartVaultDoc) => Promise<void>;
    handleBindToDossier: (doc: SmartVaultDoc) => Promise<void>;
    handleViewFile: (doc: SmartVaultDoc) => Promise<void>;
    handleAISearch: () => Promise<void>;
    handleSearchSubmit: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    handleDropdownAction: (doc: SmartVaultDoc, action: DropdownAction) => void;
    onClose: () => void;
}

export const useSmartVault = (onClose: () => void, propUserId?: string): UseSmartVaultReturn => {
    const { user: authUser } = useAuth();
    const currentUserId = propUserId || authUser?.id || '';

    const [docs, setDocs] = useState<SmartVaultDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [activeSummaryDoc, setActiveSummaryDoc] = useState<SmartVaultDoc | null>(null);
    const [mounted, setMounted] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterTag>('الكل');
    const lawyerSettings = useLawyerSettingsOptional();
    const viewMode: ViewMode = lawyerSettings?.settings.workflow.viewMode ?? 'grid';

    const setViewMode = useCallback(
        (mode: ViewMode) => {
            lawyerSettings?.setSettings((prev) => ({
                ...prev,
                workflow: { ...prev.workflow, viewMode: mode },
            }));
        },
        [lawyerSettings],
    );
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const filteredDocs = docs.filter((doc) => {
        if (!matchesFilter(doc, activeFilter)) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            doc.title.toLowerCase().includes(q) ||
            doc.tags.some((t) => t.includes(q)) ||
            (doc.aiSummary?.toLowerCase().includes(q) ?? false)
        );
    });

    const loadDocs = useCallback(async () => {
        try {
            const all = await SmartVaultDB.listDocs(currentUserId || undefined);
            setDocs(all);
        } catch {
            SmartToast.error('فشل تحميل الملفات');
        } finally {
            setIsLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        if (!currentUserId) {
            setDocs([]);
            setIsLoading(false);
            return;
        }
        void loadDocs();
    }, [currentUserId, loadDocs]);

    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        if (!currentUserId) {
            SmartToast.error('يرجى تسجيل الدخول أولاً لرفع الملفات');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const oversized: string[] = [];
        for (const f of Array.from(files)) {
            if (f.size > MAX_FILE_SIZE) oversized.push(f.name);
        }
        if (oversized.length > 0) {
            SmartToast.error(`الملفات التالية تتجاوز 50MB: ${oversized.join('، ')}`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsUploading(true);
        let uploadedCount = 0;

        for (const file of Array.from(files)) {
            try {
                const uploadResult = await LawyerStorage.uploadSmartFile(currentUserId, file, 'vault');
                const docId = uuidv4();
                const title = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

                const newDoc: SmartVaultDoc = {
                    id: docId,
                    title,
                    type: inferDocType(file.type),
                    tags: inferTags(title),
                    authorId: currentUserId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    fileSize: file.size,
                    fileName: file.name,
                    mimeType: file.type,
                    storagePath: uploadResult.path,
                    signedUrl: uploadResult.downloadUrl || null,
                    isProcessing: false,
                    boundDossierId: null,
                };

                await SmartVaultDB.saveDoc(newDoc);
                uploadedCount++;
            } catch {
                SmartToast.error(`فشل رفع ${file.name}`);
            }
        }

        setIsUploading(false);
        if (uploadedCount > 0) {
            SmartToast.success(`تم رفع ${uploadedCount} ملف بنجاح`);
            await loadDocs();
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDelete = async (doc: SmartVaultDoc) => {
        if (!currentUserId || doc.authorId !== currentUserId) {
            SmartToast.error('ليس لديك صلاحية لحذف هذا الملف');
            return;
        }
        try {
            await SmartVaultDB.deleteDoc(doc.id, doc.authorId);
            SmartToast.success('تم حذف الملف بنجاح');
            await loadDocs();
        } catch {
            SmartToast.error('فشل حذف الملف');
        }
    };

    const handleEdit = async (doc: SmartVaultDoc) => {
        if (!currentUserId || doc.authorId !== currentUserId) {
            SmartToast.error('ليس لديك صلاحية لتعديل هذا الملف');
            return;
        }

        const newTitle = await SmartDialog.prompt('تعديل عنوان الملف:', doc.title);
        if (!newTitle || newTitle === doc.title) return;

        const tagsInput = await SmartDialog.prompt('الوسوم (افصل بينها بفاصلة):', doc.tags.join(', '));
        const newTags = tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : doc.tags;

        try {
            const updated: SmartVaultDoc = {
                ...doc,
                title: newTitle,
                tags: newTags.length > 0 ? newTags : inferTags(newTitle),
                updatedAt: new Date().toISOString(),
            };
            await SmartVaultDB.updateDoc(updated, currentUserId);
            SmartToast.success('تم تحديث الملف بنجاح');
            await loadDocs();
        } catch {
            SmartToast.error('فشل تحديث الملف');
        }
    };

    const handleBindToDossier = async (doc: SmartVaultDoc) => {
        if (!currentUserId || doc.authorId !== currentUserId) {
            SmartToast.error('ليس لديك صلاحية لربط هذا الملف');
            return;
        }
        const dossierId = await SmartDialog.prompt('أدخل رقم/معرف الإضبارة لربط الملف بها:', '');
        if (!dossierId || !dossierId.trim()) return;

        try {
            await SmartVaultDB.bindToDossier(doc.id, currentUserId, dossierId.trim());
            SmartToast.success(`تم ربط الملف بالإضبارة ${dossierId.trim()}`);
            await loadDocs();
        } catch {
            SmartToast.error('فشل ربط الملف بالإضبارة');
        }
    };

    const handleViewFile = async (doc: SmartVaultDoc) => {
        try {
            let url = doc.signedUrl;
            if (!url) {
                url = await SmartVaultDB.getSignedUrl(doc.storagePath);
            }
            if (url) {
                window.open(url, '_blank');
            } else {
                SmartToast.error('تعذر فتح الملف');
            }
        } catch {
            SmartToast.error('تعذر فتح الملف');
        }
    };

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
        else if (action === 'link') handleBindToDossier(doc);
        else if (action === 'delete') {
            const ok = await SmartDialog.confirm(`هل أنت متأكد من حذف "${doc.title}"؟`);
            if (ok) handleDelete(doc);
        }
    };

    return {
        docs, isLoading, searchQuery, isSearching, activeSummaryDoc,
        activeFilter, viewMode, openDropdownId, isUploading, currentUserId,
        fileInputRef, searchInputRef, mounted, filteredDocs,
        setSearchQuery, setActiveFilter, setViewMode, setOpenDropdownId, setActiveSummaryDoc,
        handleUpload, handleDelete, handleEdit, handleBindToDossier, handleViewFile,
        handleAISearch, handleSearchSubmit, handleDropdownAction, onClose,
    };
};
