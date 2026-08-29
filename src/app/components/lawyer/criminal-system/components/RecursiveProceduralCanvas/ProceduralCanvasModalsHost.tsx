import React from 'react';
import {
    CONTAINER_COLOR_PRESETS,
    createProceduralId,
    type AddChildKind,
    type ProceduralContainer,
    type ProceduralPlacementContext,
    type ProceduralSubItem,
    type ProceduralSubItemPatch,
} from '../../proceduralContainersEngine';
import { ProceduralContainerFormModal } from '../modals/ProceduralContainerFormModal';
import { ProceduralAddChildModal } from '../modals/ProceduralAddChildModal';
import { ProceduralNoteFormModal } from '../modals/ProceduralNoteFormModal';
import { ProceduralActionFormModal } from '../modals/ProceduralActionFormModal';
import { ProceduralAdvancePhaseModal } from '../modals/ProceduralAdvancePhaseModal';
import { CriminalModalPortal, CRIMINAL_MODAL_Z } from '../../criminalModalPortal';
import type {
    ActionModalMode,
    AdvanceModalMode,
    ContainerModalMode,
    NoteModalMode,
} from './types';

type ContainerFormPayload = { title: string; color: string; icon: string };

export type ProceduralCanvasModalsHostProps = {
    caseId: string;
    containerModal: ContainerModalMode;
    editingContainer: ProceduralContainer | null;
    closeContainerModal: () => void;
    addRoot: (caseId: string, input: ContainerFormPayload) => void;
    addSubItem: (caseId: string, parentId: string, item: ProceduralSubItem) => void;
    updateContainer: (
        caseId: string,
        containerId: string,
        patch: Partial<Pick<ProceduralContainer, 'title' | 'color' | 'icon'>>,
    ) => void;
    addChildParentId: string | null;
    closeAddChild: () => void;
    setNoteModal: (m: NoteModalMode) => void;
    setActionModal: (m: ActionModalMode) => void;
    noteModal: NoteModalMode;
    notePlacement: ProceduralPlacementContext | null;
    closeNoteModal: () => void;
    updateSubItem: (
        caseId: string,
        parentId: string,
        itemId: string,
        patch: ProceduralSubItemPatch,
    ) => void;
    actionModal: ActionModalMode;
    actionPlacement: ProceduralPlacementContext | null;
    closeActionModal: () => void;
    advanceModal: AdvanceModalMode;
    closeAdvanceModal: () => void;
    advanceAction: (
        caseId: string,
        parentId: string,
        actionId: string,
        opts?: { spawnChildTitle?: string },
    ) => void;
    confirmDeleteId: string | null;
    closeConfirmDelete: () => void;
    deleteContainer: (caseId: string, containerId: string) => void;
};

export function ProceduralCanvasModalsHost({
    caseId,
    containerModal,
    editingContainer,
    closeContainerModal,
    addRoot,
    addSubItem,
    updateContainer,
    addChildParentId,
    closeAddChild,
    setNoteModal,
    setActionModal,
    noteModal,
    notePlacement,
    closeNoteModal,
    updateSubItem,
    actionModal,
    actionPlacement,
    closeActionModal,
    advanceModal,
    closeAdvanceModal,
    advanceAction,
    confirmDeleteId,
    closeConfirmDelete,
    deleteContainer,
}: ProceduralCanvasModalsHostProps) {
    return (
        <>
            <ProceduralContainerFormModal
                open={containerModal !== null}
                title={
                    containerModal?.kind === 'edit'
                        ? 'تعديل'
                        : containerModal?.kind === 'create-nested'
                          ? containerModal.branchRole === 'primary'
                              ? 'مسار أساسي داخل المسار'
                              : 'مسار فرعي'
                          : 'مسار جديد'
                }
                initial={
                    containerModal?.kind === 'edit' && editingContainer
                        ? {
                              title: editingContainer.title,
                              color: editingContainer.color,
                              icon: editingContainer.icon,
                          }
                        : containerModal?.kind === 'create-nested'
                          ? {
                                title: '',
                                color: CONTAINER_COLOR_PRESETS[containerModal.branchRole === 'primary' ? 0 : 1],
                                icon: containerModal.branchRole === 'primary' ? '🛤️' : '📁',
                            }
                          : undefined
                }
                onClose={closeContainerModal}
                onSubmit={(payload) => {
                    if (containerModal?.kind === 'create-root') {
                        addRoot(caseId, payload);
                    } else if (containerModal?.kind === 'create-nested') {
                        const branchRole = containerModal.branchRole;
                        addSubItem(caseId, containerModal.parentId, {
                            type: 'container',
                            container: {
                                id: createProceduralId(),
                                title: payload.title,
                                color: payload.color,
                                icon: payload.icon,
                                parentId: containerModal.parentId,
                                branchRole,
                                subItems: [],
                            },
                        });
                    } else if (containerModal?.kind === 'edit') {
                        updateContainer(caseId, containerModal.containerId, payload);
                    }
                    closeContainerModal();
                }}
            />

            <ProceduralAddChildModal
                open={addChildParentId !== null}
                onClose={closeAddChild}
                onPick={(kind: AddChildKind) => {
                    const parentId = addChildParentId;
                    if (!parentId) return;
                    closeAddChild();
                    if (kind === 'note') setNoteModal({ parentId });
                    else if (kind === 'action') setActionModal({ parentId });
                }}
            />

            <ProceduralNoteFormModal
                caseId={caseId}
                open={noteModal !== null}
                placement={notePlacement}
                initial={noteModal?.note ?? null}
                onClose={closeNoteModal}
                onSubmit={(payload) => {
                    if (!noteModal) return;
                    if (noteModal.note?.id) {
                        updateSubItem(caseId, noteModal.parentId, noteModal.note.id, payload);
                    } else {
                        addSubItem(caseId, noteModal.parentId, {
                            type: 'note',
                            id: createProceduralId(),
                            title: payload.title,
                            body: payload.body,
                            link: payload.link,
                            contextNote: payload.contextNote,
                            tags: payload.tags,
                            isStarred: payload.isStarred,
                        });
                    }
                    closeNoteModal();
                }}
            />

            <ProceduralActionFormModal
                caseId={caseId}
                open={actionModal !== null}
                placement={actionPlacement}
                initial={actionModal?.action ?? null}
                onClose={closeActionModal}
                onSubmit={(payload) => {
                    if (!actionModal) return;
                    if (actionModal.action?.id) {
                        updateSubItem(caseId, actionModal.parentId, actionModal.action.id, payload);
                    } else {
                        addSubItem(caseId, actionModal.parentId, {
                            type: 'action',
                            id: createProceduralId(),
                            title: payload.title,
                            date: payload.date,
                            status: payload.status,
                            followUpDate: payload.followUpDate,
                            tags: payload.tags,
                            isStarred: payload.isStarred,
                            link: payload.link,
                            contextNote: payload.contextNote,
                        });
                    }
                    closeActionModal();
                }}
            />

            <ProceduralAdvancePhaseModal
                open={advanceModal !== null}
                actionTitle={advanceModal?.actionTitle ?? ''}
                onClose={closeAdvanceModal}
                onSubmit={(payload) => {
                    if (!advanceModal) return;
                    advanceAction(caseId, advanceModal.parentId, advanceModal.actionId, {
                        spawnChildTitle: payload.spawnChildTitle,
                    });
                    closeAdvanceModal();
                }}
            />

            {confirmDeleteId ? (
                <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.proceduralConfirm}>
                    <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-4 space-y-3">
                        <div className="text-white font-black text-sm">نقل مسار التتبع للسلة؟</div>
                        <p className="text-white/70 text-xs font-bold">
                            سيتم إخفاء المسار بكل مراحله وإجراءاته — يمكن استرجاعه من سلة المهملات.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeConfirmDelete}
                                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-white/75"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    deleteContainer(caseId, confirmDeleteId);
                                    closeConfirmDelete();
                                }}
                                className="rounded-xl bg-red-600/80 px-4 py-2 text-sm font-black text-white"
                            >
                                نقل للسلة
                            </button>
                        </div>
                    </div>
                </CriminalModalPortal>
            ) : null}
        </>
    );
}
