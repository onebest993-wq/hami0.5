import React from 'react';
import { RepositoryErrorBoundary } from '@/app/components/lawyer/SmartRepository/RepositoryErrorBoundary';
import { SmartRepositoryHost } from '@/app/components/lawyer/SmartRepository/SmartRepositoryHost';
import { resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import {
    SUSPENDED_EXECUTION_FILES,
    SUSPENDED_GLOBAL_NOTES,
    SUSPENDED_LAWSUIT_FILES,
} from '@/app/constants/keepAliveSuspendedProps';
import type { LawyerDashboardOverlaysBundleProps } from '../lawyerDashboardOverlaysBundles';

/**
 * المستودع الذكي — Entry sync من MainView؛ Host sync داخل الـ chunk
 * (بلا Suspense مزدوج — InstantShell فقط داخل Host إن لم تُجهَّز الـ Modal).
 */
export function LawyerDashboardRepositoryOverlayEntry({
    shell,
    data,
    overlays,
    notepad,
    dossier,
}: Pick<LawyerDashboardOverlaysBundleProps, 'shell' | 'data' | 'overlays' | 'notepad' | 'dossier'>) {
    const { userId, authUserId } = shell;
    const { files, executionFiles, globalNotes, notesBootSettled = true } = data;
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

    const repositoryLive = isNotepadOpen || repositoryHostMounted;

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
                notes={repositoryLive ? globalNotes : SUSPENDED_GLOBAL_NOTES}
                notesBootSettled={repositoryLive ? notesBootSettled : true}
                lawsuitFiles={repositoryLive ? files : SUSPENDED_LAWSUIT_FILES}
                executionFiles={repositoryLive ? executionFiles : SUSPENDED_EXECUTION_FILES}
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
