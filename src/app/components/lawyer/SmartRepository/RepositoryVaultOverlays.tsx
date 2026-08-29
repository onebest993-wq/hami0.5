import React, { lazy, memo, Suspense } from 'react';
import { Loader2 } from '@/app/components/ui/icons/Loader2';
import { VoiceRecorderErrorBoundary } from '@/app/components/lawyer/ActionModals/VoiceRecorderErrorBoundary';
import type { useSmartVault } from '@/app/components/lawyer/hooks/useSmartVault';
import { SmartVaultDB } from '@/app/services/vault/smartVaultRuntime';
import { RepositoryScannerPanel, RepositoryVoiceRecorder } from './RepositoryLazyPanels';
import { saveVoiceNoteToNotepad } from '@/app/components/lawyer/dashboard/notepadVoiceSave';
import {
    mergeScannedDocForFeed,
    resolveScannedDocCategory,
    shouldSwitchVaultFilterForNewScan,
} from './commitScannedVaultDoc';

const LazyVaultUploadMetaSheet = lazy(() =>
    import('@/app/components/lawyer/SmartVaultModal/VaultUploadMetaSheet').then((m) => ({
        default: m.VaultUploadMetaSheet,
    })),
);

const LazyVaultDocEditSheet = lazy(() =>
    import('@/app/components/lawyer/SmartVaultModal/VaultDocEditSheet').then((m) => ({
        default: m.VaultDocEditSheet,
    })),
);

const LazyVaultDocViewer = lazy(() =>
    import('@/app/components/lawyer/SmartVaultModal/VaultDocViewer').then((m) => ({
        default: m.VaultDocViewer,
    })),
);

function OverlayFallback() {
    return (
        <div
            className="flex items-center justify-center py-10"
            aria-busy="true"
            data-testid="vault-overlay-lazy-fallback"
        >
            <Loader2 size={28} className="text-[#E6C673] animate-spin" />
        </div>
    );
}

type VaultOverlayApi = Pick<
    ReturnType<typeof useSmartVault>,
    | 'currentUserId'
    | 'customCategories'
    | 'addVaultCategory'
    | 'setActiveFilter'
    | 'activeFilter'
    | 'prependVaultDoc'
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
    | 'handleViewFile'
>;

type RepositoryVaultOverlaysProps = {
    vault: VaultOverlayApi;
    scannerOpen: boolean;
    onCloseScanner: () => void;
    showVoiceRecorder: boolean;
    voiceRecorderKey: number;
    onCloseVoice: () => void;
    onSaveVoice: (payload: Parameters<typeof saveVoiceNoteToNotepad>[0]) => void | Promise<void>;
    getDefaultRoomId?: () => string | null;
};

export const RepositoryVaultOverlays = memo(function RepositoryVaultOverlays({
    vault,
    scannerOpen,
    onCloseScanner,
    showVoiceRecorder,
    voiceRecorderKey,
    onCloseVoice,
    onSaveVoice,
    getDefaultRoomId,
}: RepositoryVaultOverlaysProps) {
    return (
        <>
            {scannerOpen ? (
                <RepositoryScannerPanel
                    userId={vault.currentUserId}
                    onClose={onCloseScanner}
                    onSaved={(result) => {
                        const roomId = getDefaultRoomId?.() ?? null;
                        const category = resolveScannedDocCategory(result.doc);
                        const doc = mergeScannedDocForFeed(result.doc, roomId, category);
                        if (doc !== result.doc && vault.currentUserId) {
                            void SmartVaultDB.updateDoc(doc, vault.currentUserId).catch(() => undefined);
                        }
                        vault.prependVaultDoc(doc);
                        vault.addVaultCategory(category);
                        if (shouldSwitchVaultFilterForNewScan(vault.activeFilter, category)) {
                            vault.setActiveFilter(category);
                        }
                    }}
                    onViewDoc={(doc) => {
                        onCloseScanner();
                        void vault.handleViewFile(doc);
                    }}
                    onCategoryUsed={vault.addVaultCategory}
                    categorySuggestions={vault.customCategories}
                />
            ) : null}

            {vault.pendingUpload ? (
                <Suspense fallback={<OverlayFallback />}>
                    <LazyVaultUploadMetaSheet
                        file={vault.pendingUpload.file}
                        uploadKind={vault.pendingUpload.kind}
                        previewUrl={vault.pendingUpload.previewUrl}
                        queueRemaining={vault.uploadQueueCount}
                        isSaving={vault.isSavingMeta}
                        categorySuggestions={vault.customCategories}
                        onAddCategory={vault.addVaultCategory}
                        onConfirm={(meta) => void vault.confirmPendingUpload(meta)}
                        onCancel={vault.cancelPendingUpload}
                        overlayScope="panel"
                    />
                </Suspense>
            ) : null}

            {vault.editDoc ? (
                <Suspense fallback={<OverlayFallback />}>
                    <LazyVaultDocEditSheet
                        doc={vault.editDoc}
                        isSaving={vault.isSavingEdit}
                        categorySuggestions={vault.customCategories}
                        onAddCategory={vault.addVaultCategory}
                        onSave={(values) => void vault.saveDocEdit(values)}
                        onClose={vault.closeEditDoc}
                        overlayScope="panel"
                    />
                </Suspense>
            ) : null}

            {vault.fileViewer ? (
                <Suspense fallback={<OverlayFallback />}>
                    <LazyVaultDocViewer
                        doc={vault.fileViewer.doc}
                        fileUrl={vault.fileViewer.url}
                        fileBlob={vault.fileViewer.blob}
                        kind={vault.fileViewer.kind}
                        onClose={vault.closeFileViewer}
                        overlayScope="viewport"
                    />
                </Suspense>
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
