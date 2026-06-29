// @ts-nocheck
/** Phase C — دمج patch على ملف التنفيذ + تخزين/متجر */
import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    useExecutionDashboardStore,
    filterTimelineEventsForInabaDossier,
    inabaSubMetaStorageKey,
    isInabaSubFileId,
} from '@/app/stores';
import { storageCache } from '@/app/utils/storageCache';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';

export type UseExecutionDashboardPersistExecutionMergeParams = {
    executionId: string | undefined;
    isUnifiedTabActive: boolean;
    unifiedTabId: string | undefined;
    onUpdate?: (file: ExecutionFile) => void;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    seizureDraftsByDecisionIdRef: MutableRefObject<Record<string, unknown>>;
    setExecutionStorageTick: Dispatch<SetStateAction<number>>;
};

export function useExecutionDashboardPersistExecutionMerge({
    executionId,
    isUnifiedTabActive,
    unifiedTabId,
    onUpdate,
    executionDataRef,
    seizureDraftsByDecisionIdRef,
    setExecutionStorageTick,
}: UseExecutionDashboardPersistExecutionMergeParams) {
    const persistExecutionMerge = useCallback(
        (patch: Record<string, unknown>) => {
            const base = executionDataRef.current;
            if (!base) return;
            const storeState = useExecutionDashboardStore.getState();
            if (storeState.activeSubFileId) {
                const subFileId = storeState.activeSubFileId;
                const parentIdForSub = String(
                    storeState.delegationParentFileId || executionId || base.id || '',
                ).trim();
                const subCacheKey = inabaSubMetaStorageKey(parentIdForSub, subFileId);
                const merged = {
                    ...base,
                    seizureDraftsByDecisionId: seizureDraftsByDecisionIdRef.current,
                    ...patch,
                    id: subFileId,
                    parentId: parentIdForSub,
                    updatedAt: new Date().toISOString(),
                } as ExecutionFile;
                if (patch.timelineEvents !== undefined && isInabaSubFileId(subFileId)) {
                    merged.timelineEvents = filterTimelineEventsForInabaDossier(
                        (patch.timelineEvents as TimelineEvent[]) || [],
                        subFileId,
                    );
                }
                storageCache.set(executionStorageKey(String(subCacheKey)), merged);
                useExecutionDashboardStore.setState({
                    subFiles: storeState.subFiles.map((f) =>
                        f.id === subFileId
                            ? {
                                  ...f,
                                  fileNumber: merged.fileNumber ?? f.fileNumber,
                                  fileYear: merged.fileYear ?? (f as { fileYear?: string }).fileYear,
                                  timelineEvents: merged.timelineEvents ?? f.timelineEvents,
                                  decisions: merged.decisions ?? f.decisions,
                                  updatedAt: merged.updatedAt,
                              }
                            : f,
                    ),
                    currentFile: merged,
                });
                useExecutionDashboardStore.getState().setCurrentFile(merged);
                setExecutionStorageTick((n) => n + 1);
                return;
            }
            const scopedPersistKey = isUnifiedTabActive
                ? String(unifiedTabId || base.id || '')
                : String(executionId ?? base.id ?? '');
            const persistKey = String(scopedPersistKey || '').trim();
            if (!persistKey || persistKey === 'undefined') return;
            const merged = {
                ...base,
                seizureDraftsByDecisionId: seizureDraftsByDecisionIdRef.current,
                ...patch,
                updatedAt: new Date().toISOString(),
            } as ExecutionFile;
            storageCache.set(executionStorageKey(String(persistKey)), merged);
            try {
                const st = useExecutionDashboardStore.getState();
                if (!st.activeSubFileId) {
                    const same = !st.currentFile || String(st.currentFile.id) === String(merged.id);
                    if (same) st.setCurrentFile(merged);
                }
            } catch {
                /* ignore */
            }
            setExecutionStorageTick((n) => n + 1);
            onUpdate?.(merged);
        },
        [
            executionId,
            onUpdate,
            isUnifiedTabActive,
            unifiedTabId,
            executionDataRef,
            seizureDraftsByDecisionIdRef,
            setExecutionStorageTick,
        ],
    );

    return { persistExecutionMerge };
}
