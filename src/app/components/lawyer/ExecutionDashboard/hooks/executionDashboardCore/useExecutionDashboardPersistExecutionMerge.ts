/** Phase C — دمج patch على ملف التنفيذ + تخزين/متجر */

import { useCallback, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';

import {

    useExecutionDashboardStore,

    filterTimelineEventsForInabaDossier,

    inabaSubMetaStorageKey,

    isInabaSubFileId,

} from '@/app/stores/executionDashboardStore';

import SecureStoreService from '@/app/services/SecureStoreService';

import { persistExecutionDossierBlob } from '@/app/utils/executionDossierBlobPersistence';

import { storageCache } from '@/app/utils/storageCache';

import { executionStorageKey } from '@/app/utils/executionStorageKeys';

import { sanitizeExecutionPersistPatch } from '../../helpers/executionPersistPatchSanitizer';
import {
    guardCreditorAgentMutation,
    patchTouchesCreditorAgentOnlyKeys,
} from '../../helpers/executionAgentPrivilege';



export type UseExecutionDashboardPersistExecutionMergeParams = {

    executionId: string | undefined;

    isUnifiedTabActive: boolean;

    unifiedTabId: string | undefined;

    onUpdate?: (file: ExecutionFile) => void;

    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;

    seizureDraftsByDecisionIdRef: MutableRefObject<ExecutionFile['seizureDraftsByDecisionId']>;

    setExecutionStorageTick: Dispatch<SetStateAction<number>>;

    isRepresentingDebtor?: boolean;

    showToast?: (message: string, type?: string) => void;
};



/** يؤجّل I/O الثقيل حتى بعد رسم التحديث الفوري في الواجهة. */

function schedulePersistIo(work: () => void): void {

    if (typeof queueMicrotask === 'function') {

        queueMicrotask(work);

    } else {

        setTimeout(work, 0);

    }

}



/** وفاة/إحلال — يجب ألا يعتمد على microtask + debounce IDB وإلا يضيع عند Reload. */

export function isDurablePartyDeathPersistPatch(patch: Record<string, unknown>): boolean {

    return (

        'is_creditor_deceased' in patch ||

        'is_debtor_deceased' in patch ||

        'creditor_party_death_case' in patch ||

        'debtor_party_death_case' in patch ||

        'party_death_case' in patch

    );

}



function commitExecutionViewOptimistically(params: {

    merged: ExecutionFile;

    cacheKey: string;

    epoch: number;

    persistEpochRef: MutableRefObject<number>;

    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;

    setExecutionStorageTick: Dispatch<SetStateAction<number>>;

    applyStore: (merged: ExecutionFile) => void;

}): void {

    const {

        merged,

        cacheKey,

        epoch,

        persistEpochRef,

        executionDataRef,

        setExecutionStorageTick,

        applyStore,

    } = params;

    // ui-first: كتابة blob عبر set حتى يمر get() بفحص SecureStore (touch وحده يُبطَل)
    storageCache.set(cacheKey, merged);

    executionDataRef.current = merged;

    schedulePersistIo(() => {

        if (epoch !== persistEpochRef.current) return;

        setExecutionStorageTick((n) => n + 1);

        const latest = (executionDataRef.current ?? merged) as ExecutionFile;

        applyStore(latest);

    });

}



export function useExecutionDashboardPersistExecutionMerge({

    executionId,

    isUnifiedTabActive,

    unifiedTabId,

    onUpdate,

    executionDataRef,

    seizureDraftsByDecisionIdRef,

    setExecutionStorageTick,

    isRepresentingDebtor,

    showToast,

}: UseExecutionDashboardPersistExecutionMergeParams) {

    /** يمنع كتابة قرص مؤجّلة قديمة من مسح وفاة/إحلال أحدث. */

    const persistEpochRef = useRef(0);



    const persistExecutionMerge = useCallback(

        (patch: Record<string, unknown>): boolean => {

            const sanitized = sanitizeExecutionPersistPatch(patch);

            if (!sanitized.ok) return false;

            const safePatch = sanitized.patch;

            if (
                patchTouchesCreditorAgentOnlyKeys(safePatch) &&
                !guardCreditorAgentMutation({
                    isRepresentingDebtor,
                    showToast,
                    actionLabel: 'تعديل البيانات المالية أو الحجز',
                })
            ) {
                return false;
            }

            const base = executionDataRef.current;

            if (!base) return false;

            const durableDeath = isDurablePartyDeathPersistPatch(safePatch);

            const epoch = ++persistEpochRef.current;

            const storeState = useExecutionDashboardStore.getState();

            if (storeState.activeSubFileId) {

                const subFileId = storeState.activeSubFileId;

                const parentIdForSub = String(

                    storeState.delegationParentFileId || executionId || base.id || '',

                ).trim();

                const subCacheKey = inabaSubMetaStorageKey(parentIdForSub, subFileId);

                const cacheKey = executionStorageKey(String(subCacheKey));

                const merged = {

                    ...base,

                    seizureDraftsByDecisionId: seizureDraftsByDecisionIdRef.current,

                    ...safePatch,

                    id: subFileId,

                    parentId: parentIdForSub,

                    updatedAt: new Date().toISOString(),

                } as ExecutionFile;

                if (safePatch.timelineEvents !== undefined && isInabaSubFileId(subFileId)) {

                    merged.timelineEvents = filterTimelineEventsForInabaDossier(

                        (safePatch.timelineEvents as TimelineEvent[]) || [],

                        subFileId,

                    );

                }



                commitExecutionViewOptimistically({

                    merged,

                    cacheKey,

                    epoch,

                    persistEpochRef,

                    executionDataRef,

                    setExecutionStorageTick,

                    applyStore: (next) => {

                        const latest = useExecutionDashboardStore.getState();

                        useExecutionDashboardStore.setState({

                            subFiles: latest.subFiles.map((f) =>

                                f.id === subFileId

                                    ? {

                                          ...f,

                                          fileNumber: next.fileNumber ?? f.fileNumber,

                                          fileYear:

                                              next.fileYear ?? (f as { fileYear?: string }).fileYear,

                                          timelineEvents: next.timelineEvents ?? f.timelineEvents,

                                          updatedAt: next.updatedAt,

                                      }

                                    : f,

                            ),

                            currentFile: next,

                        });

                        useExecutionDashboardStore.getState().setCurrentFile(next);

                    },

                });



                const writeSubDisk = () => {

                    if (epoch !== persistEpochRef.current) return;

                    const latest = (executionDataRef.current ?? merged) as ExecutionFile;

                    storageCache.set(cacheKey, latest);

                    storageCache.touchCacheEntry(cacheKey, latest);

                    onUpdate?.(latest);

                    SecureStoreService.flushHeavyPersistPending();

                };

                if (durableDeath) {

                    writeSubDisk();

                } else {

                    schedulePersistIo(writeSubDisk);

                }

                return true;

            }



            const scopedPersistKey = isUnifiedTabActive

                ? String(unifiedTabId || base.id || '')

                : String(executionId ?? base.id ?? '');

            const persistKey = String(scopedPersistKey || '').trim();

            if (!persistKey || persistKey === 'undefined') return false;

            const cacheKey = executionStorageKey(String(persistKey));

            const merged = {

                ...base,

                seizureDraftsByDecisionId: seizureDraftsByDecisionIdRef.current,

                ...safePatch,

                updatedAt: new Date().toISOString(),

            } as ExecutionFile;



            commitExecutionViewOptimistically({

                merged,

                cacheKey,

                epoch,

                persistEpochRef,

                executionDataRef,

                setExecutionStorageTick,

                applyStore: (next) => {

                    try {

                        const st = useExecutionDashboardStore.getState();

                        if (!st.activeSubFileId) {

                            const same =

                                !st.currentFile || String(st.currentFile.id) === String(next.id);

                            if (same) st.setCurrentFile(next);

                        }

                    } catch {

                        /* ignore */

                    }

                },

            });



            const writeMainDisk = (): boolean => {

                if (epoch !== persistEpochRef.current) return false;

                const latest = (executionDataRef.current ?? merged) as ExecutionFile;

                const latestHasDeath = isDurablePartyDeathPersistPatch(

                    latest as unknown as Record<string, unknown>,

                );

                const syncIndex = durableDeath || latestHasDeath;

                const ok = persistExecutionDossierBlob(

                    persistKey,

                    latest as unknown as Record<string, unknown>,

                    { syncIndex },

                );

                storageCache.touchCacheEntry(cacheKey, latest);

                onUpdate?.(latest);

                SecureStoreService.flushHeavyPersistPending();

                return ok;

            };



            if (durableDeath) {

                return writeMainDisk();

            }



            schedulePersistIo(() => {

                writeMainDisk();

            });

            return true;

        },

        [

            executionId,

            onUpdate,

            isUnifiedTabActive,

            unifiedTabId,

            executionDataRef,

            seizureDraftsByDecisionIdRef,

            setExecutionStorageTick,

            isRepresentingDebtor,

            showToast,

        ],

    );



    return { persistExecutionMerge };

}


