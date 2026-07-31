/**
 * Procedural canvas / container / sub-item actions — extracted from criminalStore.ts
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

export function createCriminalProceduralActions(set: SetFn, get: GetFn) {
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
            }),
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
            }),
        moveProceduralSubItem: (caseId, fromParentId, toParentId, itemId, toIndex) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const list = normalizeProceduralContainers(target.proceduralContainers);
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            proceduralContainers: moveSubItemInTree(
                                list,
                                fromParentId,
                                toParentId,
                                itemId,
                                toIndex,
                            ),
                        },
                    },
                };
            }),
        moveProceduralContainer: (caseId, containerId, newParentId, toIndex) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const list = normalizeProceduralContainers(target.proceduralContainers);
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            proceduralContainers: moveContainerInTree(
                                list,
                                containerId,
                                newParentId,
                                toIndex,
                            ),
                        },
                    },
                };
            }),
        advanceProceduralActionPhase: (caseId, parentId, actionId, opts) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const list = normalizeProceduralContainers(target.proceduralContainers);
                const spawnTitle = String(opts?.spawnChildTitle ?? '').trim();
                const next = advanceActionToNextPhase(list, parentId, actionId, {
                    spawnChildContainer: spawnTitle
                        ? {
                              title: spawnTitle,
                              color: opts?.spawnChildColor,
                              icon: opts?.spawnChildIcon,
                          }
                        : undefined,
                });
                const audit = appendProceduralAudit(
                    normalizeProceduralCanvasAudit(target.proceduralCanvasAudit),
                    spawnTitle ? `انتقال مرحلة + حاوية: ${spawnTitle}` : 'انتقال مرحلة — إجراء منجز',
                );
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, proceduralContainers: next, proceduralCanvasAudit: audit },
                    },
                };
            }),
        recordProceduralCanvasAudit: (caseId, summary) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const audit = appendProceduralAudit(
                    normalizeProceduralCanvasAudit(target.proceduralCanvasAudit),
                    summary,
                );
                if (audit.length === normalizeProceduralCanvasAudit(target.proceduralCanvasAudit).length) {
                    return state;
                }
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, proceduralCanvasAudit: audit },
                    },
                };
            }),
        applyProceduralSandboxTemplate: (caseId, templateId) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const list = normalizeProceduralContainers(target.proceduralContainers);
                const added = buildSandboxTemplateRoots(templateId);
                const tpl = SANDBOX_TEMPLATES.find((t) => t.id === templateId);
                const audit = appendProceduralAudit(
                    normalizeProceduralCanvasAudit(target.proceduralCanvasAudit),
                    `قالب اختياري: ${tpl?.title ?? templateId}`,
                );
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            proceduralContainers: [...list, ...added],
                            proceduralCanvasAudit: audit,
                        },
                    },
                };
            }),
        duplicateProceduralContainer: (caseId, containerId) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const list = normalizeProceduralContainers(target.proceduralContainers);
                const hit = findContainerInTree(list, containerId);
                if (!hit) return state;
                const clone = cloneContainerWithNewIds(hit.container, hit.parent?.id ?? null);
                if (!hit.parent) {
                    clone.pathStatus = 'active';
                    clone.pathEndedAt = undefined;
                }
                let next = list;
                if (!hit.parent) {
                    const idx = list.findIndex((c) => c.id === containerId);
                    next = [...list];
                    next.splice(idx < 0 ? next.length : idx + 1, 0, clone);
                } else {
                    next = insertNestedContainer(list, hit.parent.id, clone);
                }
                const audit = appendProceduralAudit(
                    normalizeProceduralCanvasAudit(target.proceduralCanvasAudit),
                    `نسخ حاوية: ${hit.container.title}`,
                );
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            proceduralContainers: next,
                            proceduralCanvasAudit: audit,
                        },
                    },
                };
            }),
    };
}
