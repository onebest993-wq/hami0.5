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

export function createCriminalProceduralTreeActions(set: SetFn, get: GetFn) {
    return {
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
            })
    };
}
