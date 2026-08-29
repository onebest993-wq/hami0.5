/**
 * Procedural canvas actions — split from criminalStoreProceduralActions.ts
 */
import type { StoreApi } from 'zustand';
import {
    caseMutationBlocked,
} from './criminalCaseMutationPolicy';
import {
    advanceActionToNextPhase,
    appendSubItem,
    createProceduralId,
    deleteContainerFromTree,
    duplicateSubItemInTree,
    insertNestedContainer,
    insertRootContainer,
    mapContainerTree,
    findContainerInTree,
    moveContainerInTree,
    moveSubItemInTree,
    normalizeColor,
    normalizeFollowUpDate,
    normalizeIcon,
    normalizeProceduralTags,
    normalizeProceduralContainers,
    removeSubItemFromTree,
    reorderRootContainers,
    updateSubItemInTree,
    type ProceduralContainer,
    type ProceduralSubItem,
} from './proceduralContainersEngine';
import {
    appendProceduralAudit,
    buildSandboxTemplateRoots,
    cloneContainerWithNewIds,
    normalizeProceduralCanvasAudit,
    SANDBOX_TEMPLATES,
} from './proceduralSandboxToolkit';
import {
    normalizeProceduralItemLink,
} from './proceduralItemLink';
import {
    type ProceduralSubItemTrashSnapshot,
} from './criminalCaseTrash';
import {
    appendCaseTrashItem,
    caseMaterialProcedureBlocked,
} from './criminalStoreCaseTransforms';
import { isCriminalCaseMutationBlocked, rejectCriminalCaseMutation } from './criminalCaseMutationGuard';
import type { CriminalStoreState } from './criminalStoreState.types';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalProceduralContainerActions(set: SetFn, get: GetFn): Partial<CriminalStoreState> {
    return {
        setProceduralContainers: (caseId, containers) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            proceduralContainers: normalizeProceduralContainers(containers),
                        },
                    },
                };
            }),
        addRootProceduralContainer: (caseId, input) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const title = String(input.title ?? '').trim();
                if (!title) return state;
                const container: ProceduralContainer = {
                    id: createProceduralId(),
                    title,
                    color: normalizeColor(input.color),
                    icon: normalizeIcon(input.icon),
                    parentId: null,
                    subItems: [],
                    pathStatus: 'active',
                };
                const list = normalizeProceduralContainers(target.proceduralContainers);
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            proceduralContainers: insertRootContainer(list, container),
                        },
                    },
                };
            }),
        updateProceduralContainer: (caseId, containerId, patch) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const list = normalizeProceduralContainers(target.proceduralContainers);
                const next = mapContainerTree(list, (c) => {
                    if (c.id !== containerId) return c;
                    return {
                        ...c,
                        title:
                            patch.title !== undefined ? String(patch.title).trim() || c.title : c.title,
                        color: patch.color !== undefined ? normalizeColor(patch.color) : c.color,
                        icon: patch.icon !== undefined ? normalizeIcon(patch.icon) : c.icon,
                        collapsed: patch.collapsed !== undefined ? patch.collapsed === true : c.collapsed,
                        pathStatus:
                            c.parentId === null && patch.pathStatus !== undefined
                                ? patch.pathStatus === 'completed'
                                    ? 'completed'
                                    : 'active'
                                : c.pathStatus,
                        pathEndedAt:
                            c.parentId === null
                                ? patch.pathEndedAt !== undefined
                                    ? String(patch.pathEndedAt).trim() || undefined
                                    : patch.pathStatus === 'active'
                                      ? undefined
                                      : c.pathEndedAt
                                : undefined,
                    };
                });
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, proceduralContainers: next },
                    },
                };
            }),
        deleteProceduralContainer: (caseId, containerId) => {
            get().moveProceduralContainerToTrash(caseId, containerId);
        },
        moveProceduralContainerToTrash: (caseId, containerId) => {
            let err: string | null = null;
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                err = rejectCriminalCaseMutation(target, state.sessionOwnerLawyerId);
                if (err) return state;
                if (caseMaterialProcedureBlocked(target)) {
                    err = 'لا يمكن حذف المسار — الإضبارة مقفلة.';
                    return state;
                }
                const list = normalizeProceduralContainers(target.proceduralContainers);
                const hit = findContainerInTree(list, containerId);
                if (!hit) {
                    err = 'المسار غير موجود.';
                    return state;
                }
                const snapshot = JSON.parse(JSON.stringify(hit.container)) as ProceduralContainer;
                const next = deleteContainerFromTree(list, containerId);
                const nextCase = appendCaseTrashItem(
                    { ...target, proceduralContainers: next },
                    'procedural_container',
                    snapshot,
                );
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: nextCase,
                    },
                };
            });
            return err;
        },
        reorderRootProceduralContainers: (caseId, fromId, toId) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const list = normalizeProceduralContainers(target.proceduralContainers);
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            proceduralContainers: reorderRootContainers(list, fromId, toId),
                        },
                    },
                };
            })
    };
}
