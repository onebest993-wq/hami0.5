import { lazy, memo, Suspense } from 'react';
import { REPO_BODY } from './smartRepositoryTheme';
import { RepositoryControlsSection } from './RepositoryControlsSection';
import { RepositoryFeedPanel } from './RepositoryFeedPanel';
import {
    useRepositoryUnifiedFeedModel,
    type UseRepositoryUnifiedFeedModelParams,
} from './hooks/useRepositoryUnifiedFeedModel';

const RepositoryComposePanel = lazy(() =>
    import('./RepositoryComposePanel').then((m) => ({ default: m.RepositoryComposePanel })),
);
const RepositoryVaultOverlays = lazy(() =>
    import('./RepositoryVaultOverlays').then((m) => ({ default: m.RepositoryVaultOverlays })),
);

type SmartRepositoryUnifiedFeedProps = UseRepositoryUnifiedFeedModelParams;

export const SmartRepositoryUnifiedFeed = memo(function SmartRepositoryUnifiedFeed(
    props: SmartRepositoryUnifiedFeedProps,
) {
    const {
        notes,
        lawsuitFiles,
        executionFiles,
        onSaveNote,
        onDeleteNote,
        onUpdateLawsuitFile,
        onUpdateExecutionFile,
        focusNoteId,
    } = props;
    const {
        feedScrollRef,
        roomsApi,
        roomsActions,
        vault,
        feed,
        compose,
        actionToolbarDisabled,
        activeRoomIdRef,
    } = useRepositoryUnifiedFeedModel(props);

    const overlaysLive = Boolean(
        vault.pendingUpload ||
            vault.editDoc ||
            vault.fileViewer ||
            compose.scannerOpen ||
            compose.showVoiceRecorder,
    );

    return (
        <div
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
                onCreateRoom={roomsActions.handleCreateRoom}
                onRemoveRoom={(roomId) => void roomsActions.handleRemoveRoom(roomId)}
                onTogglePinRoom={roomsActions.handleTogglePinRoom}
                feedLayout={feed.feedLayout}
                actionToolbarDisabled={actionToolbarDisabled}
                onFeedLayoutChange={feed.handleFeedLayoutChange}
                onCreateNote={() => compose.setComposing(true)}
                onOpenScanner={() => compose.setScannerOpen(true)}
                onOpenVoice={compose.openVoiceRecorder}
            />

            <div ref={feedScrollRef} className={REPO_BODY}>
                {compose.composing ? (
                    <Suspense fallback={null}>
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
                            onCancel={() => {
                                if (!compose.saving) compose.resetComposer();
                            }}
                        />
                    </Suspense>
                ) : (
                    <RepositoryFeedPanel
                        filter={feed.activeFilter}
                        items={feed.visibleByFilter[feed.activeFilter]}
                        feedLayout={feed.feedLayout}
                        searchQuery={vault.searchQuery}
                        lawsuitFiles={lawsuitFiles}
                        executionFiles={executionFiles}
                        dossiers={feed.dossiers}
                        vaultDocsById={feed.vaultDocsById}
                        rooms={roomsApi.rooms}
                        onMoveGlobalToRoom={roomsActions.handleMoveGlobalToRoom}
                        onMoveVaultDocToRoom={roomsActions.handleMoveVaultDocToRoom}
                        onSaveGlobal={onSaveNote}
                        onDeleteGlobal={onDeleteNote}
                        onUpdateLawsuit={onUpdateLawsuitFile}
                        onUpdateExecution={onUpdateExecutionFile}
                        onLinkGlobalToDossier={compose.handleLinkGlobalToDossier}
                        onBindVaultDoc={compose.handleBindVaultDoc}
                        onDeleteVaultDoc={(doc) => void vault.handleDelete(doc)}
                        onEditVaultDoc={(doc) => vault.handleEdit(doc)}
                        onViewVaultDoc={(doc) => void vault.handleViewFile(doc)}
                        viewingVaultDocId={vault.viewingDocId}
                        scrollParentRef={feedScrollRef}
                        focusNoteId={focusNoteId}
                    />
                )}
            </div>

            {overlaysLive ? (
                <Suspense fallback={null}>
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
                </Suspense>
            ) : null}
        </div>
    );
});
