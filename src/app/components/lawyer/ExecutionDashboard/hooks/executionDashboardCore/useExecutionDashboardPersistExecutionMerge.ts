/** Phase C — دمج patch على ملف التنفيذ + تخزين/متجر */

import { useCallback, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { filterTimelineEventsForInabaDossier } from '@/app/domain/execution/dossier/ExecutionDossierScope';
import {
    useExecutionDashboardStore,
    inabaSubMetaStorageKey,
    isInabaSubFileId,
} from '@/app/stores/executionDashboardStore';
import SecureStoreService from '@/app/services/SecureStoreService';
import { persistExecutionDossierBlob } from '@/app/utils/executionDossierBlobPersistence';
import { storageCache } from '@/app/utils/storageCache';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { debug } from '@/app/utils/debug';
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

/**
 * نتيجة الكتابة المؤجّلة على القرص.
 *
 * `superseded` ليست فشلاً: كتابة أحدث ألغت هذه، وهو سلوك مقصود يمنع كتابة
 * قديمة من مسح أحدث. الخلط بينها وبين `failed` يُنتج إنذاراً كاذباً.
 */
type PersistDiskOutcome = 'persisted' | 'failed' | 'superseded';

/** يؤجّل I/O الثقيل حتى بعد رسم التحديث الفوري في الواجهة. */

function schedulePersistIo(work: () => void): void {
    if (typeof queueMicrotask === 'function') {
        queueMicrotask(work);
    } else {
        setTimeout(work, 0);
    }
}

/** وفاة/إحلال — يجب ألا يعتمد على microtask + debounce IDB وإلا يضيع عند Reload. */

function isDurablePartyDeathPersistPatch(patch: Record<string, unknown>): boolean {
    return (
        'is_creditor_deceased' in patch ||
        'is_debtor_deceased' in patch ||
        'creditor_party_death_case' in patch ||
        'debtor_party_death_case' in patch ||
        'party_death_case' in patch
    );
}

/** مواعيد المحضونين — نفس خطر الضياع عند إعادة التحميل السريع */

function isDurableCustodyWardPersistPatch(patch: Record<string, unknown>): boolean {
    return 'custodyWardDelivery' in patch;
}

/** تبويبات محضر المتابعة — سجل تحركات الطرف الآخر ومسارات الطلبات */

function isDurableFollowupTabPersistPatch(patch: Record<string, unknown>): boolean {
    return 'other_party_actions_log' in patch || 'other_party_request_tracks' in patch;
}

/** أثاث زوجية — نتائج التسليم والمبلغ المالي يجب أن تصل للقرص فوراً */

function isDurableMaritalFurnitureDeliveryPersistPatch(patch: Record<string, unknown>): boolean {
    if ('maritalFurnitureDeliveryRecordedAt' in patch) return true;
    if ('maritalFurnitureEarlyDeliveryUnlocked' in patch) return true;
    if ('debtAmount' in patch || 'totalAmount' in patch) {
        const debt = Math.round(Number(patch.debtAmount) || 0);
        const total = Math.round(Number(patch.totalAmount) || 0);
        if (debt > 0 || total > 0) return true;
    }
    if (!Array.isArray(patch.maritalFurnitureItems)) return false;
    return (patch.maritalFurnitureItems as Array<Record<string, unknown>>).some(
        (row) =>
            Boolean(row?.deliveryOutcome) ||
            Boolean(row?.deliveryRecordedAt) ||
            typeof row?.delivered === 'boolean',
    );
}

/** إجراءات الجبر غير المالية — timeline هو مسار الحفظ لـ قوة تنفيذية / امتناع / حبس / منع سفر */

export function isDurableCoercivePersistPatch(patch: Record<string, unknown>): boolean {
    return (
        'activeCoerciveActions' in patch ||
        'timelineEvents' in patch ||
        'travel_ban_withdrawn_at' in patch
    );
}

function isDurableImmediateExecutionPersistPatch(patch: Record<string, unknown>): boolean {
    return (
        isDurablePartyDeathPersistPatch(patch) ||
        isDurableCustodyWardPersistPatch(patch) ||
        isDurableFollowupTabPersistPatch(patch) ||
        isDurableMaritalFurnitureDeliveryPersistPatch(patch) ||
        isDurableCoercivePersistPatch(patch) ||
        patchTouchesCreditorAgentOnlyKeys(patch)
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
    const reportPersistFailure = useCallback(
        (outcome: PersistDiskOutcome) => {
            if (outcome !== 'failed') return;
            debug.warn('[ExecutionPersist] فشل تثبيت التغيير على الجهاز:', executionId);
            showToast?.('تعذّر حفظ التغيير على الجهاز — أعِد المحاولة', 'error');
        },
        [executionId, showToast],
    );
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
            const durableImmediate = isDurableImmediateExecutionPersistPatch(safePatch);
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
                const writeSubDisk = (): PersistDiskOutcome => {
                    if (epoch !== persistEpochRef.current) return 'superseded';
                    const latest = (executionDataRef.current ?? merged) as ExecutionFile;
                    const ok = storageCache.set(cacheKey, latest);
                    storageCache.touchCacheEntry(cacheKey, latest);
                    onUpdate?.(latest);
                    SecureStoreService.flushHeavyPersistPending();
                    return ok ? 'persisted' : 'failed';
                };
                if (durableImmediate) {
                    return writeSubDisk() === 'persisted';
                }
                schedulePersistIo(() => {
                    reportPersistFailure(writeSubDisk());
                });
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
            const writeMainDisk = (): PersistDiskOutcome => {
                if (epoch !== persistEpochRef.current) return 'superseded';
                const latest = (executionDataRef.current ?? merged) as ExecutionFile;
                const latestHasDeath = isDurablePartyDeathPersistPatch(
                    latest as unknown as Record<string, unknown>,
                );
                const syncIndex = durableImmediate || latestHasDeath;
                const ok = persistExecutionDossierBlob(
                    persistKey,
                    latest as unknown as Record<string, unknown>,
                    { syncIndex },
                );
                storageCache.touchCacheEntry(cacheKey, latest);
                onUpdate?.(latest);
                SecureStoreService.flushHeavyPersistPending();
                return ok ? 'persisted' : 'failed';
            };
            if (durableImmediate) {
                return writeMainDisk() === 'persisted';
            }
            schedulePersistIo(() => {
                // كانت نتيجة القرص تُرمى هنا، فتُعيد الدالة true دائماً ويرى
                // المستخدم «حُفِظ» وقد فشلت الكتابة. الإبلاغ لا يخالف عقد
                // ui-first: التثبيت مؤجّل كما هو، والفشل وحده يُعلَن.
                reportPersistFailure(writeMainDisk());
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
            reportPersistFailure,
        ],
    );
    return { persistExecutionMerge };
}
