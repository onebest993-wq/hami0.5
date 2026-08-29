import React from 'react';
import { RepositoryErrorBoundary } from '@/app/components/lawyer/SmartRepository/RepositoryErrorBoundary';
import { SmartRepositoryHost } from '@/app/components/lawyer/SmartRepository/SmartRepositoryHost';
import { resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import type { LawyerDashboardOverlaysBundleProps } from '../lawyerDashboardOverlaysBundles';

/**
 * المستودع الذكي — Host + Modal ثابتان؛ keepAlive يبقي الطبقة مخفية للكشف اللحظي.
 */
export function LawyerDashboardRepositoryOverlayEntry({
    shell,
    data,
    overlays,
    notepad,
    dossier,
}: Pick<LawyerDashboardOverlaysBundleProps, 'shell' | 'data' | 'overlays' | 'notepad' | 'dossier'>) {
    const { userId, authUserId } = shell;
    const { files, executionFiles, globalNotes } = data;
    const {
        isNotepadOpen,
        closeNotepad,
        notepadMode,
        notepadFocusNoteId,
        notepadSessionKey,
        repositoryTab,
        vaultOpenScanner,
        handleSaveNote,
        handleDeleteNote,
    } = notepad;
    const { repositoryHostMounted } = overlays;
    const { handleUpdateFile, handleUpdateExecutionFile } = dossier;

    const shouldMount = isNotepadOpen || repositoryHostMounted;
    if (!shouldMount) return null;

    return (
        <RepositoryErrorBoundary onClose={closeNotepad}>
            <SmartRepositoryHost
                key={`smart-repository-${notepadSessionKey}`}
                isOpen={isNotepadOpen}
                onClose={closeNotepad}
                keepAlive={repositoryHostMounted}
                initialTab={repositoryTab}
                notepadMode={notepadMode}
                focusNoteId={notepadFocusNoteId}
                vaultOpenScanner={vaultOpenScanner}
                notes={globalNotes}
                lawsuitFiles={files}
                executionFiles={executionFiles}
                currentUserId={resolveShellAuthUserId(authUserId, userId) ?? userId}
                onSaveNote={handleSaveNote}
                onDeleteNote={handleDeleteNote}
                onUpdateLawsuitFile={handleUpdateFile}
                onUpdateExecutionFile={(file) =>
                    handleUpdateExecutionFile(
                        file as unknown as Parameters<typeof handleUpdateExecutionFile>[0],
                    )
                }
            />
        </RepositoryErrorBoundary>
    );
}
