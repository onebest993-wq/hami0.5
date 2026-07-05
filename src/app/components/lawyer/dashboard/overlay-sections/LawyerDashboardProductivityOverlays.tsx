// @ts-nocheck
import React from 'react';

import { SmartRepositoryHost } from '@/app/components/lawyer/SmartRepository/SmartRepositoryHost';
import { FieldTasksSheetHost } from '@/app/components/lawyer/dashboard/fieldTasks/FieldTasksSheetHost';
import { FieldTasksManagerHost } from '@/app/components/lawyer/dashboard/fieldTasks/FieldTasksManagerHost';
import { HamiSettingsHost } from '@/app/components/lawyer/HamiSettings/HamiSettingsHost';
import { TransactionsThreadingHost } from '@/app/components/lawyer/TransactionsThreading/TransactionsThreadingHost';

import { TasksErrorBoundary } from '@/app/components/lawyer/dashboard/TasksErrorBoundary';
import { TransactionsErrorBoundary } from '@/app/components/lawyer/TransactionsThreading/TransactionsErrorBoundary';
import { RepositoryErrorBoundary } from '@/app/components/lawyer/SmartRepository/RepositoryErrorBoundary';

import type { LawyerDashboardOverlaysHostProps } from '../lawyerDashboardOverlaysHostBundles';
import { resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import {
    SUSPENDED_EXECUTION_FILES,
    SUSPENDED_GLOBAL_NOTES,
    SUSPENDED_LAWSUIT_FILES,
} from '@/app/constants/keepAliveSuspendedProps';

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
    const { onLogout, userId, authUserId, shapeClass } = shell;
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
        settingsHostMounted,
        closeSettings,
        resetSettingsShell,
        setShowSettings,
        enterHomeLayoutEdit,
        fieldTasksSheetOpen,
        fieldTasksHostMounted,
        fieldTasksManagerHostMounted,
        fieldTasksSheetSessionKey,
        closeFieldTasksSheet,
        showTasksManager,
        tasksManagerSessionKey,
        closeTasksManager,
        switchToTasksManager,
        showTransactions,
        closeTransactionsHub,
        transactionsFocusId,
        transactionsHostMounted,
        repositoryHostMounted,
    } = overlays;

    const tasksManagerFocusTaskId = overlays.tasksManagerFocusTaskId;
    const transactionsSessionKey = overlays.transactionsSessionKey;
    const transactionsUserId = resolveShellAuthUserId(authUserId, userId);
    const settingsUserId = transactionsUserId;
    const repositoryLive = isNotepadOpen || repositoryHostMounted;

    return (
        <>
            {fieldTasksSheetOpen || fieldTasksHostMounted ? (
                <FieldTasksSheetHost
                    key={`field-tasks-sheet-${fieldTasksSheetSessionKey}`}
                    open={fieldTasksSheetOpen}
                    onClose={closeFieldTasksSheet}
                    onManageAll={switchToTasksManager}
                    lawsuitFiles={fieldTasksSheetOpen ? files : SUSPENDED_LAWSUIT_FILES}
                    executionFiles={fieldTasksSheetOpen ? executionFiles : SUSPENDED_EXECUTION_FILES}
                />
            ) : null}

            {showTasksManager || fieldTasksManagerHostMounted ? (
                <TasksErrorBoundary onClose={closeTasksManager}>
                    <FieldTasksManagerHost
                        key={`tasks-manager-overlay-${tasksManagerSessionKey}`}
                        open={showTasksManager}
                        onClose={closeTasksManager}
                        focusTaskId={tasksManagerFocusTaskId}
                        lawsuitFiles={showTasksManager ? files : SUSPENDED_LAWSUIT_FILES}
                        executionFiles={showTasksManager ? executionFiles : SUSPENDED_EXECUTION_FILES}
                    />
                </TasksErrorBoundary>
            ) : null}

            {showSettings || settingsHostMounted ? (
                <HamiSettingsHost
                    key={`hami-settings-${settingsSessionKey}`}
                    open={showSettings}
                    userId={settingsUserId}
                    onShellReset={resetSettingsShell}
                    onClose={closeSettings}
                    onLogout={onLogout}
                    onEnterHomeLayoutEdit={enterHomeLayoutEdit}
                />
            ) : null}

            {isNotepadOpen || repositoryHostMounted ? (
                <RepositoryErrorBoundary onClose={closeNotepad}>
                    <SmartRepositoryHost
                        key={`smart-repository-${notepadSessionKey}`}
                        isOpen={isNotepadOpen}
                        onClose={closeNotepad}
                        initialTab={repositoryTab}
                        notepadMode={notepadMode}
                        focusNoteId={notepadFocusNoteId}
                        vaultOpenScanner={vaultOpenScanner}
                        notes={repositoryLive ? globalNotes : SUSPENDED_GLOBAL_NOTES}
                        lawsuitFiles={repositoryLive ? files : SUSPENDED_LAWSUIT_FILES}
                        executionFiles={repositoryLive ? executionFiles : SUSPENDED_EXECUTION_FILES}
                        currentUserId={resolveShellAuthUserId(authUserId, userId) ?? userId}
                        onSaveNote={handleSaveNote}
                        onDeleteNote={handleDeleteNote}
                        onUpdateLawsuitFile={handleUpdateFile}
                        onUpdateExecutionFile={handleUpdateExecutionFile}
                    />
                </RepositoryErrorBoundary>
            ) : null}

            {(showTransactions || transactionsHostMounted) && transactionsUserId ? (
                <TransactionsErrorBoundary onClose={closeTransactionsHub}>
                    <TransactionsThreadingHost
                        key={`transactions-hub-${transactionsSessionKey}`}
                        open={showTransactions}
                        onBack={closeTransactionsHub}
                        userId={transactionsUserId}
                        initialTransactionId={transactionsFocusId}
                    />
                </TransactionsErrorBoundary>
            ) : null}
        </>
    );
}
