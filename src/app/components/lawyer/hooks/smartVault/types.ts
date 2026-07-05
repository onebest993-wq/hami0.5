import type { VaultUploadKind, VaultDocViewerKind } from '@/app/services/vaultUploadService';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';

export type ViewMode = 'grid' | 'list';
export type DropdownAction = 'edit' | 'delete';
export type VaultFilterId = string;

export type PendingUploadItem = { file: File; previewUrl?: string; kind: VaultUploadKind };

export type VaultFileViewerState = {
    doc: SmartVaultDoc;
    url: string;
    blob?: Blob | null;
    kind: VaultDocViewerKind;
    /** إبطال blob URL عند الإغلاق فقط إذا أنشأناه هنا وليس من signedUrl المخزّن */
    revokeOnClose?: boolean;
} | null;

/** @deprecated use docMatchesCategoryFilter from vaultCustomCategories */
export type FilterTag = string;
/** @deprecated */
export const FILTERS: FilterTag[] = ['الكل'];

export { inferDocType, inferTags, formatFileSize } from '@/app/services/vault/vaultDocUtils';
export { formatVaultDate as formatDate } from '@/app/services/vault/vaultDocUtils';
export { docMatchesCategoryFilter as matchesFilter } from '@/app/services/vaultCustomCategories';

export interface UseSmartVaultReturn {
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
    fileViewer: VaultFileViewerState;
    /** @deprecated use fileViewer */
    imageViewer: VaultFileViewerState;
    editDoc: SmartVaultDoc | null;
    viewingDocId: string | null;
    isSavingMeta: boolean;
    isSavingEdit: boolean;
    imageInputRef: React.RefObject<HTMLInputElement | null>;
    pdfInputRef: React.RefObject<HTMLInputElement | null>;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    mounted: boolean;
    filteredDocs: SmartVaultDoc[];

    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    setActiveFilter: React.Dispatch<React.SetStateAction<string>>;
    addVaultCategory: (name: string) => void;
    removeVaultCategory: (name: string) => Promise<void>;
    setViewMode: (mode: ViewMode) => void;
    setOpenDropdownId: React.Dispatch<React.SetStateAction<string | null>>;

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
    prependVaultDoc: (doc: SmartVaultDoc) => void;
    onClose: () => void;
}
