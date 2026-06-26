// @ts-nocheck

import React, { Suspense } from 'react';

import {

    EXEC_OVERLAY_LAZY_FALLBACK,

    LazyDossierMetaEditSection,

    LazyExecutionHeirsQuickViewModal,

    LazyExecutionTrashModal,

    LazyPartyEditModal,

    LazyPermanentDeleteConfirmDialog,

    LazyTimelineEditModal,

} from '@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell';

export type ExecutionDashboardEditOverlaysProps = {

    showExecutionTrashModal: boolean;

    trashedTimelineEvents: unknown[];

    trashedCaseNotes: unknown[];

    trashedCaseTasks: unknown[];

    setShowExecutionTrashModal: (open: boolean) => void;

    restoreTimelineEventFromTrash: (id: string) => void;

    setPermanentDeleteTimelineId: (id: string | null) => void;

    restoreCaseNoteFromTrash: (id: string) => void;

    permanentlyDeleteCaseNote: (id: string) => void;

    restoreCaseTaskFromTrash: (id: string) => void;

    permanentlyDeleteCaseTask: (id: string) => void;

    timelineEditDraft: unknown | null;

    setTimelineEditDraft: (draft: unknown | null) => void;

    saveTimelineEditDraft: () => void;

    moveTimelineEventToTrash: (event: unknown) => void;

    showEditDossierMetaModal: boolean;

    dossierMetaDraft: unknown;

    isEvictionExecutionModule: boolean;

    setShowEditDossierMetaModal: (open: boolean) => void;

    setDossierMetaDraft: (draft: unknown) => void;

    saveDossierMetaDraft: () => void;

    editPartyTarget: unknown | null;

    setEditPartyTarget: (target: unknown | null) => void;

    partyEditDraft: unknown;

    setPartyEditDraft: (draft: unknown) => void;

    partyEditHeirDeleteConfirmIdx: number | null;

    setPartyEditHeirDeleteConfirmIdx: (idx: number | null) => void;

    savePartyEditDraft: () => void;

    togglePartyEditHeirClient: (idx: number) => void;

    removeHeirFromPartyEditDraftAtIndex: (idx: number) => void;

    decisionsStorageExecutionId: string | null;

    heirsQuickView: unknown | null;

    setHeirsQuickView: (view: unknown | null) => void;

    X: React.ComponentType<{ className?: string }>;

    permanentDeleteTimelineId: string | null;

    permanentlyDeleteTimelineEvent: (id: string) => void;

};



/** نوافذ تحرير/سلة المهملات — lazy + prefetch عند أول hover على سلة المهملات */

export function ExecutionDashboardEditOverlays(props: ExecutionDashboardEditOverlaysProps) {

    const {

        showExecutionTrashModal,

        trashedTimelineEvents,

        trashedCaseNotes,

        trashedCaseTasks,

        setShowExecutionTrashModal,

        restoreTimelineEventFromTrash,

        setPermanentDeleteTimelineId,

        restoreCaseNoteFromTrash,

        permanentlyDeleteCaseNote,

        restoreCaseTaskFromTrash,

        permanentlyDeleteCaseTask,

        timelineEditDraft,

        setTimelineEditDraft,

        saveTimelineEditDraft,

        moveTimelineEventToTrash,

        showEditDossierMetaModal,

        dossierMetaDraft,

        isEvictionExecutionModule,

        setShowEditDossierMetaModal,

        setDossierMetaDraft,

        saveDossierMetaDraft,

        editPartyTarget,

        setEditPartyTarget,

        partyEditDraft,

        setPartyEditDraft,

        partyEditHeirDeleteConfirmIdx,

        setPartyEditHeirDeleteConfirmIdx,

        savePartyEditDraft,

        togglePartyEditHeirClient,

        removeHeirFromPartyEditDraftAtIndex,

        decisionsStorageExecutionId,

        heirsQuickView,

        setHeirsQuickView,

        X,

        permanentDeleteTimelineId,

        permanentlyDeleteTimelineEvent,

    } = props;



    return (

        <>

            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>

                <LazyExecutionTrashModal

                    visible={showExecutionTrashModal}

                    trashedTimelineEvents={trashedTimelineEvents}

                    trashedCaseNotes={trashedCaseNotes}

                    trashedCaseTasks={trashedCaseTasks}

                    onClose={() => setShowExecutionTrashModal(false)}

                    onRestoreTimelineEvent={restoreTimelineEventFromTrash}

                    onPermanentDeleteTimeline={setPermanentDeleteTimelineId}

                    onRestoreCaseNote={restoreCaseNoteFromTrash}

                    onPermanentDeleteCaseNote={permanentlyDeleteCaseNote}

                    onRestoreCaseTask={restoreCaseTaskFromTrash}

                    onPermanentDeleteCaseTask={permanentlyDeleteCaseTask}

                />

            </Suspense>



            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>

                <LazyTimelineEditModal

                    visible={!!timelineEditDraft}

                    timelineEvent={timelineEditDraft}

                    onClose={() => setTimelineEditDraft(null)}

                    onSave={saveTimelineEditDraft}

                    onDelete={() => {

                        if (timelineEditDraft) moveTimelineEventToTrash(timelineEditDraft);

                    }}

                />

            </Suspense>



            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>

                <LazyDossierMetaEditSection

                    showEditDossierMetaModal={showEditDossierMetaModal}

                    dossierMetaDraft={dossierMetaDraft}

                    isEvictionExecutionModule={isEvictionExecutionModule}

                    setShowEditDossierMetaModal={setShowEditDossierMetaModal}

                    setDossierMetaDraft={setDossierMetaDraft}

                    saveDossierMetaDraft={saveDossierMetaDraft}

                />

            </Suspense>



            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>

                <LazyPartyEditModal

                    editPartyTarget={editPartyTarget}

                    setEditPartyTarget={setEditPartyTarget}

                    partyEditDraft={partyEditDraft}

                    setPartyEditDraft={setPartyEditDraft}

                    partyEditHeirDeleteConfirmIdx={partyEditHeirDeleteConfirmIdx}

                    setPartyEditHeirDeleteConfirmIdx={setPartyEditHeirDeleteConfirmIdx}

                    savePartyEditDraft={savePartyEditDraft}

                    togglePartyEditHeirClient={togglePartyEditHeirClient}

                    removeHeirFromPartyEditDraftAtIndex={removeHeirFromPartyEditDraftAtIndex}

                    decisionsStorageExecutionId={decisionsStorageExecutionId}

                />

            </Suspense>



            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>

                <LazyExecutionHeirsQuickViewModal

                    heirsQuickView={heirsQuickView}

                    setHeirsQuickView={setHeirsQuickView}

                    X={X}

                />

            </Suspense>



            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>

                <LazyPermanentDeleteConfirmDialog

                    permanentDeleteTimelineId={permanentDeleteTimelineId}

                    setPermanentDeleteTimelineId={setPermanentDeleteTimelineId}

                    permanentlyDeleteTimelineEvent={permanentlyDeleteTimelineEvent}

                />

            </Suspense>

        </>

    );

}

