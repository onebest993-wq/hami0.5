import type { ExecutionFile } from '@/app/types/execution';
import {
    loadExecutionFilesRaw,
    saveExecutionFilesRaw,
} from '@/app/utils/executionFilesStorage';
import { syncExecutionFilesIndexCache } from '@/app/utils/executionFilesIndexCache';
import { isInabaSubFileId } from './inabaIds';
import type { DashboardStoreGet, DashboardStoreSet } from './storeSet';

function isFileRecord(value: unknown): value is Record<string, unknown> & { id?: unknown } {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function createUnificationActions(set: DashboardStoreSet, get: DashboardStoreGet) {
    return {
        setLinkedDossiers: (dossiers: ExecutionDashboardLinked) => set({ linkedDossiers: dossiers }),

        addLinkedDossier: (dossier: ExecutionDashboardLinked[number]) =>
            set((state) => {
                const exists = state.linkedDossiers.some((d) => d.linkedId === dossier.linkedId);
                if (exists) return state;
                return { linkedDossiers: [...state.linkedDossiers, dossier] };
            }),

        removeLinkedDossier: (linkedId: string) =>
            set((state) => ({
                linkedDossiers: state.linkedDossiers.filter((d) => d.linkedId !== linkedId),
            })),

        generateLinkToken: () => {
            const hex = () => Math.random().toString(16).slice(2, 10);
            return `hami_${hex()}${hex()}`;
        },

        setParentIdForDossier: (dossierId: string, parentId: string | null) => {
            try {
                const allFiles = loadExecutionFilesRaw();
                const idx = allFiles.findIndex(
                    (f) => isFileRecord(f) && String(f.id) === dossierId,
                );
                if (idx >= 0 && isFileRecord(allFiles[idx])) {
                    if (parentId == null || String(parentId).trim() === '') {
                        const { parentId: _drop, ...rest } = allFiles[idx];
                        allFiles[idx] = rest;
                    } else {
                        allFiles[idx] = { ...allFiles[idx], parentId };
                    }
                    saveExecutionFilesRaw(allFiles);
                    syncExecutionFilesIndexCache(allFiles);
                }
            } catch {
                /* ignore */
            }
            set({ unificationTick: get().unificationTick + 1 });
        },

        getChildDossiers: (rootFileId?: string) => {
            const id = rootFileId || get().currentFile?.id;
            if (!id) return [] as ExecutionFile[];
            try {
                const allFiles = loadExecutionFilesRaw();
                const normalizeParentId = (rawKey: unknown): string => {
                    const key = String(rawKey || '').trim();
                    if (!key) return '';
                    const childIdx = key.indexOf('__child__');
                    const subIdx = key.indexOf('__sub__');
                    const cut =
                        childIdx >= 0 && subIdx >= 0
                            ? Math.min(childIdx, subIdx)
                            : childIdx >= 0
                              ? childIdx
                              : subIdx;
                    return (cut >= 0 ? key.slice(0, cut) : key).trim();
                };
                const root = String(id).trim();
                return allFiles.filter(
                    (f): f is ExecutionFile =>
                        isFileRecord(f) &&
                        !isInabaSubFileId(String(f.id ?? '')) &&
                        normalizeParentId(f.parentId) === root,
                ) as ExecutionFile[];
            } catch {
                return [];
            }
        },

        setPendingUnificationLink: (
            link: NonNullable<ReturnType<DashboardStoreGet>['pendingUnificationLink']> | null,
        ) => set({ pendingUnificationLink: link }),
    };
}

type ExecutionDashboardLinked = NonNullable<ExecutionFile['linkedDossiers']>;
