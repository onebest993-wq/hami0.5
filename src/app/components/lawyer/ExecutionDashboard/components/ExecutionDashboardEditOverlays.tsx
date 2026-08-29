import React, { Suspense } from 'react';
import type { DossierMetaEditSectionProps } from './DossierMetaEditSection';
import type { PartyEditModalProps } from './PartyEditModal';
import type { TimelineEvent } from '@/app/types/execution';
import type { ExecutionTrashModalProps } from './ExecutionTrashModal';
import type { ExecutionHeirsQuickViewModalProps } from './ExecutionHeirsQuickViewModal';
import { ExecutionNamedOverlayInstantFrame } from './executionOverlayInstantPresets';
import {
    LazyDossierMetaEditSection,
    LazyExecutionHeirsQuickViewModal,
    LazyExecutionTrashModal,
    LazyPartyEditModal,
    LazyPermanentDeleteConfirmDialog,
    LazyTimelineEditModal,
} from '@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyRegistryOverlays';

export type ExecutionDashboardEditOverlaysProps = {
    showExecutionTrashModal: boolean;
    trashedTimelineEvents: ExecutionTrashModalProps['trashedTimelineEvents'];
    trashedCaseNotes: ExecutionTrashModalProps['trashedCaseNotes'];
    trashedCaseTasks: ExecutionTrashModalProps['trashedCaseTasks'];
    setShowExecutionTrashModal: (open: boolean) => void;
    restoreTimelineEventFromTrash: (id: string) => void;
    setPermanentDeleteTimelineId: (id: string | null) => void;
    restoreCaseNoteFromTrash: (id: string) => void;
    permanentlyDeleteCaseNote: (id: string) => void;
    restoreCaseTaskFromTrash: (id: string) => void;
    permanentlyDeleteCaseTask: (id: string) => void;
    timelineEditDraft: TimelineEvent | null;
    setTimelineEditDraft: (draft: unknown | null) => void;
    saveTimelineEditDraft: () => void;
    moveTimelineEventToTrash: (event: TimelineEvent) => void;
    showEditDossierMetaModal: boolean;
    dossierMetaDraft: DossierMetaEditSectionProps['dossierMetaDraft'];
    isEvictionExecutionModule: boolean;
    dossierMetaEditIsEvictionExecutionModule?: boolean;
    setShowEditDossierMetaModal: (open: boolean) => void;
    setDossierMetaDraft: DossierMetaEditSectionProps['setDossierMetaDraft'];
    saveDossierMetaDraft: () => void;
    editPartyTarget: PartyEditModalProps['editPartyTarget'] | null;
    setEditPartyTarget: PartyEditModalProps['setEditPartyTarget'];
    partyEditDraft: PartyEditModalProps['partyEditDraft'] | null;
    setPartyEditDraft: PartyEditModalProps['setPartyEditDraft'];
    partyEditHeirDeleteConfirmIdx: number | null;
    setPartyEditHeirDeleteConfirmIdx: (idx: number | null) => void;
    savePartyEditDraft: () => void;
    togglePartyEditHeirClient: (idx: number) => void;
    removeHeirFromPartyEditDraftAtIndex: (idx: number) => void;
    decisionsStorageExecutionId: string | null;
    heirsQuickView: ExecutionHeirsQuickViewModalProps['heirsQuickView'];
    setHeirsQuickView: (view: ExecutionHeirsQuickViewModalProps['heirsQuickView']) => void;
    X: React.ComponentType<{ className?: string }>;
    permanentDeleteTimelineId: string | null;
    permanentlyDeleteTimelineEvent: (id: string) => void;
    onCloseExecutionTrashModal?: () => void;
    onCloseTimelineEditModal?: () => void;
    onCloseEditDossierMetaModal?: () => void;
    onCloseEditPartyModal?: () => void;
    onCloseHeirsQuickViewModal?: () => void;
    onClosePermanentDeleteTimelineConfirm?: () => void;
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

        dossierMetaEditIsEvictionExecutionModule,

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

        onCloseExecutionTrashModal,

        onCloseTimelineEditModal,

        onCloseEditDossierMetaModal,

        onCloseEditPartyModal,

        onCloseHeirsQuickViewModal,

        onClosePermanentDeleteTimelineConfirm,

    } = props;

    const showTimelineEditModal = Boolean(timelineEditDraft);
    const showPartyEditModal = Boolean(editPartyTarget);
    const showHeirsQuickViewModal = Boolean(heirsQuickView);
    const showPermanentDeleteConfirm = Boolean(permanentDeleteTimelineId);
    const showAnyEditOverlay =
        showExecutionTrashModal ||
        showTimelineEditModal ||
        showEditDossierMetaModal ||
        showPartyEditModal ||
        showHeirsQuickViewModal ||
        showPermanentDeleteConfirm;

    if (!showAnyEditOverlay) {
        return null;
    }
    return (

        <>

            {showExecutionTrashModal ? (
            <Suspense
                fallback={
                    <ExecutionNamedOverlayInstantFrame
                        title="سلة مهملات الإضبارة"
                        onClose={() => {
                            if (typeof onCloseExecutionTrashModal === 'function') {
                                onCloseExecutionTrashModal();
                                return;
                            }
                            setShowExecutionTrashModal(false);
                        }}
                    />
                }
            >

                <LazyExecutionTrashModal

                    visible={showExecutionTrashModal}

                    trashedTimelineEvents={trashedTimelineEvents}

                    trashedCaseNotes={trashedCaseNotes}

                    trashedCaseTasks={trashedCaseTasks}

                    onClose={() => {
                        if (typeof onCloseExecutionTrashModal === 'function') {
                            onCloseExecutionTrashModal();
                            return;
                        }
                        setShowExecutionTrashModal(false);
                    }}

                    onRestoreTimelineEvent={restoreTimelineEventFromTrash}

                    onPermanentDeleteTimeline={setPermanentDeleteTimelineId}

                    onRestoreCaseNote={restoreCaseNoteFromTrash}

                    onPermanentDeleteCaseNote={permanentlyDeleteCaseNote}

                    onRestoreCaseTask={restoreCaseTaskFromTrash}

                    onPermanentDeleteCaseTask={permanentlyDeleteCaseTask}

                />

            </Suspense>
            ) : null}

            {showTimelineEditModal ? (
            <Suspense
                fallback={
                    <ExecutionNamedOverlayInstantFrame
                        title="تعديل الحدث"
                        onClose={() => {
                            if (typeof onCloseTimelineEditModal === 'function') {
                                onCloseTimelineEditModal();
                                return;
                            }
                            setTimelineEditDraft(null);
                        }}
                    />
                }
            >

                <LazyTimelineEditModal
                    visible={!!timelineEditDraft}
                    timelineEvent={timelineEditDraft}
                    onClose={() => {
                        if (typeof onCloseTimelineEditModal === 'function') {
                            onCloseTimelineEditModal();
                            return;
                        }
                        setTimelineEditDraft(null);
                    }}

                    onSave={saveTimelineEditDraft}

                    onDelete={() => {
                        if (timelineEditDraft) moveTimelineEventToTrash(timelineEditDraft);
                    }}
                />

            </Suspense>
            ) : null}

            {showEditDossierMetaModal ? (
            <Suspense
                fallback={
                    <ExecutionNamedOverlayInstantFrame
                        title="تعديل بيانات الإضبارة"
                        onClose={() => {
                            if (typeof onCloseEditDossierMetaModal === 'function') {
                                onCloseEditDossierMetaModal();
                                return;
                            }
                            setShowEditDossierMetaModal(false);
                        }}
                    />
                }
            >
                <LazyDossierMetaEditSection

                    showEditDossierMetaModal={showEditDossierMetaModal}

                    dossierMetaDraft={dossierMetaDraft}

                    isEvictionExecutionModule={
                        dossierMetaEditIsEvictionExecutionModule ?? isEvictionExecutionModule
                    }

                    setShowEditDossierMetaModal={(open) => {
                        if (open) {
                            setShowEditDossierMetaModal(true);
                            return;
                        }
                        if (typeof onCloseEditDossierMetaModal === 'function') {
                            onCloseEditDossierMetaModal();
                            return;
                        }
                        setShowEditDossierMetaModal(false);
                    }}

                    setDossierMetaDraft={setDossierMetaDraft}

                    saveDossierMetaDraft={saveDossierMetaDraft}

                />
            </Suspense>
            ) : null}

            {showPartyEditModal ? (
            <Suspense
                fallback={
                    <ExecutionNamedOverlayInstantFrame
                        title="تعديل الطرف"
                        onClose={() => {
                            if (typeof onCloseEditPartyModal === 'function') {
                                onCloseEditPartyModal();
                                return;
                            }
                            setEditPartyTarget(null);
                        }}
                    />
                }
            >
                <LazyPartyEditModal

                    editPartyTarget={editPartyTarget}

                    setEditPartyTarget={(target) => {
                        if (target != null) {
                            setEditPartyTarget(target);
                            return;
                        }
                        if (typeof onCloseEditPartyModal === 'function') {
                            onCloseEditPartyModal();
                            setPartyEditDraft(null);
                            return;
                        }
                        setEditPartyTarget(null);
                        setPartyEditDraft(null);
                    }}

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
            ) : null}

            {showHeirsQuickViewModal ? (
            <Suspense
                fallback={
                    <ExecutionNamedOverlayInstantFrame
                        title="الورثة"
                        onClose={() => {
                            if (typeof onCloseHeirsQuickViewModal === 'function') {
                                onCloseHeirsQuickViewModal();
                                return;
                            }
                            setHeirsQuickView(null);
                        }}
                    />
                }
            >

                <LazyExecutionHeirsQuickViewModal

                    heirsQuickView={heirsQuickView}

                    setHeirsQuickView={(view) => {
                        if (view != null) {
                            setHeirsQuickView(view);
                            return;
                        }
                        if (typeof onCloseHeirsQuickViewModal === 'function') {
                            onCloseHeirsQuickViewModal();
                            return;
                        }
                        setHeirsQuickView(null);
                    }}

                    X={X}

                />

            </Suspense>
            ) : null}

            {showPermanentDeleteConfirm ? (
            <Suspense
                fallback={
                    <ExecutionNamedOverlayInstantFrame
                        title="تأكيد الحذف النهائي"
                        onClose={() => {
                            if (typeof onClosePermanentDeleteTimelineConfirm === 'function') {
                                onClosePermanentDeleteTimelineConfirm();
                                return;
                            }
                            setPermanentDeleteTimelineId(null);
                        }}
                    />
                }
            >

                <LazyPermanentDeleteConfirmDialog

                    permanentDeleteTimelineId={permanentDeleteTimelineId}

                    setPermanentDeleteTimelineId={(id) => {
                        if (id != null) {
                            setPermanentDeleteTimelineId(id);
                            return;
                        }
                        if (typeof onClosePermanentDeleteTimelineConfirm === 'function') {
                            onClosePermanentDeleteTimelineConfirm();
                            return;
                        }
                        setPermanentDeleteTimelineId(null);
                    }}

                    permanentlyDeleteTimelineEvent={permanentlyDeleteTimelineEvent}

                />

            </Suspense>
            ) : null}

        </>

    );

}

