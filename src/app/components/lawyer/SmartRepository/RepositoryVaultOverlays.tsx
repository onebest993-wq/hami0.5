import React, { memo } from 'react';
import { VoiceRecorderErrorBoundary } from '@/app/components/lawyer/ActionModals/VoiceRecorderErrorBoundary';
import { VaultUploadMetaSheet } from '@/app/components/lawyer/SmartVaultModal/VaultUploadMetaSheet';
import { VaultDocEditSheet } from '@/app/components/lawyer/SmartVaultModal/VaultDocEditSheet';
import { VaultDocViewer } from '@/app/components/lawyer/SmartVaultModal/VaultDocViewer';
import type { useSmartVault } from '@/app/components/lawyer/hooks/useSmartVault';
import { RepositoryScannerPanel, RepositoryVoiceRecorder } from './RepositoryLazyPanels';
import { saveVoiceNoteToNotepad } from '@/app/components/lawyer/dashboard/notepadVoiceSave';

type VaultOverlayApi = Pick<
    ReturnType<typeof useSmartVault>,
    | 'currentUserId'
    | 'customCategories'
    | 'addVaultCategory'
    | 'refreshDocs'
    | 'pendingUpload'
    | 'uploadQueueCount'
    | 'isSavingMeta'
    | 'confirmPendingUpload'
    | 'cancelPendingUpload'
    | 'editDoc'
    | 'isSavingEdit'
    | 'saveDocEdit'
    | 'closeEditDoc'
    | 'fileViewer'
    | 'closeFileViewer'
>;

type RepositoryVaultOverlaysProps = {
    vault: VaultOverlayApi;
    scannerOpen: boolean;
    onCloseScanner: () => void;
    showVoiceRecorder: boolean;
    voiceRecorderKey: number;
    onCloseVoice: () => void;
    onSaveVoice: (payload: Parameters<typeof saveVoiceNoteToNotepad>[0]) => void | Promise<void>;
};

export const RepositoryVaultOverlays = memo(function RepositoryVaultOverlays({
    vault,
    scannerOpen,
    onCloseScanner,
    showVoiceRecorder,
    voiceRecorderKey,
    onCloseVoice,
    onSaveVoice,
}: RepositoryVaultOverlaysProps) {
    return (
        <>
            {scannerOpen ? (
                <RepositoryScannerPanel
                    userId={vault.currentUserId}
                    onClose={onCloseScanner}
                    onSaved={() => void vault.refreshDocs()}
                    onViewDoc={onCloseScanner}
                    onCategoryUsed={vault.addVaultCategory}
                    categorySuggestions={vault.customCategories}
                />
            ) : null}

            {vault.pendingUpload ? (
                <VaultUploadMetaSheet
                    file={vault.pendingUpload.file}
                    uploadKind={vault.pendingUpload.kind}
                    previewUrl={vault.pendingUpload.previewUrl}
                    queueRemaining={vault.uploadQueueCount}
                    isSaving={vault.isSavingMeta}
                    categorySuggestions={vault.customCategories}
                    onAddCategory={vault.addVaultCategory}
                    onConfirm={(meta) => void vault.confirmPendingUpload(meta)}
                    onCancel={vault.cancelPendingUpload}
                    overlayScope="viewport"
                />
            ) : null}

            {vault.editDoc ? (
                <VaultDocEditSheet
                    doc={vault.editDoc}
                    isSaving={vault.isSavingEdit}
                    categorySuggestions={vault.customCategories}
                    onAddCategory={vault.addVaultCategory}
                    onSave={(values) => void vault.saveDocEdit(values)}
                    onClose={vault.closeEditDoc}
                    overlayScope="viewport"
                />
            ) : null}

            {vault.fileViewer ? (
                <VaultDocViewer
                    doc={vault.fileViewer.doc}
                    fileUrl={vault.fileViewer.url}
                    kind={vault.fileViewer.kind}
                    onClose={vault.closeFileViewer}
                    overlayScope="viewport"
                />
            ) : null}

            {showVoiceRecorder ? (
                <VoiceRecorderErrorBoundary onClose={onCloseVoice}>
                    <RepositoryVoiceRecorder
                        recorderKey={voiceRecorderKey}
                        onClose={onCloseVoice}
                        onSaveVoice={onSaveVoice}
                    />
                </VoiceRecorderErrorBoundary>
            ) : null}
        </>
    );
});
