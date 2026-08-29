import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { loadExecutionFilesRaw, saveExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { syncExecutionFilesIndexCache } from '@/app/utils/executionFilesIndexCache';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { storageCache } from '@/app/utils/storageCache';
import { filterTimelineEventsForParentDossier } from '@/app/domain/execution/dossier/ExecutionDossierScope';
import {
    inabaSubMetaStorageKey,
    isInabaSubFileId,
    resolveParentDossierId,
} from './inabaIds';
import {
    buildInabaDelegationViewFile,
    persistParentExecutionFile,
} from './inabaView';
import type { ExecutionDashboardState, SubExecutionFile } from './types';
import type { DashboardStoreGet, DashboardStoreSet } from './storeSet';

export function createSubFileActions(set: DashboardStoreSet, _get: DashboardStoreGet) {
    return {
            setActiveSubFileId: (id: string | null) => set({ activeSubFileId: id }),
            setDelegationParentFileId: (id: string | null) => set({ delegationParentFileId: id }),
            setSubFiles: (files: SubExecutionFile[]) => set({ subFiles: files }),

            addSubFile: (file: SubExecutionFile) => set((state: ExecutionDashboardState) => {
                const exists = state.subFiles.some((f: SubExecutionFile) => f.id === file.id);
                if (exists) return state;
                const next = [...state.subFiles, file];
                try {
                    const allFiles: any[] = loadExecutionFilesRaw() as any[];
                    allFiles.push({ _subFileRef: { id: file.id, parentFileId: file.parentFileId, updatedAt: new Date().toISOString() } } as any);
                    saveExecutionFilesRaw(allFiles);
                    syncExecutionFilesIndexCache(allFiles);
                } catch {}
                return { subFiles: next };
            }),

            removeSubFile: (id: string) => set((state: ExecutionDashboardState) => {
                const nextSubFiles = state.subFiles.filter((f: SubExecutionFile) => f.id !== id);
                if (nextSubFiles.length === state.subFiles.length) return state;
                try {
                    const allFiles: any[] = loadExecutionFilesRaw() as any[];
                    const filtered = allFiles.filter((f: any) => !(f && f._subFileRef && f._subFileRef.id === id));
                    saveExecutionFilesRaw(filtered);
                    syncExecutionFilesIndexCache(filtered);
                } catch {}
                return {
                    subFiles: nextSubFiles,
                    activeSubFileId: state.activeSubFileId === id ? null : state.activeSubFileId,
                };
            }),

            swapToSubFile: (subFile: SubExecutionFile) => set((state: ExecutionDashboardState) => {
                if (!state.currentFile) return state;
                const curId = String(state.currentFile.id || '').trim();
                const parentId = resolveParentDossierId(state, curId);
                if (!parentId) return state;
                /** تحديث الرابط فوراً — المصدر الأساسي للحقيقة */
                try {
                    const url = new URL(window.location.href);
                    url.searchParams.set('delegationParentId', parentId);
                    window.history.replaceState(window.history.state, '', url.toString());
                } catch {}
                let parentFile: ExecutionFile;
                if (isInabaSubFileId(curId) && state._stashedOriginalFile) {
                    parentFile = JSON.parse(JSON.stringify(state._stashedOriginalFile)) as ExecutionFile;
                } else if (!isInabaSubFileId(curId)) {
                    parentFile = JSON.parse(JSON.stringify(state.currentFile)) as ExecutionFile;
                } else {
                    try {
                        const allFiles: any[] = loadExecutionFilesRaw() as any[];
                        const match = allFiles.find((f: any) => String(f?.id || '').trim() === parentId);
                        parentFile = (match
                            ? JSON.parse(JSON.stringify(match))
                            : JSON.parse(JSON.stringify(state.currentFile))) as ExecutionFile;
                    } catch {
                        parentFile = JSON.parse(JSON.stringify(state.currentFile)) as ExecutionFile;
                    }
                }
                persistParentExecutionFile(parentId, parentFile);
                const subAsFile = isInabaSubFileId(subFile.id)
                    ? buildInabaDelegationViewFile(parentFile, subFile, parentId)
                    : ({
                          ...parentFile,
                          id: subFile.id,
                          fileNumber: subFile.fileNumber as any,
                          directorate: (subFile.directorate || parentFile.directorate) as any,
                          debtor_summons_marker: null,
                          decisions: (subFile.decisions as any[]) || [],
                          timelineEvents: (subFile.timelineEvents as TimelineEvent[]) || [],
                          caseNotesLog: [],
                          caseTasksPending: [],
                          delegationTargetDirectorate: subFile.delegationTargetDirectorate,
                          delegationPurpose: subFile.delegationPurpose,
                          parentId: subFile.parentFileId,
                      } as ExecutionFile);
                try {
                    storageCache.set(
                        executionStorageKey(inabaSubMetaStorageKey(parentId, subFile.id)),
                        subAsFile
                    );
                } catch {}
                const normalizedSubRecord: SubExecutionFile = {
                    ...subFile,
                    fileNumber: String(subAsFile.fileNumber || subFile.fileNumber || '').trim(),
                    fileYear: String(subAsFile.fileYear || (subFile as { fileYear?: string }).fileYear || '').trim(),
                    timelineEvents: isInabaSubFileId(subFile.id)
                        ? (subAsFile.timelineEvents || [])
                        : subFile.timelineEvents,
                    updatedAt: new Date().toISOString(),
                };
                return {
                    _stashedOriginalFile: parentFile,
                    currentFile: subAsFile,
                    activeSubFileId: subFile.id,
                    delegationParentFileId: parentId,
                    subFiles: state.subFiles.map((f: SubExecutionFile) =>
                        f.id === subFile.id ? normalizedSubRecord : f
                    ),
                };
            }),

            restoreOriginalFile: () => set((state: ExecutionDashboardState) => {
                const restoreById = (parentId: string): ExecutionFile | null => {
                    const pid = String(parentId || '').trim();
                    if (!pid) return null;
                    if (state._stashedOriginalFile && String(state._stashedOriginalFile.id || '').trim() === pid) {
                        return JSON.parse(JSON.stringify(state._stashedOriginalFile)) as ExecutionFile;
                    }
                    try {
                        const cached = storageCache.get(executionStorageKey(pid)) as ExecutionFile | null;
                        if (cached && String(cached.id || '').trim() === pid) {
                            return JSON.parse(JSON.stringify(cached)) as ExecutionFile;
                        }
                    } catch {}
                    try {
                        const allFiles: any[] = loadExecutionFilesRaw() as any[];
                        const match = allFiles.find((f: any) => String(f?.id || '').trim() === pid);
                        if (!match) return null;
                        return JSON.parse(JSON.stringify(match)) as ExecutionFile;
                    } catch {
                        return null;
                    }
                };
                /** إزالة المعرّف من الرابط فوراً */
                try {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('delegationParentId');
                    window.history.replaceState(window.history.state, '', url.toString());
                } catch {}
                const currentId = String((state.currentFile as any)?.id || '').trim();
                const looksLikeInaba = isInabaSubFileId(currentId) || isInabaSubFileId(state.activeSubFileId);
                if (!looksLikeInaba && !state._stashedOriginalFile) return state;
                const parentId = resolveParentDossierId(state);
                if (!parentId) {
                    return {
                        activeSubFileId: null,
                        delegationParentFileId: null,
                    };
                }
                const restored = restoreById(parentId);
                if (!restored) {
                    return {
                        activeSubFileId: null,
                        delegationParentFileId: null,
                    };
                }
                const parentTimeline = filterTimelineEventsForParentDossier(
                    Array.isArray(restored.timelineEvents) ? restored.timelineEvents : [],
                    parentId
                );
                const parentFile = { ...restored, timelineEvents: parentTimeline };
                persistParentExecutionFile(parentId, parentFile);
                return {
                    currentFile: parentFile,
                    _stashedOriginalFile: null,
                    activeSubFileId: null,
                    delegationParentFileId: null,
                };
            }),
    };
}
