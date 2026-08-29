import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    loadExecutionFilesRaw,
    saveExecutionFilesRaw,
} from '@/app/utils/executionFilesStorage';
import { syncExecutionFilesIndexCache } from '@/app/utils/executionFilesIndexCache';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { storageCache } from '@/app/utils/storageCache';
import {
    filterTimelineEventsForInabaDossier,
    stampInabaTimelineEventMetadata,
} from '@/app/domain/execution/dossier/ExecutionDossierScope';
import { inabaSubMetaStorageKey, isInabaSubFileId } from './inabaIds';
import type { DashboardStoreGet, DashboardStoreSet } from './storeSet';

function isFileRecord(value: unknown): value is Record<string, unknown> & { id?: unknown } {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function createFileActions(set: DashboardStoreSet, _get: DashboardStoreGet) {
    return {
        setCurrentFile: (file: ExecutionFile | null) => set({ currentFile: file }),

        updateCurrentFile: (updates: Partial<ExecutionFile>) =>
            set((state) => {
                if (!state.currentFile) return state;
                const updatedFile = { ...state.currentFile, ...updates };
                try {
                    const allFiles = loadExecutionFilesRaw();
                    const targetId = String(updatedFile.id ?? '').trim();
                    if (targetId) {
                        const fileIndex = allFiles.findIndex((item) => {
                            if (!isFileRecord(item)) return false;
                            return String(item.id ?? '').trim() === targetId;
                        });
                        if (fileIndex >= 0) {
                            allFiles[fileIndex] = updatedFile;
                        } else {
                            allFiles.push(updatedFile);
                        }
                        saveExecutionFilesRaw(allFiles);
                    }
                } catch {
                    /* ignore */
                }
                return { currentFile: updatedFile };
            }),

        appendTimelineEventToFile: (fileId: string, event: TimelineEvent) =>
            set((state) => {
                const targetId = String(fileId || '').trim();
                if (!targetId) return state;
                try {
                    const allFiles = loadExecutionFilesRaw();
                    const idx = allFiles.findIndex(
                        (f) => isFileRecord(f) && String(f.id || '').trim() === targetId,
                    );
                    if (idx >= 0 && isFileRecord(allFiles[idx])) {
                        const prev = allFiles[idx];
                        const prevEvents: TimelineEvent[] = Array.isArray(prev.timelineEvents)
                            ? (prev.timelineEvents as TimelineEvent[])
                            : [];
                        const nextEvents = [...prevEvents, event];
                        allFiles[idx] = {
                            ...prev,
                            timelineEvents: nextEvents,
                            updatedAt: new Date().toISOString(),
                        };
                        saveExecutionFilesRaw(allFiles);
                        syncExecutionFilesIndexCache(allFiles);
                        if (String(state.currentFile?.id || '').trim() === targetId && state.currentFile) {
                            const currentEvents = Array.isArray(state.currentFile.timelineEvents)
                                ? state.currentFile.timelineEvents
                                : [];
                            return {
                                currentFile: {
                                    ...state.currentFile,
                                    timelineEvents: [...currentEvents, event],
                                },
                            };
                        }
                    }
                } catch {
                    /* ignore */
                }
                return state;
            }),

        appendTimelineEventToSubFile: (subFileId: string, parentFileId: string, event: TimelineEvent) =>
            set((state) => {
                const subId = String(subFileId || '').trim();
                const pId = String(parentFileId || '').trim();
                if (!subId || !pId) return state;
                const now = new Date().toISOString();
                const nextSubFiles = state.subFiles.map((sf) => {
                    if (String(sf.id) !== subId) return sf;
                    if (String(sf.parentFileId || '') !== pId) return sf;
                    const prevEvents: TimelineEvent[] = Array.isArray(sf.timelineEvents)
                        ? sf.timelineEvents
                        : [];
                    const stamped = isInabaSubFileId(subId)
                        ? stampInabaTimelineEventMetadata(event, subId, pId)
                        : event;
                    return { ...sf, timelineEvents: [...prevEvents, stamped], updatedAt: now };
                });
                const nextState: Partial<typeof state> = { subFiles: nextSubFiles };
                if (String(state.activeSubFileId || '') === subId && state.currentFile) {
                    const prevEvents: TimelineEvent[] = Array.isArray(state.currentFile.timelineEvents)
                        ? state.currentFile.timelineEvents
                        : [];
                    const stamped = isInabaSubFileId(subId)
                        ? stampInabaTimelineEventMetadata(event, subId, pId)
                        : event;
                    const nextEvents = [...prevEvents, stamped];
                    nextState.currentFile = {
                        ...state.currentFile,
                        timelineEvents: filterTimelineEventsForInabaDossier(nextEvents, subId),
                    };
                    try {
                        storageCache.set(
                            executionStorageKey(inabaSubMetaStorageKey(pId, subId)),
                            nextState.currentFile,
                        );
                    } catch {
                        /* ignore */
                    }
                }
                return nextState;
            }),
    };
}
