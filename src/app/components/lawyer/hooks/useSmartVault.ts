import { useAuthUser } from '@/app/context/authHooks';
import { isShellAuthBypassed } from '@/app/services/auth/shellAuth';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';
import { useSmartVaultData } from './smartVault/useSmartVaultData';
import { useSmartVaultUpload } from './smartVault/useSmartVaultUpload';
import { useSmartVaultDocActions } from './smartVault/useSmartVaultDocActions';
import { useSmartVaultShell } from './smartVault/useSmartVaultShell';
import type { UseSmartVaultReturn } from './smartVault/types';

export type {
    ViewMode,
    DropdownAction,
    VaultFilterId,
    PendingUploadItem,
    FilterTag,
    UseSmartVaultReturn,
} from './smartVault/types';

export {
    inferDocType,
    inferTags,
    formatFileSize,
    formatDate,
    matchesFilter,
    FILTERS,
} from './smartVault/types';

export const useSmartVault = (
    onClose: () => void,
    propUserId?: string,
    options?: { embedded?: boolean; onAfterVaultSave?: () => void; getDefaultRoomId?: () => string | null },
): UseSmartVaultReturn => {
    const authUser = useAuthUser();
    const currentUserId =
        propUserId?.trim() || authUser?.id?.trim() || (isShellAuthBypassed() ? GUEST_LAWYER_ID : '');

    const data = useSmartVaultData(currentUserId, propUserId, options?.embedded);
    const upload = useSmartVaultUpload({
        currentUserId,
        prependVaultDoc: data.prependVaultDoc,
        addVaultCategory: data.addVaultCategory,
        setActiveFilter: data.setActiveFilter,
        onAfterVaultSave: options?.onAfterVaultSave,
    });
    const shell = useSmartVaultShell({
        onClose,
        currentUserId,
        embedded: options?.embedded,
        searchQuery: data.searchQuery,
        setSearchQuery: data.setSearchQuery,
        filteredDocs: data.filteredDocs,
        isSearching: data.isSearching,
        setIsSearching: data.setIsSearching,
    });
    const docActions = useSmartVaultDocActions({
        currentUserId,
        docsRef: data.docsRef,
        loadDocs: data.loadDocs,
        removeDocFromState: data.removeVaultDoc,
        addVaultCategory: data.addVaultCategory,
        setActiveFilter: data.setActiveFilter,
        setOpenDropdownId: shell.setOpenDropdownId,
    });

    return {
        docs: data.docs,
        isLoading: data.isLoading,
        searchQuery: data.searchQuery,
        isSearching: shell.isSearching,
        activeFilter: data.activeFilter,
        customCategories: data.customCategories,
        viewMode: data.viewMode,
        openDropdownId: shell.openDropdownId,
        currentUserId,
        pendingUpload: upload.pendingUpload,
        uploadQueueCount: upload.uploadQueueCount,
        fileViewer: docActions.fileViewer,
        imageViewer: docActions.fileViewer,
        editDoc: docActions.editDoc,
        viewingDocId: docActions.viewingDocId,
        isSavingMeta: upload.isSavingMeta,
        isSavingEdit: docActions.isSavingEdit,
        imageInputRef: upload.imageInputRef,
        pdfInputRef: upload.pdfInputRef,
        searchInputRef: shell.searchInputRef,
        mounted: shell.mounted,
        filteredDocs: data.filteredDocs,
        setSearchQuery: data.setSearchQuery,
        setActiveFilter: data.setActiveFilter,
        addVaultCategory: data.addVaultCategory,
        removeVaultCategory: data.removeVaultCategory,
        setViewMode: data.setViewMode,
        setOpenDropdownId: shell.setOpenDropdownId,
        handleImageUploadSelect: upload.handleImageUploadSelect,
        handlePdfUploadSelect: upload.handlePdfUploadSelect,
        confirmPendingUpload: upload.confirmPendingUpload,
        cancelPendingUpload: upload.cancelPendingUpload,
        closeFileViewer: docActions.closeFileViewer,
        closeImageViewer: docActions.closeFileViewer,
        saveDocEdit: docActions.saveDocEdit,
        closeEditDoc: docActions.closeEditDoc,
        handleDelete: docActions.handleDelete,
        handleEdit: docActions.handleEdit,
        handleViewFile: docActions.handleViewFile,
        handleAISearch: shell.handleAISearch,
        handleSearchSubmit: shell.handleSearchSubmit,
        handleDropdownAction: docActions.handleDropdownAction,
        refreshDocs: data.loadDocs,
        prependVaultDoc: data.prependVaultDoc,
        onClose,
    };
};
