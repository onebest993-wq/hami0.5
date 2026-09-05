import { useCallback, useEffect, useRef } from 'react';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { useSmartVault } from '@/app/components/lawyer/hooks/useSmartVault';
import type { RepositoryFeedFilter } from '@/app/services/repository/repositoryUnifiedFeed';
import { useRepositoryFeed } from './useRepositoryFeed';
import { useRepositoryCompose } from './useRepositoryCompose';
import { useRepositoryLifecycle } from './useRepositoryLifecycle';
import { useRepositoryEscapeStack } from './useRepositoryEscapeStack';
import { useRepositoryRooms } from './useRepositoryRooms';
import { useRepositoryRoomActions } from './useRepositoryRoomActions';
import { resolveRepositoryFocusRoomFilter } from '../repositoryFeedFocus';

export type UseRepositoryUnifiedFeedModelParams = {
    currentUserId?: string;
    notes: GlobalNote[];
    lawsuitFiles: FileData[];
    executionFiles: ExecutionFile[];
    startMode: 'list' | 'create';
    focusNoteId?: string;
    initialFilter?: RepositoryFeedFilter;
    vaultOpenScanner?: boolean;
    onSaveNote: (note: GlobalNote) => void | Promise<void>;
    onDeleteNote: (id: string | number) => void;
    onUpdateLawsuitFile: (file: FileData) => void;
    onUpdateExecutionFile: (file: ExecutionFile) => void;
    onRequestClose: () => void;
    escapeEnabled?: boolean;
};

export function useRepositoryUnifiedFeedModel({
    currentUserId,
    notes,
    lawsuitFiles,
    executionFiles,
    startMode,
    focusNoteId,
    initialFilter,
    vaultOpenScanner = false,
    onSaveNote,
    onUpdateLawsuitFile,
    onUpdateExecutionFile,
    onRequestClose,
    escapeEnabled = true,
}: UseRepositoryUnifiedFeedModelParams) {
    const feedScrollRef = useRef<HTMLDivElement>(null);
    const appliedFocusRoomRef = useRef<string | null>(null);
    const effectiveInitialFilter: RepositoryFeedFilter = initialFilter ?? 'all';
    const roomsApi = useRepositoryRooms(currentUserId);
    const activeRoomIdRef = useRef(roomsApi.activeRoomId);
    activeRoomIdRef.current = roomsApi.activeRoomId;

    useEffect(() => {
        if (!focusNoteId) {
            appliedFocusRoomRef.current = null;
            return;
        }
        if (appliedFocusRoomRef.current === focusNoteId) return;
        const nextRoom = resolveRepositoryFocusRoomFilter(notes, focusNoteId);
        if (nextRoom == null) return;
        appliedFocusRoomRef.current = focusNoteId;
        roomsApi.setSelectedRoomId(nextRoom);
    }, [focusNoteId, notes, roomsApi.setSelectedRoomId]);

    const vault = useSmartVault(() => undefined, currentUserId, {
        embedded: true,
        onAfterVaultSave: () => undefined,
        getDefaultRoomId: () => activeRoomIdRef.current,
    });

    const feed = useRepositoryFeed({
        notes,
        lawsuitFiles,
        executionFiles,
        vaultDocs: vault.docs,
        vaultCategoryFilter: vault.activeFilter,
        vaultSearchQuery: vault.searchQuery,
        roomFilter: roomsApi.selectedRoomId,
        initialFilter: effectiveInitialFilter,
        vault,
    });

    const handleAfterComposeSave = useCallback(
        (kind: 'note' | 'media') => {
            feed.selectMainFilter(kind === 'media' ? 'media' : 'all');
        },
        [feed.selectMainFilter],
    );

    useRepositoryLifecycle(currentUserId, vault.docs.length, notes.length, escapeEnabled);

    const compose = useRepositoryCompose({
        startMode,
        vaultOpenScanner,
        currentUserId,
        lawsuitFiles,
        executionFiles,
        onSaveNote,
        onUpdateLawsuitFile,
        onUpdateExecutionFile,
        vault,
        activeRoomId: roomsApi.activeRoomId,
        onAfterSave: handleAfterComposeSave,
    });

    const roomsActions = useRepositoryRoomActions({
        currentUserId,
        notes,
        onSaveNote,
        vault,
        roomsApi,
    });

    const actionToolbarDisabled =
        compose.composing ||
        compose.scannerOpen ||
        compose.showVoiceRecorder ||
        Boolean(vault.pendingUpload) ||
        Boolean(vault.editDoc);

    useRepositoryEscapeStack({
        enabled: escapeEnabled,
        composing: compose.composing,
        scannerOpen: compose.scannerOpen,
        showVoiceRecorder: compose.showVoiceRecorder,
        fileViewerOpen: Boolean(vault.fileViewer),
        editDocOpen: Boolean(vault.editDoc),
        pendingUploadOpen: Boolean(vault.pendingUpload),
        pendingUploadSaving: vault.isSavingMeta,
        composeSaving: compose.saving,
        onResetComposer: compose.resetComposer,
        onCloseScanner: () => compose.setScannerOpen(false),
        onCloseVoice: () => compose.setShowVoiceRecorder(false),
        onCloseFileViewer: vault.closeFileViewer,
        onCloseEditDoc: vault.closeEditDoc,
        onCancelPendingUpload: vault.cancelPendingUpload,
        onCloseModal: onRequestClose,
    });

    return {
        feedScrollRef,
        roomsApi,
        roomsActions,
        vault,
        feed,
        compose,
        actionToolbarDisabled,
        activeRoomIdRef,
    };
}
