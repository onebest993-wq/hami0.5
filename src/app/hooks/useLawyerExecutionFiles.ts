import { useCallback, useEffect, useRef, useState } from 'react';

import type { Dispatch, SetStateAction } from 'react';

import type { ExecutionFile } from '@/app/types/execution';

import type { FileData } from '@/app/components/lawyer/LawyerShared';

import { useAutoSave } from '@/app/hooks/useAutoSave';

import { PERSIST_DEBOUNCE_MS } from '@/app/utils/constants';

import {
    purgeExecutionDossierScopedState,
    resetExecutionDashboardStore,
} from '@/app/stores/executionDashboardStoreLazy';

import { stripExecutionTrashFields, stripExecutionArchiveFields, collectExpiredExecutionTrashIds } from '@/app/utils/executionTrash';

import {
    pruneOrphanedBridgeEvents,
    removeAllBridgedEventsForEntity,
    syncExecutionFileToCalendar,
} from '@/app/services/calendar/dossierSyncLazy';

import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';

import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';

import {
    coerceActiveFileTarget,
    coerceExecutionFilePreserveId,
} from '@/app/components/lawyer/LawyerDashboardParts/utils';

import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';
import { openExecutionDossierWithContract } from '@/app/runtime/executionOpenContract';
import { readExecutionFilesBootstrap } from '@/app/utils/executionFilesBootstrap';
import { purgeDeletedExecutionDossiers } from '@/app/utils/purgeDeletedExecutionDossiers';

const EXECUTION_MUTATION_FEATURE = 'تنفيذ';

type ActiveDossier = FileData | ExecutionFile | null;

type ExecutionFilesStorageMod = typeof import('@/app/utils/executionFilesStorage');
type ExecutionLifecycleMutationsMod = typeof import('@/app/utils/executionLifecycleMutations');
type ExecutionDossierTombstonesMod = typeof import('@/app/utils/executionDossierTombstones');
type ExecutionStorageKeysMod = typeof import('@/app/utils/executionStorageKeys');
type ExecutionDossierReconcileMod = typeof import('@/app/utils/executionDossierStorageReconcile');

/** مفتاح lite — بلا سحب dossierStorageKeys / storageCache إلى boot-ui */
const EXECUTION_FILES_STORAGE_KEY_LITE = 'executionFiles';

function resolveLiteExecutionFilesStorageKey(userId: string | null | undefined): string {
    const owner = String(userId ?? '').trim();
    if (!owner) return EXECUTION_FILES_STORAGE_KEY_LITE;
    return `${EXECUTION_FILES_STORAGE_KEY_LITE}:${owner}`;
}

/** إبقاء أي إضبارة لها معرّف — لا حذف صامت لغياب fileNumber/caseNo */
function normalizeExecutionFiles(rawList: unknown[]): ExecutionFile[] {
    return rawList
        .map((file) => coerceExecutionFilePreserveId(file) as unknown as ExecutionFile)
        .filter((file) => file && String(file.id ?? '').trim());
}

function assertExecutionMutationAllowed(userId: string | null | undefined): boolean {
    if (isRealSignedIn(userId)) return true;
    SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${EXECUTION_MUTATION_FEATURE}`);
    return false;
}

export type LawyerArchiveOverlay =
    | 'client_requests'
    | 'all'
    | 'deleted'
    | 'lawsuit'
    | 'transaction'
    | 'execution'
    | null;

export type UseLawyerExecutionFilesParams = {
    localAutoSave: boolean;
    backgroundRuntimeEnabled: boolean;
    userId?: string | null;
    authUserId?: string | null;
    refreshAppAlerts: () => void;
    setActiveFile: Dispatch<SetStateAction<ActiveDossier>>;
    setArchiveType: Dispatch<SetStateAction<LawyerArchiveOverlay>>;
    archiveType: LawyerArchiveOverlay;
};

export function useLawyerExecutionFiles({
    localAutoSave,
    backgroundRuntimeEnabled,
    userId,
    authUserId,
    refreshAppAlerts,
    setActiveFile,
    setArchiveType,
    archiveType,
}: UseLawyerExecutionFilesParams) {
    const sessionUserId = authUserId ?? userId ?? null;

    const [storageKey, setStorageKey] = useState(() =>
        resolveLiteExecutionFilesStorageKey(sessionUserId),
    );

    const [executionFiles, setExecutionFiles] = useState<ExecutionFile[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            return normalizeExecutionFiles(readExecutionFilesBootstrap());
        } catch {
            return [];
        }
    });

    const bootstrapExecutionFilesRef = useRef(executionFiles);

    const [storageHydrated, setStorageHydrated] = useState(false);

    const storageModRef = useRef<ExecutionFilesStorageMod | null>(null);
    const lifecycleModRef = useRef<ExecutionLifecycleMutationsMod | null>(null);
    const tombstonesModRef = useRef<ExecutionDossierTombstonesMod | null>(null);
    const storageKeysModRef = useRef<ExecutionStorageKeysMod | null>(null);

    const loadStorageMod = useCallback(async (): Promise<ExecutionFilesStorageMod> => {
        if (storageModRef.current) return storageModRef.current;
        const mod = await import('@/app/utils/executionFilesStorage');
        storageModRef.current = mod;
        return mod;
    }, []);

    const loadLifecycleMod = useCallback(async (): Promise<ExecutionLifecycleMutationsMod> => {
        if (lifecycleModRef.current) return lifecycleModRef.current;
        const mod = await import('@/app/utils/executionLifecycleMutations');
        lifecycleModRef.current = mod;
        return mod;
    }, []);

    const loadTombstonesMod = useCallback(async (): Promise<ExecutionDossierTombstonesMod> => {
        if (tombstonesModRef.current) return tombstonesModRef.current;
        const mod = await import('@/app/utils/executionDossierTombstones');
        tombstonesModRef.current = mod;
        return mod;
    }, []);

    const loadStorageKeysMod = useCallback(async (): Promise<ExecutionStorageKeysMod> => {
        if (storageKeysModRef.current) return storageKeysModRef.current;
        const mod = await import('@/app/utils/executionStorageKeys');
        storageKeysModRef.current = mod;
        return mod;
    }, []);

    const loadReconcileMod = useCallback(async (): Promise<ExecutionDossierReconcileMod> => {
        return import('@/app/utils/executionDossierStorageReconcile');
    }, []);

    const loadStorageCache = useCallback(async () => {
        const m = await import('@/app/utils/storageCache');
        return m.storageCache;
    }, []);

    useAutoSave(storageKey, executionFiles, PERSIST_DEBOUNCE_MS.HEAVY, localAutoSave, storageHydrated);

    useEffect(() => {
        void import('@/app/utils/executionDossierStorageReconcile').then((m) => {
            m.exposeExecutionReconcileForDev();
        });
    }, []);

    useEffect(() => {
        let cancelled = false;
        setStorageHydrated(false);
        setStorageKey(resolveLiteExecutionFilesStorageKey(sessionUserId));

        void (async () => {
            let storage: ExecutionFilesStorageMod | null = null;
            try {
                const [storageMod, bootstrap, eager] = await Promise.all([
                    loadStorageMod(),
                    import('@/app/utils/executionFilesBootstrap'),
                    import('@/app/runtime/executionFilesEagerHydrate'),
                ]);
                storage = storageMod;
                // Preload mutation helpers so trash/archive stay sync after hydrate.
                void Promise.all([loadLifecycleMod(), loadTombstonesMod(), loadStorageKeysMod()]);

                if (cancelled) return;

                const boundKey = storage.bindExecutionFilesStorageOwner(sessionUserId);
                setStorageKey(boundKey);

                let rawList: unknown[] = [];
                try {
                    // انتظر تسخين IndexedDB قبل أي قراءة متزامنة — وإلا نقرأ [] ونكتب فوق الفهرس الحقيقي
                    const hydrated = await eager.awaitExecutionFilesEagerHydrate(sessionUserId);
                    if (Array.isArray(hydrated.rows) && hydrated.rows.length > 0) {
                        rawList = hydrated.rows;
                    }
                } catch (hydrateErr) {
                    debug.warn('[ExecutionFiles] eager hydrate failed — fallback read', hydrateErr);
                }

                if (!rawList.length) {
                    rawList = bootstrap.readExecutionFilesBootstrap();
                }
                if (!rawList.length && storage) {
                    try {
                        rawList = storage.loadExecutionFilesRaw();
                    } catch {
                        /* ignore sync read failure */
                    }
                }

                if (cancelled) return;

                const validFiles = normalizeExecutionFiles(rawList);
                bootstrapExecutionFilesRef.current = validFiles;
                setExecutionFiles(validFiles);
                try {
                    const storageCache = await loadStorageCache();
                    // touch فقط — لا تكتب عبر storageCache.set حتى لا تُفرَّغ IndexedDB عند قراءة فارغة كاذبة
                    storageCache.touchCacheEntry(storage.resolveExecutionFilesStorageKey(), validFiles);
                } catch (cacheErr) {
                    debug.warn('[ExecutionFiles] cache touch failed', cacheErr);
                }
            } catch (err) {
                debug.error('[ExecutionFiles] bootstrap hydrate failed', err);
                if (!cancelled) {
                    bootstrapExecutionFilesRef.current = [];
                    setExecutionFiles([]);
                }
            } finally {
                if (!cancelled) {
                    setStorageHydrated(true);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [sessionUserId, loadStorageMod, loadLifecycleMod, loadTombstonesMod, loadStorageKeysMod, loadStorageCache]);

    useEffect(() => {
        if (!backgroundRuntimeEnabled) return;

        let cancelled = false;

        void (async () => {
            try {
                const [eager, reconcile, storage, lifecycle] = await Promise.all([
                    import('@/app/runtime/executionFilesEagerHydrate'),
                    loadReconcileMod(),
                    loadStorageMod(),
                    loadLifecycleMod(),
                ]);

                // تسخين فهرس المالك — لا تعتمد على المفتاح العام غير المربوط
                try {
                    await eager.awaitExecutionFilesEagerHydrate(sessionUserId);
                } catch (hydrateErr) {
                    debug.warn('[ExecutionFiles] background eager hydrate failed', hydrateErr);
                }

                if (cancelled) return;

                try {
                    await reconcile.reconcileExecutionDossierStorageAsync();
                } catch (reconcileErr) {
                    debug.warn('[ExecutionFiles] background reconcile failed', reconcileErr);
                }

                const rawList = storage.loadExecutionFilesRaw();

                if (cancelled) return;

                const validFiles = normalizeExecutionFiles(rawList);

                setExecutionFiles((prev) =>
                    prev === bootstrapExecutionFilesRef.current
                        ? lifecycle.mergeExecutionFilesPreservingLifecycle(prev, validFiles)
                        : prev,
                );

                try {
                    const storageCache = await loadStorageCache();
                    storageCache.touchCacheEntry(storage.resolveExecutionFilesStorageKey(), validFiles);
                } catch (cacheErr) {
                    debug.warn('[ExecutionFiles] background cache touch failed', cacheErr);
                }
            } catch (err) {
                debug.error('[ExecutionFiles] background hydrate pass failed', err);
            } finally {
                if (!cancelled) {
                    setStorageHydrated(true);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [backgroundRuntimeEnabled, sessionUserId, loadReconcileMod, loadStorageMod, loadLifecycleMod, loadStorageCache]);

    const reloadExecutionFiles = useCallback(() => {
        void (async () => {
            const [reconcile, storage, lifecycle, storageCache] = await Promise.all([
                loadReconcileMod(),
                loadStorageMod(),
                loadLifecycleMod(),
                loadStorageCache(),
            ]);
            await reconcile.reconcileExecutionDossierStorageAsync();
            const rawList: unknown[] = storage.loadExecutionFilesRaw();
            const validFiles = normalizeExecutionFiles(rawList);
            storageCache.set(storage.resolveExecutionFilesStorageKey(), validFiles);
            setExecutionFiles((prev) => lifecycle.mergeExecutionFilesPreservingLifecycle(prev, validFiles));
        })();
    }, [loadReconcileMod, loadStorageMod, loadLifecycleMod, loadStorageCache]);

    useEffect(() => {
        if (archiveType !== 'execution') return;

        let cancelled = false;

        void (async () => {
            const [storage, lifecycle, storageCache] = await Promise.all([
                loadStorageMod(),
                loadLifecycleMod(),
                loadStorageCache(),
            ]);
            if (cancelled) return;

            const syncList = normalizeExecutionFiles(storage.loadExecutionFilesRaw());
            if (syncList.length > 0) {
                setExecutionFiles((prev) => lifecycle.mergeExecutionFilesPreservingLifecycle(prev, syncList));
                storageCache.touchCacheEntry(storage.resolveExecutionFilesStorageKey(), syncList);
            }
        })();

        // مسار الخلفية يُشغّل reconcile بالفعل — تجنّب تكراره عند فتح المخزن (كان يجمّد الواجهة)
        let cancelReconcile = () => {};
        if (!backgroundRuntimeEnabled) {
            cancelReconcile = scheduleIdleWork(() => {
                void loadReconcileMod().then((reconcile) =>
                    reconcile.reconcileExecutionDossierStorageAsync().then(() => {
                        reloadExecutionFiles();
                    }),
                );
            }, 1200);
        }

        void import('@/app/utils/lazyComponentsIntent').then((m) => m.prefetchArchivePortal());
        return () => {
            cancelled = true;
            cancelReconcile();
        };
    }, [
        archiveType,
        backgroundRuntimeEnabled,
        reloadExecutionFiles,
        loadStorageMod,
        loadLifecycleMod,
        loadReconcileMod,
        loadStorageCache,
    ]);

    const calendarUserId = resolveCalendarUserId(userId ?? authUserId ?? null);

    const persistExecutionList = useCallback(
        (next: ExecutionFile[]) => {
            const apply = async (storage: ExecutionFilesStorageMod) => {
                await storage.saveExecutionFilesRawDurable(next);
                const storageCache = await loadStorageCache();
                storageCache.touchCacheEntry(storage.resolveExecutionFilesStorageKey(), next);
            };
            const cached = storageModRef.current;
            if (cached) {
                void apply(cached);
                return;
            }
            void loadStorageMod().then((storage) => apply(storage));
        },
        [loadStorageMod, loadStorageCache],
    );

    const moveExecutionToTrash = useCallback(
        (fileId: string | number) => {
            if (!assertExecutionMutationAllowed(sessionUserId)) return;

            const deletedAt = new Date().toISOString();

            void (async () => {
                const lifecycle = await loadLifecycleMod();
                let cascadeIds: string[] = [];

                setExecutionFiles((prev) => {
                    cascadeIds = lifecycle.collectExecutionCascadeIds(prev, fileId);
                    const cascadeSet = new Set(cascadeIds);

                    const next = prev.map((f) => {
                        if (!cascadeSet.has(String(f.id ?? ''))) return f;

                        const row = stripExecutionArchiveFields(f as unknown as Record<string, unknown>);

                        return {
                            ...row,
                            executionTrashDeletedAt: deletedAt,
                        } as ExecutionFile;
                    });

                    persistExecutionList(next);

                    for (const id of cascadeIds) {
                        lifecycle.applyExecutionTrashLifecyclePatch(id, deletedAt);
                    }

                    return next;
                });

                const idSet = new Set(cascadeIds.length > 0 ? cascadeIds : [String(fileId)]);

                setActiveFile((cur) => {
                    if (!cur) return null;
                    return idSet.has(String(cur.id ?? '')) ? null : cur;
                });

                for (const id of idSet) {
                    void import('@/app/workspace/unpinWorkspaceEntity')
                        .then((m) => m.unpinWorkspaceItem(id, 'execution'))
                        .catch(() => undefined);
                }

                queueMicrotask(() => {
                    for (const id of idSet) {
                        void removeAllBridgedEventsForEntity('execution', id, calendarUserId);
                    }

                    void pruneOrphanedBridgeEvents(calendarUserId);
                    void refreshAppAlerts();
                });
            })();
        },
        [
            calendarUserId,
            loadLifecycleMod,
            persistExecutionList,
            refreshAppAlerts,
            sessionUserId,
            setActiveFile,
        ],
    );

    const restoreExecutionFromTrash = useCallback(
        (fileId: string | number) => {
            if (!assertExecutionMutationAllowed(sessionUserId)) return;

            const idStr = String(fileId);

            setExecutionFiles((prev) => {
                const next = prev.map((f) =>
                    String(f.id) !== idStr
                        ? f
                        : (stripExecutionTrashFields(f as unknown as Record<string, unknown>) as unknown as ExecutionFile),
                ) as ExecutionFile[];

                persistExecutionList(next);

                const restored = next.find((f) => String(f.id) === idStr);

                if (restored) {
                    syncExecutionFileToCalendar(restored as unknown as Record<string, unknown>, userId);
                }

                return next;
            });
        },
        [persistExecutionList, sessionUserId, userId],
    );

    const archiveExecution = useCallback(
        (fileId: string | number) => {
            if (!assertExecutionMutationAllowed(sessionUserId)) return;
            const idStr = String(fileId);
            setExecutionFiles((prev) => {
                const next = prev.map((f) =>
                    String(f.id) === idStr
                        ? ({
                              ...(stripExecutionTrashFields(f as unknown as Record<string, unknown>) as unknown as ExecutionFile),
                              executionArchivedAt: new Date().toISOString(),
                          } as ExecutionFile)
                        : f,
                ) as ExecutionFile[];
                persistExecutionList(next);
                return next;
            });
            setActiveFile((cur) => (cur && String(cur.id ?? '') === idStr ? null : cur));
            void removeAllBridgedEventsForEntity('execution', fileId, calendarUserId);
            void pruneOrphanedBridgeEvents(calendarUserId);
            void import('@/app/workspace/unpinWorkspaceEntity')
                .then((m) => m.unpinWorkspaceItem(fileId, 'execution'))
                .catch(() => undefined);
            void refreshAppAlerts();
        },
        [calendarUserId, persistExecutionList, refreshAppAlerts, sessionUserId, setActiveFile],
    );

    const restoreArchivedExecution = useCallback(
        (fileId: string | number) => {
            if (!assertExecutionMutationAllowed(sessionUserId)) return;
            const idStr = String(fileId);
            setExecutionFiles((prev) => {
                const next = prev.map((f) =>
                    String(f.id) !== idStr
                        ? f
                        : (stripExecutionArchiveFields(f as unknown as Record<string, unknown>) as unknown as ExecutionFile),
                ) as ExecutionFile[];
                persistExecutionList(next);
                const restored = next.find((f) => String(f.id) === idStr);
                if (restored) {
                    syncExecutionFileToCalendar(restored as unknown as Record<string, unknown>, userId);
                }
                return next;
            });
        },
        [persistExecutionList, sessionUserId, userId],
    );

    const permanentlyDeleteExecutions = useCallback(
        (ids: Array<string | number>) => {
            if (!assertExecutionMutationAllowed(sessionUserId)) return;

            void (async () => {
                const [lifecycle, tombstones, storageKeys] = await Promise.all([
                    loadLifecycleMod(),
                    loadTombstonesMod(),
                    loadStorageKeysMod(),
                ]);

                let expandedIds: string[] = [];
                let tombstonesCommitted = false;

                setExecutionFiles((prev) => {
                    const idSet = new Set<string>();
                    for (const rawId of ids) {
                        for (const id of lifecycle.collectExecutionCascadeIds(prev, rawId)) {
                            idSet.add(id);
                        }
                    }
                    expandedIds = [...idSet];
                    if (expandedIds.length === 0) return prev;

                    tombstonesCommitted = tombstones.markExecutionDossierTombstones(expandedIds);

                    const next = prev.filter((f) => !idSet.has(String(f.id)));

                    persistExecutionList(next);

                    return next;
                });

                if (expandedIds.length === 0) return;

                // بلا شاهد قبر مُثبَّت يعود الملف من السحابة عند أول مزامنة
                if (!tombstonesCommitted) {
                    debug.warn('[Execution] تعذّر تثبيت شاهد الحذف:', expandedIds);
                    SmartToast.warning('حُذف محلياً — تعذّر تثبيت سجل الحذف، قد يعود عند المزامنة');
                }

                const idSet = new Set(expandedIds);

                setActiveFile((cur) => (cur && idSet.has(String(cur?.id)) ? null : cur));

                for (const id of idSet) {
                    void import('@/app/workspace/unpinWorkspaceEntity')
                        .then((m) => m.unpinWorkspaceItem(id, 'execution'))
                        .catch(() => undefined);
                }

                queueMicrotask(() => {
                    void (async () => {
                        const { storageFailures, cloudFailures } = await purgeDeletedExecutionDossiers(
                            idSet,
                            {
                                removeStorageBundle: async (id) => {
                                    await storageKeys.removeExecutionStorageBundleAsync(id);
                                },
                                purgeScopedState: async (id) => {
                                    await purgeExecutionDossierScopedState(id);
                                    void removeAllBridgedEventsForEntity('execution', id, userId);
                                },
                                deleteFromCloud: async (id) => {
                                    const { SupabaseService } = await import(
                                        '@/app/services/SupabaseService'
                                    );
                                    await SupabaseService.deleteExecutionFile(id);
                                },
                            },
                        );

                        if (storageFailures.length > 0) {
                            debug.warn('[Execution] فشل مسح تخزين الإضابير:', storageFailures);
                            SmartToast.warning(
                                storageFailures.length === 1
                                    ? 'حُذفت الإضبارة — تعذّر مسح بعض بياناتها المحلية'
                                    : `حُذفت الإضابير — تعذّر مسح بيانات ${storageFailures.length} منها محلياً`,
                            );
                        }

                        if (cloudFailures.length > 0) {
                            debug.warn('[Execution] فشل حذف السحابة بعد الحذف المحلي:', cloudFailures);
                            SmartToast.warning('حُذف محلياً — تعذّر مزامنة الحذف مع السحابة');
                        }

                        void pruneOrphanedBridgeEvents(userId);
                    })();
                });
            })();
        },
        [
            loadLifecycleMod,
            loadStorageKeysMod,
            loadTombstonesMod,
            persistExecutionList,
            sessionUserId,
            setActiveFile,
            userId,
        ],
    );

    const expiredTrashPurgeInFlightRef = useRef<Set<string>>(new Set());

    /** حذف نهائي حقيقي للإضابير التي انتهت مهلة الـ 30 يوماً في السلة */
    useEffect(() => {
        const expired = collectExpiredExecutionTrashIds(executionFiles).filter(
            (id) => !expiredTrashPurgeInFlightRef.current.has(id),
        );
        if (expired.length === 0) return;
        for (const id of expired) expiredTrashPurgeInFlightRef.current.add(id);
        permanentlyDeleteExecutions(expired);
    }, [executionFiles, permanentlyDeleteExecutions]);

    const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);

    const handleAddExecutionFile = useCallback(
        (newFile: Record<string, unknown>) => {
            if (!assertExecutionMutationAllowed(sessionUserId)) return;
            void (async () => {
                const [storageKeys, eager, storage] = await Promise.all([
                    loadStorageKeysMod(),
                    import('@/app/runtime/executionFilesEagerHydrate'),
                    loadStorageMod(),
                ]);
                // نفس معرّف الإنشاء (سحابة + محلي) — لا تولّد معرّفاً ثانياً يتيم السحابة
                const submitId = String(newFile.id ?? '').trim();
                const dossierId = submitId || storageKeys.generateExecutionDossierId();

                // خزّن الـ blob من الحمولة الكاملة قبل التطبيع — coerce كان يحذف docType/docNumber/judgmentDate
                const rawWithId = {
                    ...newFile,
                    type: 'execution',
                    id: dossierId,
                };
                storageKeys.seedFreshExecutionDossierStorage(rawWithId);

                const fileWithId = coerceActiveFileTarget(rawWithId);

                let nextList: ExecutionFile[] = [];
                setExecutionFiles((prev) => {
                    nextList = [fileWithId as unknown as ExecutionFile, ...prev];
                    return nextList;
                });

                await storage.saveExecutionFilesRawDurable(nextList);
                const storageCache = await loadStorageCache();
                storageCache.touchCacheEntry(storage.resolveExecutionFilesStorageKey(), nextList);
                eager.invalidateExecutionFilesEagerHydrate();

                await resetExecutionDashboardStore();
                setIsExecutionModalOpen(false);
                // البقاء في مخزن التنفيذ بعد الإنشاء (لا طرد للرئيسية)
                setArchiveType('execution');
                setActiveFile(fileWithId);
            })();
        },
        [
            loadStorageKeysMod,
            loadStorageMod,
            loadStorageCache,
            sessionUserId,
            setActiveFile,
            setArchiveType,
        ],
    );

    const handleUpdateExecutionFile = useCallback(
        (updatedFile: ExecutionFile) => {
            if (!assertExecutionMutationAllowed(sessionUserId)) return;
            setExecutionFiles((prev) => {
                const next = prev.map((f) => {
                    if (String(f.id) !== String(updatedFile.id)) return f;

                    const merged: ExecutionFile = { ...f, ...updatedFile };

                    if (
                        f.executionTrashDeletedAt != null &&
                        !Object.prototype.hasOwnProperty.call(updatedFile, 'executionTrashDeletedAt')
                    ) {
                        merged.executionTrashDeletedAt = f.executionTrashDeletedAt;
                    }

                    if (
                        f.executionArchivedAt != null &&
                        !Object.prototype.hasOwnProperty.call(updatedFile, 'executionArchivedAt')
                    ) {
                        merged.executionArchivedAt = f.executionArchivedAt;
                    }

                    if (
                        f.debtor_absence_badge_dismissed === true &&
                        !Object.prototype.hasOwnProperty.call(updatedFile, 'debtor_absence_badge_dismissed')
                    ) {
                        merged.debtor_absence_badge_dismissed = f.debtor_absence_badge_dismissed;
                    }

                    if (
                        f.debtor_absence_badge_dismissed_by_debtor != null &&
                        !Object.prototype.hasOwnProperty.call(
                            updatedFile,
                            'debtor_absence_badge_dismissed_by_debtor',
                        )
                    ) {
                        merged.debtor_absence_badge_dismissed_by_debtor =
                            f.debtor_absence_badge_dismissed_by_debtor;
                    }

                    return merged;
                });

                if (storageHydrated) {
                    persistExecutionList(next);
                }

                return next;
            });

            setActiveFile((prev) => {
                if (!prev || String(prev.id) !== String(updatedFile.id)) return prev;

                const merged = { ...prev, ...updatedFile } as ExecutionFile;

                return 'type' in prev && prev.type === 'execution'
                    ? coerceActiveFileTarget(merged)
                    : merged;
            });

            syncExecutionFileToCalendar(updatedFile as unknown as Record<string, unknown>, userId);

            void refreshAppAlerts();
        },
        [persistExecutionList, refreshAppAlerts, sessionUserId, setActiveFile, storageHydrated, userId],
    );

    const openExecutionArchiveFile = useCallback(
        (f: unknown): boolean => {
            if (!assertExecutionMutationAllowed(sessionUserId)) return false;
            if (!f || typeof f !== 'object') return false;
            const idRaw = (f as { id?: unknown }).id;
            if (
                !(
                    (typeof idRaw === 'number' && Number.isFinite(idRaw)) ||
                    (typeof idRaw === 'string' && idRaw.trim().length > 0)
                )
            ) {
                return false;
            }
            const fromPool = executionFiles.find((row) => String(row.id) === String(idRaw));
            if (!fromPool) return false;

            openExecutionDossierWithContract(() => {
                setActiveFile(coerceExecutionFilePreserveId(fromPool));
                void import('@/app/utils/lazyComponentsIntent').then((m) =>
                    m.warmExecutionDossier('urgent'),
                );
            });
            return true;
        },
        [executionFiles, sessionUserId, setActiveFile],
    );

    return {
        executionFiles,
        setExecutionFiles,
        reloadExecutionFiles,
        moveExecutionToTrash,
        restoreExecutionFromTrash,
        archiveExecution,
        restoreArchivedExecution,
        permanentlyDeleteExecutions,
        isExecutionModalOpen,
        setIsExecutionModalOpen,
        handleAddExecutionFile,
        handleUpdateExecutionFile,
        openExecutionArchiveFile,
        storageHydrated,
    };
}
