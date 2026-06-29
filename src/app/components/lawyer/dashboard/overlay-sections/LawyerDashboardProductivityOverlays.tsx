// @ts-nocheck
import React, { Suspense, useCallback } from 'react';

import {
    LazyFieldTasksBottomSheet,
    LazyHamiSettings,
    LazySmartRepositoryModal,
    LazyTasksManagerOverlay,
    LazyTransactionsThreadingSystem,
} from '@/app/utils/lazyComponents';

import { TasksErrorBoundary } from '@/app/components/lawyer/dashboard/TasksErrorBoundary';
import { TransactionsErrorBoundary } from '@/app/components/lawyer/TransactionsThreading/TransactionsErrorBoundary';
import { RepositoryErrorBoundary } from '@/app/components/lawyer/SmartRepository/RepositoryErrorBoundary';
import {
    FieldTasksSheetFallback,
    RepositoryShellFallback,
    SettingsScreenLoadingFallback,
    TasksManagerFallback,
    TransactionsHubFallback,
} from '@/app/components/lawyer/LawyerDashboardParts/LazyFallback';

import type { LawyerDashboardOverlaysHostProps } from '../lawyerDashboardOverlaysHostBundles';
import { resolveShellAuthUserId } from '@/app/services/auth/shellAuth';

export function LawyerDashboardProductivityOverlays({
    shell,
    data,
    overlays,
    notepad,
    nav,
    dossier,
    archive,
}: Pick<
    LawyerDashboardOverlaysHostProps,
    'shell' | 'data' | 'overlays' | 'notepad' | 'nav' | 'dossier' | 'archive'
>) {
    const { onLogout, onAppNavigate, userId, authUserId, shapeClass } = shell;
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

    const { setActiveTab, refreshAppAlerts } = nav;
    const { setActiveFile, handleUpdateFile, handleUpdateExecutionFile } = dossier;
    const { setArchiveType } = archive;

    const {
        showSettings,
        settingsSessionKey,
        closeSettings,
        resetSettingsShell,
        setShowSettings,
        enterHomeLayoutEdit,
        openProfileTab,
        fieldTasksSheetOpen,
        closeFieldTasksSheet,
        showTasksManager,
        closeTasksManager,
        switchToTasksManager,
        showTransactions,
        closeTransactionsHub,
        transactionsFocusId,
    } = overlays;

    const tasksManagerFocusTaskId = overlays.tasksManagerFocusTaskId;
    const transactionsSessionKey = overlays.transactionsSessionKey;
    const transactionsUserId = resolveShellAuthUserId(authUserId, userId);
    const settingsUserId = transactionsUserId;

    return (
        <>
            {fieldTasksSheetOpen ? (
                <Suspense fallback={FieldTasksSheetFallback}>
                    <LazyFieldTasksBottomSheet
                        key="field-tasks-sheet"
                        open={fieldTasksSheetOpen}
                        onClose={closeFieldTasksSheet}
                        onManageAll={switchToTasksManager}
                        lawsuitFiles={files}
                        executionFiles={executionFiles}
                    />
                </Suspense>
            ) : null}

            {showTasksManager ? (
                <Suspense fallback={TasksManagerFallback}>
                    <TasksErrorBoundary onClose={closeTasksManager}>
                        <LazyTasksManagerOverlay
                            key="tasks-manager-overlay"
                            open={showTasksManager}
                            onClose={closeTasksManager}
                            focusTaskId={tasksManagerFocusTaskId}
                            lawsuitFiles={files}
                            executionFiles={executionFiles}
                        />
                    </TasksErrorBoundary>
                </Suspense>
            ) : null}

            {showSettings ? (
                <Suspense fallback={<SettingsScreenLoadingFallback onClose={closeSettings} />}>
                    <LazyHamiSettings
                        key={`hami-settings-${settingsSessionKey}`}
                        open={showSettings}
                        userId={settingsUserId}
                        onShellReset={resetSettingsShell}
                        onClose={closeSettings}
                            onEnterHomeLayoutEdit={enterHomeLayoutEdit}
                            onLogout={onLogout}
                            onOpenProfile={() => {
                                closeSettings();
                                openProfileTab();
                            }}
                            onOpenPrivacy={() => {
                                closeSettings();
                                onAppNavigate?.('privacy');
                            }}
                        />
                </Suspense>
            ) : null}

            {isNotepadOpen ? (
                <Suspense fallback={RepositoryShellFallback}>
                    <RepositoryErrorBoundary onClose={closeNotepad}>
                        <LazySmartRepositoryModal
                            key="smart-repository-modal"
                            isOpen={isNotepadOpen}
                            onClose={closeNotepad}
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
                            onUpdateExecutionFile={handleUpdateExecutionFile}
                        />
                    </RepositoryErrorBoundary>
                </Suspense>
            ) : null}

            {showTransactions && transactionsUserId ? (
                <Suspense fallback={TransactionsHubFallback}>
                    <TransactionsErrorBoundary onClose={closeTransactionsHub}>
                        <LazyTransactionsThreadingSystem
                            key={`transactions-hub-${transactionsSessionKey}`}
                            open={showTransactions}
                            onBack={closeTransactionsHub}
                            userId={transactionsUserId}
                            initialTransactionId={transactionsFocusId}
                        />
                    </TransactionsErrorBoundary>
                </Suspense>
            ) : null}
        </>
    );
}
