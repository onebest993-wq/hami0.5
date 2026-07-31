import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { useSmartVault } from '@/app/components/lawyer/hooks/useSmartVault';
import type { RepositoryFeedFilter } from '@/app/services/repository/repositoryUnifiedFeed';
import { SmartVaultDB } from '@/app/services/vault/smartVaultRuntime';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { countItemsInRoom } from '@/app/services/repository/repositoryRooms';
import { VaultModalRootContext } from '@/app/components/lawyer/SmartVaultModal/VaultModalRootContext';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { REPO_BODY } from './smartRepositoryTheme';
import { RepositoryControlsSection } from './RepositoryControlsSection';
import { RepositoryComposePanel } from './RepositoryComposePanel';
import { RepositoryFeedSection } from './RepositoryFeedSection';
import { RepositoryVaultOverlays } from './RepositoryVaultOverlays';
import { useRepositoryFeed } from './hooks/useRepositoryFeed';
import { useRepositoryCompose } from './hooks/useRepositoryCompose';
import { useRepositoryLifecycle } from './hooks/useRepositoryLifecycle';
import { useRepositoryEscapeStack } from './hooks/useRepositoryEscapeStack';
import { useRepositoryRooms } from './hooks/useRepositoryRooms';
import { confirmRepositoryRoomDelete, prefetchRepositoryDialogs } from './repositoryDialog';
import { prefetchVaultBlobStore } from '@/app/services/vaultBlobStore';
import { prefetchVoiceRecorderModal } from '@/app/utils/lazyComponentsIntent';

export type SmartRepositoryUnifiedFeedProps = {
    currentUserId?: string;
    notes: GlobalNote[];
    /** false حتى يكتمل أول دمج للملاحظات */
    notesBootSettled?: boolean;
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

export function SmartRepositoryUnifiedFeed({
    currentUserId,
    notes,
    notesBootSettled = true,
    lawsuitFiles,
    executionFiles,
    startMode,
    focusNoteId,
    initialFilter,
    vaultOpenScanner = false,
    onSaveNote,
    onDeleteNote,
    onUpdateLawsuitFile,
    onUpdateExecutionFile,
    onRequestClose,
    escapeEnabled = true,
}: SmartRepositoryUnifiedFeedProps) {
    const feedScrollRef = useRef<HTMLDivElement>(null);
    const [modalRoot, setModalRoot] = useState<HTMLDivElement | null>(null);
    const effectiveInitialFilter: RepositoryFeedFilter = initialFilter ?? 'all';
    const roomsApi = useRepositoryRooms(currentUserId);
    const activeRoomIdRef = useRef(roomsApi.activeRoomId);
    activeRoomIdRef.current = roomsApi.activeRoomId;

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
        focusNoteId,
        feedScrollRef,
        vault,
    });

    /* تصنيفات مخصصة مسموحة في المستودع الموحّد — لا تُصفَّر تلقائياً */

    useEffect(() => {
        let idleId: number | undefined;
        let timeoutId: number | undefined;
        const run = () => {
            prefetchVaultBlobStore();
            prefetchRepositoryDialogs();
            prefetchVoiceRecorderModal();
        };
        if (typeof requestIdleCallback === 'function') {
            idleId = requestIdleCallback(run, { timeout: 600 });
        } else {
            timeoutId = window.setTimeout(run, 120);
        }
        return () => {
            if (idleId != null && typeof cancelIdleCallback === 'function') {
                cancelIdleCallback(idleId);
            }
            if (timeoutId != null) window.clearTimeout(timeoutId);
        };
    }, []);

    const handleAfterComposeSave = useCallback(
        (_kind: 'note' | 'media') => undefined,
        [],
    );

    const { feedLoading } = useRepositoryLifecycle(
        currentUserId,
        vault.isLoading,
        vault.docs.length,
        notes.length,
        notesBootSettled,
    );

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

    const handleMoveGlobalToRoom = useCallback(
        async (note: GlobalNote, roomId: string | null) => {
            await onSaveNote({ ...note, roomId });
            SmartToast.success(roomId ? 'تم النقل إلى الغرفة' : 'أُعيد إلى المستودع العام');
        },
        [onSaveNote],
    );

    const handleMoveVaultDocToRoom = useCallback(
        async (doc: SmartVaultDoc, roomId: string | null) => {
            const uid = vault.currentUserId || currentUserId || '';
            if (!uid) {
                SmartToast.error('يرجى تسجيل الدخول أولاً');
                return;
            }
            try {
                await SmartVaultDB.updateDoc(
                    { ...doc, roomId, updatedAt: new Date().toISOString() },
                    uid,
                );
                await vault.refreshDocs();
                SmartToast.success(roomId ? 'تم النقل إلى الغرفة' : 'أُعيد إلى المستودع العام');
            } catch {
                SmartToast.error('تعذّر نقل الملف');
            }
        },
        [currentUserId, vault],
    );

    const handleRemoveRoom = useCallback(
        async (roomId: string) => {
            const room = roomsApi.rooms.find((r) => r.id === roomId);
            const count = countItemsInRoom(roomId, notes, vault.docs);
            const ok = await confirmRepositoryRoomDelete(room?.title ?? 'الغرفة', count);
            if (!ok) return;

            const uid = vault.currentUserId || currentUserId || '';
            try {
                for (const note of notes) {
                    if ((note.roomId?.trim() || null) === roomId) {
                        await onSaveNote({ ...note, roomId: null });
                    }
                }
                if (uid) {
                    const affected = vault.docs.filter((d) => (d.roomId?.trim() || null) === roomId);
                    for (const doc of affected) {
                        await SmartVaultDB.updateDoc(
                            { ...doc, roomId: null, updatedAt: new Date().toISOString() },
                            uid,
                        );
                    }
                    if (affected.length > 0) await vault.refreshDocs();
                }
                roomsApi.deleteRoom(roomId);
                SmartToast.success('تم حذف الغرفة');
            } catch {
                SmartToast.error('تعذّر حذف الغرفة');
            }
        },
        [currentUserId, notes, onSaveNote, roomsApi, vault],
    );

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
        onResetComposer: compose.resetComposer,
        onCloseScanner: () => compose.setScannerOpen(false),
        onCloseFileViewer: vault.closeFileViewer,
        onCloseEditDoc: vault.closeEditDoc,
        onCancelPendingUpload: vault.cancelPendingUpload,
        onCloseModal: onRequestClose,
    });

    return (
        <VaultModalRootContext.Provider value={modalRoot}>
            <div
                ref={setModalRoot}
                className="flex flex-col min-h-0 flex-1 overflow-hidden relative z-[1]"
                data-testid="repository-unified-feed"
            >
                <RepositoryControlsSection
                    vault={vault}
                    unboundVaultDocs={feed.unboundVaultDocs}
                    notes={notes}
                    rooms={roomsApi.rooms}
                    pinnedRoomIds={roomsApi.pinnedRoomIds}
                    selectedRoomId={roomsApi.selectedRoomId}
                    onSelectRoom={roomsApi.setSelectedRoomId}
                    onCreateRoom={(title) => {
                        const result = roomsApi.createRoom(title);
                        if (result.reason === 'limit') {
                            SmartToast.error(`الحد الأقصى ${roomsApi.roomsSoftMax} غرفة — احذف غرفاً غير مستخدمة`);
                            return;
                        }
                        if (result.reason === 'duplicate') {
                            SmartToast.error('غرفة بهذا الاسم موجودة مسبقاً');
                            return;
                        }
                        if (result.room) SmartToast.success('تم إنشاء الغرفة');
                    }}
                    onRemoveRoom={(roomId) => void handleRemoveRoom(roomId)}
                    onTogglePinRoom={(roomId) => {
                        const result = roomsApi.togglePinRoom(roomId);
                        if (result.atLimit) {
                            SmartToast.error('يمكنك تثبيت 5 غرف فقط في الشريط العلوي');
                            return;
                        }
                        SmartToast.success(result.pinned ? 'ثُبّتت في الأعلى' : 'أُلغي التثبيت');
                    }}
                    onMainFilterChange={feed.selectMainFilter}
                    feedLayout={feed.feedLayout}
                    actionToolbarDisabled={actionToolbarDisabled}
                    onFeedLayoutChange={feed.handleFeedLayoutChange}
                    onCreateNote={() => compose.setComposing(true)}
                    onOpenScanner={() => compose.setScannerOpen(true)}
                    onOpenVoice={compose.openVoiceRecorder}
                />

                <div ref={feedScrollRef} className={REPO_BODY}>
                    {compose.composing ? (
                        <RepositoryComposePanel
                            title={compose.title}
                            bodyHtml={compose.bodyHtml}
                            isPinned={compose.isPinned}
                            attachmentFile={compose.attachmentFile}
                            saving={compose.saving}
                            editorRef={compose.editorRef}
                            attachInputRef={compose.attachInputRef}
                            onTitleChange={compose.setTitle}
                            onBodyChange={compose.setBodyHtml}
                            onAttachmentChange={compose.setAttachmentFile}
                            onTogglePinned={() => compose.setIsPinned((v) => !v)}
                            onSave={() => void compose.handleComposeSave()}
                            onCancel={compose.resetComposer}
                        />
                    ) : (
                        <RepositoryFeedSection
                            feedLoading={feedLoading}
                            activeFilter={feed.activeFilter}
                            items={feed.visibleByFilter[feed.activeFilter]}
                            feedLayout={feed.feedLayout}
                            layoutClass={feed.feedLayoutClass}
                            itemLayoutClass={feed.feedItemLayoutClass}
                            scrollParentRef={feedScrollRef}
                            searchQuery={vault.searchQuery}
                            lawsuitFiles={lawsuitFiles}
                            executionFiles={executionFiles}
                            dossiers={feed.dossiers}
                            vaultDocsById={feed.vaultDocsById}
                            rooms={roomsApi.rooms}
                            onMoveGlobalToRoom={handleMoveGlobalToRoom}
                            onMoveVaultDocToRoom={handleMoveVaultDocToRoom}
                            viewingVaultDocId={vault.viewingDocId}
                            onSaveGlobal={onSaveNote}
                            onDeleteGlobal={onDeleteNote}
                            onUpdateLawsuit={onUpdateLawsuitFile}
                            onUpdateExecution={onUpdateExecutionFile}
                            onLinkGlobalToDossier={compose.handleLinkGlobalToDossier}
                            onBindVaultDoc={compose.handleBindVaultDoc}
                            onDeleteVaultDoc={(doc) => void vault.handleDelete(doc)}
                            onEditVaultDoc={(doc) => vault.handleEdit(doc)}
                            onViewVaultDoc={(doc) => void vault.handleViewFile(doc)}
                            onCreateNote={() => compose.setComposing(true)}
                        />
                    )}
                </div>

                <RepositoryVaultOverlays
                    vault={vault}
                    scannerOpen={compose.scannerOpen}
                    onCloseScanner={() => compose.setScannerOpen(false)}
                    showVoiceRecorder={compose.showVoiceRecorder}
                    voiceRecorderKey={compose.voiceRecorderKey}
                    onCloseVoice={() => compose.setShowVoiceRecorder(false)}
                    onSaveVoice={(payload) => void compose.handleSaveVoice(payload)}
                    getDefaultRoomId={() => activeRoomIdRef.current}
                />
            </div>
        </VaultModalRootContext.Provider>
    );
}
