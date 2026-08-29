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

export function createCriminalProceduralSubItemActions(set: SetFn, get: GetFn): Partial<CriminalStoreState> {
    return {
        addProceduralSubItem: (caseId, parentId, item) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const list = normalizeProceduralContainers(target.proceduralContainers);
                let next = list;
                if (item.type === 'container') {
                    const title = String(item.container.title ?? '').trim();
                    if (!title) return state;
                    const child: ProceduralContainer = {
                        ...item.container,
                        id: item.container.id || createProceduralId(),
                        title,
                        color: normalizeColor(item.container.color),
                        icon: normalizeIcon(item.container.icon),
                        parentId,
                        branchRole: item.container.branchRole,
                        subItems: Array.isArray(item.container.subItems) ? item.container.subItems : [],
                    };
                    next = insertNestedContainer(list, parentId, child);
                } else if (item.type === 'note') {
                    const title = String(item.title ?? '').trim();
                    if (!title) return state;
                    const link = normalizeProceduralItemLink(item.link);
                    const contextNote = String(item.contextNote ?? '').trim();
                    const legacyRef = String(item.contextRef ?? '').trim();
                    next = appendSubItem(list, parentId, {
                        type: 'note',
                        id: item.id || createProceduralId(),
                        title,
                        body: String(item.body ?? '').trim() || undefined,
                        tags: normalizeProceduralTags(item.tags),
                        isStarred: item.isStarred === true || undefined,
                        link,
                        contextNote: contextNote || (!link && legacyRef ? legacyRef : undefined),
                        contextRef: !link && legacyRef ? legacyRef : undefined,
                    });
                } else if (item.type === 'action') {
                    const title = String(item.title ?? '').trim();
                    const date = String(item.date ?? '').trim();
                    if (!title || !date) return state;
                    const status =
                        item.status === 'done' || item.status === 'postponed'
                            ? item.status
                            : 'in_progress';
                    const link = normalizeProceduralItemLink(item.link);
                    const contextNote = String(item.contextNote ?? '').trim();
                    const legacyRef = String(item.contextRef ?? '').trim();
                    const followUpDate = normalizeFollowUpDate(item.followUpDate, status);
                    next = appendSubItem(list, parentId, {
                        type: 'action',
                        id: item.id || createProceduralId(),
                        title,
                        date,
                        status,
                        followUpDate,
                        tags: normalizeProceduralTags(item.tags),
                        isStarred: item.isStarred === true || undefined,
                        link,
                        contextNote: contextNote || (!link && legacyRef ? legacyRef : undefined),
                        contextRef: !link && legacyRef ? legacyRef : undefined,
                    });
                } else {
                    return state;
                }
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, proceduralContainers: next },
                    },
                };
            }),
        updateProceduralSubItem: (caseId, parentId, itemId, patch) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const list = normalizeProceduralContainers(target.proceduralContainers);
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            proceduralContainers: updateSubItemInTree(list, parentId, itemId, patch),
                        },
                    },
                };
            }),
        deleteProceduralSubItem: (caseId, parentId, itemId) => {
            get().moveProceduralSubItemToTrash(caseId, parentId, itemId);
        },
        moveProceduralSubItemToTrash: (caseId, parentId, itemId) => {
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
                    err = 'لا يمكن حذف العنصر — الإضبارة مقفلة.';
                    return state;
                }
                const list = normalizeProceduralContainers(target.proceduralContainers);
                const containerHit = findContainerInTree(list, itemId);
                if (containerHit) {
                    const snapshot = JSON.parse(JSON.stringify(containerHit.container)) as ProceduralContainer;
                    const next = deleteContainerFromTree(list, itemId);
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
                }
                const parent = findContainerInTree(list, parentId);
                if (!parent) {
                    err = 'الحاوية الأم غير موجودة.';
                    return state;
                }
                const doomed = parent.container.subItems.find((it) => {
                    if (it.type === 'container') return it.container.id === itemId;
                    return it.id === itemId;
                });
                if (!doomed) {
                    err = 'العنصر غير موجود.';
                    return state;
                }
                const wrapped: ProceduralSubItemTrashSnapshot = {
                    parentContainerId: parentId,
                    item: JSON.parse(JSON.stringify(doomed)) as ProceduralSubItem,
                };
                const next = removeSubItemFromTree(list, parentId, itemId);
                const nextCase = appendCaseTrashItem(
                    { ...target, proceduralContainers: next },
                    'procedural_sub_item',
                    wrapped,
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
        duplicateProceduralSubItem: (caseId, parentId, itemId) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const list = normalizeProceduralContainers(target.proceduralContainers);
                const next = duplicateSubItemInTree(list, parentId, itemId);
                if (!next) return state;
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, proceduralContainers: next },
                    },
                };
            })
    };
}
