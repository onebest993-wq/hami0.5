import React, { useRef, useState } from 'react';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { useSmartVault } from '@/app/components/lawyer/hooks/useSmartVault';
import type { RepositoryFeedFilter } from '@/app/services/repository/repositoryUnifiedFeed';
import { VaultModalRootContext } from '@/app/components/lawyer/SmartVaultModal/VaultModalRootContext';
import { REPO_BODY } from './smartRepositoryTheme';
import { RepositoryControlsSection } from './RepositoryControlsSection';
import { RepositoryComposePanel } from './RepositoryComposePanel';
import { RepositoryFeedSection } from './RepositoryFeedSection';
import { RepositoryVaultOverlays } from './RepositoryVaultOverlays';
import { useRepositoryFeed } from './hooks/useRepositoryFeed';
import { useRepositoryCompose, useRepositoryVaultDocHandlers } from './hooks/useRepositoryCompose';
import { useRepositoryLifecycle } from './hooks/useRepositoryLifecycle';
import { useRepositoryEscapeStack } from './hooks/useRepositoryEscapeStack';

export type SmartRepositoryUnifiedFeedProps = {
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

export function SmartRepositoryUnifiedFeed({
    currentUserId,
    notes,
    lawsuitFiles,
    executionFiles,
    startMode,
    focusNoteId,
    initialFilter = 'all',
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

    const vault = useSmartVault(() => undefined, currentUserId, { embedded: true });
    const vaultRef = useRef(vault);
    vaultRef.current = vault;

    const { feedLoading } = useRepositoryLifecycle(
        currentUserId,
        vault.isLoading,
        vault.docs.length,
        notes.length,
    );

    const feed = useRepositoryFeed({
        notes,
        lawsuitFiles,
        executionFiles,
        vaultDocs: vault.docs,
        vaultCategoryFilter: vault.activeFilter,
        vaultSearchQuery: vault.searchQuery,
        initialFilter,
        focusNoteId,
        feedScrollRef,
        vault,
    });

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
    });

    const { handleEditVaultDoc, handleViewVaultDoc, handleDeleteVaultDoc } =
        useRepositoryVaultDocHandlers(vaultRef);

    useRepositoryEscapeStack({
        enabled: escapeEnabled,
        composing: compose.composing,
        scannerOpen: compose.scannerOpen,
        showVoiceRecorder: compose.showVoiceRecorder,
        onResetComposer: compose.resetComposer,
        onCloseScanner: () => compose.setScannerOpen(false),
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
                    activeFilter={feed.activeFilter}
                    filterCounts={feed.filterCounts}
                    feedLayout={feed.feedLayout}
                    onSelectMainFilter={feed.selectMainFilter}
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
                    ) : null}

                    <RepositoryFeedSection
                        feedLoading={feedLoading}
                        activeFilter={feed.activeFilter}
                        items={feed.visibleByFilter[feed.activeFilter]}
                        feedLayout={feed.feedLayout}
                        layoutClass={feed.feedLayoutClass}
                        itemLayoutClass={feed.feedItemLayoutClass}
                        searchQuery={vault.searchQuery}
                        lawsuitFiles={lawsuitFiles}
                        executionFiles={executionFiles}
                        dossiers={feed.dossiers}
                        vaultDocsById={feed.vaultDocsById}
                        viewingVaultDocId={vault.viewingDocId}
                        onSaveGlobal={onSaveNote}
                        onDeleteGlobal={onDeleteNote}
                        onUpdateLawsuit={onUpdateLawsuitFile}
                        onUpdateExecution={onUpdateExecutionFile}
                        onLinkGlobalToDossier={compose.handleLinkGlobalToDossier}
                        onBindVaultDoc={compose.handleBindVaultDoc}
                        onDeleteVaultDoc={handleDeleteVaultDoc}
                        onEditVaultDoc={handleEditVaultDoc}
                        onViewVaultDoc={handleViewVaultDoc}
                    />
                </div>

                <RepositoryVaultOverlays
                    vault={vault}
                    scannerOpen={compose.scannerOpen}
                    onCloseScanner={() => compose.setScannerOpen(false)}
                    showVoiceRecorder={compose.showVoiceRecorder}
                    voiceRecorderKey={compose.voiceRecorderKey}
                    onCloseVoice={() => compose.setShowVoiceRecorder(false)}
                    onSaveVoice={(payload) => void compose.handleSaveVoice(payload)}
                />
            </div>
        </VaultModalRootContext.Provider>
    );
}
