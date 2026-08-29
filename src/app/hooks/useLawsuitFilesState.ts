import { useCallback, useEffect, useRef, useState } from 'react';

import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';

import {
    loadLawsuitArchivedSegmentFiles,
    loadLawsuitBootSegments,
    loadLawsuitTrashSegmentFiles,
    reloadLawsuitFilesFromStorage,
    type LawsuitFileSegments,
} from '@/app/domain/lawsuit/lawsuitFilesRepository';
import { enrichLifecycleIndexFromSegmentFiles, rebuildActiveSegmentInIndex } from '@/app/domain/lawsuit/lawsuitLifecycleIndex';
import {
    applyLawsuitDurabilityOverlaysToSegments,
    bootHasLawsuitRecords,
    pickRicherLawsuitSegments as pickRicherSegments,
    shouldBlockEmptyLawsuitPersist,
} from '@/app/domain/lawsuit/lawsuitFilesStatePolicy';
import { lawsuitStorageMayHaveUnreadData } from '@/app/domain/lawsuit/lawsuitSegmentStorage';
import { persistLawsuitActiveBundle, persistLawsuitLifecycleMirrorBundle } from '@/app/domain/lawsuit/lawsuitDurabilityGate';
import { awaitLawsuitWorkspaceCommit } from '@/app/domain/lawsuit/lawsuitPersistFlush';
import {
    finalizeLawsuitDurabilityAfterCommit,
    flushLawsuitDurabilityOverlaysToActive,
    lawsuitDurabilityHasUncommittedWrites,
    scheduleFinalizeLawsuitDurabilityAfterCommit,
} from '@/app/domain/lawsuit/lawsuitDurabilityOverlay';
import { stagePendingLawsuitCreate } from '@/app/domain/lawsuit/lawsuitPendingCreateStore';
import { wasLawsuitStagedThisPage } from '@/app/domain/lawsuit/lawsuitPageWriteGuard';
import { setLawsuitDecryptBlocked } from '@/app/runtime/lawsuitDecryptBlockedFlag';
import { LAWSUITS_STORAGE_WARMED_EVENT } from '@/app/runtime/lawsuitWorkspaceEvents';
import { runLawsuitFilesHydrateCycle } from '@/app/hooks/lawsuitFilesHydrateCycle';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_TRASH_KEY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';

type UseLawsuitFilesStateOptions = {
    localAutoSave?: boolean;
    backgroundRuntimeEnabled: boolean;
};

/**
 * مصدر الحقيقة لملفات الدعاوى في LawyerDashboard.
 * boot: النشطة + فهرس O(1) — المخزن/المهملات تُحمَّل عند الطلب.
 */
export function useLawsuitFilesState({
    localAutoSave = true,
    backgroundRuntimeEnabled,
}: UseLawsuitFilesStateOptions) {
    const [segments, setSegments] = useState<LawsuitFileSegments>(() =>
        applyLawsuitDurabilityOverlaysToSegments(loadLawsuitBootSegments()),
    );
    const [lawsuitStorageHydrated, setLawsuitStorageHydrated] = useState(() => {
        if (bootHasLawsuitRecords(segments)) return true;
        /* معلّق/سجل WAL = بيانات مرئية — لا تُعلن hydrated-فارغ */
        if (segments.active.length > 0) return true;
        if (lawsuitDurabilityHasUncommittedWrites()) return false;
        return !lawsuitStorageMayHaveUnreadData(segments.index);
    });
    const lawsuitStorageHydratedRef = useRef(lawsuitStorageHydrated);
    lawsuitStorageHydratedRef.current = lawsuitStorageHydrated;
    const autoSaveRef = useRef(localAutoSave);
    autoSaveRef.current = localAutoSave;
    const segmentsRef = useRef(segments);
    segmentsRef.current = segments;
    const hydrateGenRef = useRef(0);
    const prevAutoSaveRef = useRef(localAutoSave);

    const persistWorkspace = useCallback((next: LawsuitFileSegments) => {
        if (!autoSaveRef.current) return;
        /* لا تُثبّت قائمة نشطة فارغة من مسار autosave — الأرشفة/السلة تكتب بـ allowShrink */
        if (next.active.length === 0) return;
        if (!lawsuitStorageHydratedRef.current) return;
        if (shouldBlockEmptyLawsuitPersist(next)) return;
        const result = persistLawsuitActiveBundle({
            active: next.active,
            index: next.index,
            archived: next.archived,
            trash: next.trash,
        });
        if (result.ok) {
            scheduleFinalizeLawsuitDurabilityAfterCommit(
                result.active.map((f) => f.id),
                { timeoutMs: 4_000 },
            );
        }
    }, []);

    useEffect(() => {
        if (prevAutoSaveRef.current && !localAutoSave) {
            const cur = segmentsRef.current;
            if (cur.active.length === 0) {
                prevAutoSaveRef.current = localAutoSave;
                return;
            }
            if (!shouldBlockEmptyLawsuitPersist(cur)) {
                const result = persistLawsuitActiveBundle({
                    active: cur.active,
                    index: cur.index,
                    archived: cur.archived,
                    trash: cur.trash,
                });
                if (result.ok) {
                    scheduleFinalizeLawsuitDurabilityAfterCommit(
                        result.active.map((f) => f.id),
                        { timeoutMs: 4_000 },
                    );
                }
            }
        }
        prevAutoSaveRef.current = localAutoSave;
    }, [localAutoSave]);

    const files = segments.active;

    const adoptBootFromStorage = useCallback(() => {
        const nextBoot = applyLawsuitDurabilityOverlaysToSegments(loadLawsuitBootSegments());
        setSegments((prev) => pickRicherSegments(prev, nextBoot));
        const adopted = pickRicherSegments(segmentsRef.current, nextBoot);
        const stillCold =
            !bootHasLawsuitRecords(adopted) && lawsuitStorageMayHaveUnreadData(adopted.index);
        if (!stillCold) {
            setLawsuitStorageHydrated(true);
            if (bootHasLawsuitRecords(adopted) || adopted.active.length > 0) {
                setLawsuitDecryptBlocked(false);
            }
        }
        return nextBoot;
    }, []);

    useEffect(() => {
        if (!backgroundRuntimeEnabled) return;

        const gen = ++hydrateGenRef.current;
        const visibleNow = bootHasLawsuitRecords(segmentsRef.current);
        const mayHaveColdData =
            !visibleNow && lawsuitStorageMayHaveUnreadData(segmentsRef.current.index);

        if (mayHaveColdData) {
            setLawsuitStorageHydrated(false);
        }

        void runLawsuitFilesHydrateCycle({
            isStale: () => hydrateGenRef.current !== gen,
            adoptBootFromStorage,
            setSegments,
            setLawsuitStorageHydrated,
        });
    }, [backgroundRuntimeEnabled, adoptBootFromStorage]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onWarmed = () => {
            adoptBootFromStorage();
            void flushLawsuitDurabilityOverlaysToActive()
                .then((n) => {
                    if (n > 0) adoptBootFromStorage();
                })
                .catch(() => undefined);
        };
        window.addEventListener(LAWSUITS_STORAGE_WARMED_EVENT, onWarmed);
        return () => window.removeEventListener(LAWSUITS_STORAGE_WARMED_EVENT, onWarmed);
    }, [adoptBootFromStorage]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const flushOnHide = () => {
            const cur = segmentsRef.current;
            for (const row of cur.active) {
                if (wasLawsuitStagedThisPage(row.id)) {
                    stagePendingLawsuitCreate(row);
                }
            }
            void flushLawsuitDurabilityOverlaysToActive().catch(() => undefined);
            /*
             * لا تدفع مقطعاً نشطاً فارغاً عند إخفاء التبويب —
             * هذا كان يثبّت واجهة فارغة كاذبة على القرص.
             */
            if (cur.active.length === 0) return;
            if (shouldBlockEmptyLawsuitPersist(cur)) return;
            if (!lawsuitStorageHydratedRef.current) return;
            persistLawsuitActiveBundle({
                active: cur.active,
                index: cur.index,
                archived: cur.archived,
                trash: cur.trash,
            });
            void awaitLawsuitWorkspaceCommit({ timeoutMs: 4_000 })
                .then((commit) =>
                    finalizeLawsuitDurabilityAfterCommit(
                        commit,
                        cur.active.map((f) => f.id),
                    ),
                )
                .catch(() => undefined);
        };
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') flushOnHide();
        };
        window.addEventListener('pagehide', flushOnHide);
        window.addEventListener('beforeunload', flushOnHide);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('pagehide', flushOnHide);
            window.removeEventListener('beforeunload', flushOnHide);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    const setFiles = useCallback(
        (action: React.SetStateAction<FileData[]>) => {
            setSegments((prev) => {
                const nextActive =
                    typeof action === 'function' ? action(prev.active) : action;
                /*
                 * حماية ذرية: لا تعتمد setFiles([]) القادم من أثر جانبي قبل اكتمال التحميل
                 * أو أثناء مفاتيح باردة — كان مسار المسح الأكثر شيوعاً.
                 */
                if (
                    nextActive.length === 0 &&
                    prev.active.length > 0
                ) {
                    /*
                     * المسح الكامل للنشط لا يمر عبر setFiles —
                     * الأرشفة/السلة فقط (allowShrink). منع المسح الذاتي.
                     */
                    return prev;
                }
                if (nextActive.length > 0 && prev.active.length > nextActive.length) {
                    /*
                     * setFiles لا يُقلّص القائمة أبداً — أي إضبارة تختفي من هنا
                     * تُعاد بالدمج. النقل للأرشيف/السلة عبر setLawsuitSegments فقط.
                     */
                    const ids = new Set(nextActive.map((f) => String(f.id)));
                    const merged = [
                        ...nextActive,
                        ...prev.active.filter((f) => !ids.has(String(f.id))),
                    ];
                    const nextIndex = rebuildActiveSegmentInIndex(prev.index, merged);
                    const next = { ...prev, active: merged, index: nextIndex };
                    persistWorkspace(next);
                    return next;
                }
                const nextIndex = rebuildActiveSegmentInIndex(prev.index, nextActive);
                const next = { ...prev, active: nextActive, index: nextIndex };
                persistWorkspace(next);
                return next;
            });
        },
        [persistWorkspace],
    );

    const setLawsuitSegments = useCallback(
        (action: React.SetStateAction<LawsuitFileSegments>) => {
            setSegments((prev) => {
                const next = typeof action === 'function' ? action(prev) : action;
                if (next.active.length === 0 && prev.active.length > 0) {
                    const prevTrash = prev.trash?.length ?? 0;
                    const nextTrash = next.trash?.length ?? 0;
                    const prevArch = prev.archived?.length ?? 0;
                    const nextArch = next.archived?.length ?? 0;
                    const movedToTrash =
                        next.trash != null &&
                        (nextTrash > prevTrash || next.index.counts.trash > prev.index.counts.trash);
                    const movedToArchive =
                        next.archived != null &&
                        (nextArch > prevArch ||
                            next.index.counts.archived > prev.index.counts.archived);
                    /*
                     * مسح النشط مسموح فقط عند انتقال صريح للأرشيف/السلة.
                     * غير ذلك = واجهة فارغة كاذبة مع بقاء القرص.
                     */
                    if (!movedToTrash && !movedToArchive) {
                        return prev;
                    }
                }
                /*
                 * apply* يكتب القرص بنفسه؛ إن وُضع updater خام بدون persist
                 * كانت React تتقدّم والقرص يتخلف. ثبّت عند autosave.
                 */
                persistWorkspace(next);
                return next;
            });
        },
        [persistWorkspace],
    );

    const ensureLawsuitArchivedLoaded = useCallback(async () => {
        if (segments.archived !== null) return;
        if (SecureStoreService.isUnreadSync(LAWSUIT_FILES_ARCHIVED_KEY)) {
            await SecureStoreService.warmKeys([LAWSUIT_FILES_ARCHIVED_KEY]);
        }
        const archived = loadLawsuitArchivedSegmentFiles();
        setSegments((prev) => {
            if (prev.archived !== null) return prev;
            const nextIndex = enrichLifecycleIndexFromSegmentFiles(prev.index, archived, null);
            persistLawsuitLifecycleMirrorBundle({
                active: prev.active,
                index: nextIndex,
                archived,
                trash: prev.trash,
            });
            return { ...prev, archived, index: nextIndex };
        });
    }, [segments.archived]);

    const ensureLawsuitTrashLoaded = useCallback(async () => {
        if (segments.trash !== null) return;
        if (SecureStoreService.isUnreadSync(LAWSUIT_FILES_TRASH_KEY)) {
            await SecureStoreService.warmKeys([LAWSUIT_FILES_TRASH_KEY]);
        }
        const trash = loadLawsuitTrashSegmentFiles();
        setSegments((prev) => {
            if (prev.trash !== null) return prev;
            const nextIndex = enrichLifecycleIndexFromSegmentFiles(prev.index, null, trash);
            persistLawsuitLifecycleMirrorBundle({
                active: prev.active,
                index: nextIndex,
                archived: prev.archived,
                trash,
            });
            return { ...prev, trash, index: nextIndex };
        });
    }, [segments.trash]);

    const reloadLawsuitFiles = useCallback(() => {
        const merged = reloadLawsuitFilesFromStorage();
        setSegments((prev) => pickRicherSegments(prev, merged));
        return segmentsRef.current.active;
    }, []);

    return {
        files,
        setFiles,
        lawsuitSegments: segments,
        setLawsuitSegments,
        lawsuitLifecycleCounts: segments.index.counts,
        lawsuitArchivedFiles: segments.archived,
        lawsuitTrashFiles: segments.trash,
        ensureLawsuitArchivedLoaded,
        ensureLawsuitTrashLoaded,
        reloadLawsuitFiles,
        lawsuitStorageHydrated,
    };
}
