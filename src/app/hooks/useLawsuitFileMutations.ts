import { useCallback } from 'react';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { findLawsuitFileInSegments } from '@/app/domain/lawsuit/lawsuitFilesRepository';
import type { LawsuitFileSegments } from '@/app/domain/lawsuit/lawsuitFileSegments';
import type { LawsuitLifecycleMutationKind } from '@/app/domain/lawsuit/lawsuitLifecycleTransaction';
import {
    pruneOrphanedBridgeEvents,
    removeAllBridgedEventsForEntity,
    syncLawsuitFileToCalendar,
} from '@/app/services/calendar/dossierSyncLazy';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import { SupabaseService } from '@/app/services/SupabaseService';
import { isLiveCloudSyncBucketEnabled } from '@/app/services/settings/cloudSyncBucket';
import { scheduleRevokeLawsuitCaseShares } from '@/app/services/caseShare/caseShareDossierRevocation';
import { SmartToast } from '@/app/components/ui/SmartToast';

type ActiveFile = FileData | ExecutionFile | null;

type UseLawsuitFileMutationsOptions = {
    commitLawsuitLifecycleMutation: (
        kind: LawsuitLifecycleMutationKind,
        ids: readonly (string | number)[],
    ) => Promise<LawsuitFileSegments | null>;
    setActiveFile: React.Dispatch<React.SetStateAction<ActiveFile>>;
    userId?: string | null;
    authUserId?: string | null;
    refreshAppAlerts: () => void | Promise<void>;
    unpinWorkspaceForDeletedFile: (file: FileData) => void;
};

export function useLawsuitFileMutations({
    commitLawsuitLifecycleMutation,
    setActiveFile,
    userId,
    authUserId,
    refreshAppAlerts,
    unpinWorkspaceForDeletedFile,
}: UseLawsuitFileMutationsOptions) {
    const calendarUid = resolveCalendarUserId(userId ?? authUserId ?? null);

    const moveLawsuitToTrash = useCallback(
        async (fileId: string | number): Promise<boolean> => {
            const idStr = String(fileId);
            const next = await commitLawsuitLifecycleMutation('trash', [fileId]);
            if (!next || next.active.some((file) => String(file.id) === idStr)) {
                SmartToast.error('تعذّر تثبيت النقل إلى المهملات على القرص');
                return false;
            }
            setActiveFile((cur) => (cur && String(cur.id) === idStr ? null : cur));
            void removeAllBridgedEventsForEntity('lawsuit', fileId, calendarUid);
            void pruneOrphanedBridgeEvents(calendarUid);
            void refreshAppAlerts();
            return true;
        },
        [calendarUid, commitLawsuitLifecycleMutation, refreshAppAlerts, setActiveFile],
    );

    const restoreLawsuitFromTrash = useCallback(
        async (fileId: string | number): Promise<boolean> => {
            const next = await commitLawsuitLifecycleMutation('restore-trash', [fileId]);
            const restored = next ? findLawsuitFileInSegments(next, fileId) : undefined;
            if (!restored || !next?.active.some((file) => String(file.id) === String(fileId))) {
                SmartToast.error('تعذّر تثبيت الاستعادة من المهملات على القرص');
                return false;
            }
            syncLawsuitFileToCalendar(restored as unknown as Record<string, unknown>, userId);
            return true;
        },
        [commitLawsuitLifecycleMutation, userId],
    );

    const archiveLawsuit = useCallback(
        async (fileId: string | number): Promise<boolean> => {
            const idStr = String(fileId);
            const next = await commitLawsuitLifecycleMutation('archive', [fileId]);
            if (!next || next.active.some((file) => String(file.id) === idStr)) {
                SmartToast.error('تعذّر تثبيت الأرشفة على القرص');
                return false;
            }
            setActiveFile((cur) => (cur && String(cur.id) === idStr ? null : cur));
            void removeAllBridgedEventsForEntity('lawsuit', fileId, calendarUid);
            void pruneOrphanedBridgeEvents(calendarUid);
            void refreshAppAlerts();
            return true;
        },
        [calendarUid, commitLawsuitLifecycleMutation, refreshAppAlerts, setActiveFile],
    );

    const restoreArchivedLawsuit = useCallback(
        async (fileId: string | number): Promise<boolean> => {
            const next = await commitLawsuitLifecycleMutation('restore-archive', [fileId]);
            const restored = next ? findLawsuitFileInSegments(next, fileId) : undefined;
            if (!restored || !next?.active.some((file) => String(file.id) === String(fileId))) {
                SmartToast.error('تعذّر تثبيت الاستعادة من الأرشيف على القرص');
                return false;
            }
            syncLawsuitFileToCalendar(restored as unknown as Record<string, unknown>, userId);
            return true;
        },
        [commitLawsuitLifecycleMutation, userId],
    );

    const permanentlyDeleteLawsuits = useCallback(
        async (ids: Array<string | number>): Promise<boolean> => {
            const idSet = new Set(ids.map(String));
            const next = await commitLawsuitLifecycleMutation('permanent-delete', ids);
            if (!next) {
                SmartToast.error('تعذّر تثبيت الحذف النهائي — بقيت الإضبارة في السلة');
                return false;
            }
            for (const segment of [next.active, next.archived ?? [], next.trash ?? []]) {
                if (segment.some((file) => idSet.has(String(file.id)))) {
                    SmartToast.error('فشل تحقق الحذف النهائي على القرص');
                    return false;
                }
            }
            idSet.forEach((id) => {
                void removeAllBridgedEventsForEntity('lawsuit', id, calendarUid);
                if (calendarUid) {
                    scheduleRevokeLawsuitCaseShares(calendarUid, id);
                }
                if (isLiveCloudSyncBucketEnabled('files')) {
                    void SupabaseService.deleteLawsuitFile(id).catch(() => undefined);
                }
            });
            setActiveFile((cur) => (cur && idSet.has(String(cur.id)) ? null : cur));
            void pruneOrphanedBridgeEvents(calendarUid);
            return true;
        },
        [calendarUid, commitLawsuitLifecycleMutation, setActiveFile],
    );

    const handleDeleteFile = useCallback(
        (fileToDelete: FileData) => {
            const isHardDelete = fileToDelete.status === 'deleted';
            if (isHardDelete) {
                void permanentlyDeleteLawsuits([fileToDelete.id]).then((ok) => {
                    if (!ok) return;
                    unpinWorkspaceForDeletedFile(fileToDelete);
                    void refreshAppAlerts();
                });
                return;
            }
            void moveLawsuitToTrash(fileToDelete.id).then((ok) => {
                if (!ok) return;
                unpinWorkspaceForDeletedFile(fileToDelete);
                void refreshAppAlerts();
            });
        },
        [
            moveLawsuitToTrash,
            permanentlyDeleteLawsuits,
            refreshAppAlerts,
            unpinWorkspaceForDeletedFile,
        ],
    );

    const handleRestoreFile = useCallback(
        (fileToRestore: FileData) => {
            void restoreLawsuitFromTrash(fileToRestore.id).then((ok) => {
                if (!ok) return;
                setActiveFile({ ...fileToRestore, status: 'active', deletedAt: undefined });
                void refreshAppAlerts();
            });
        },
        [refreshAppAlerts, restoreLawsuitFromTrash, setActiveFile],
    );

    return {
        moveLawsuitToTrash,
        restoreLawsuitFromTrash,
        archiveLawsuit,
        restoreArchivedLawsuit,
        permanentlyDeleteLawsuits,
        handleDeleteFile,
        handleRestoreFile,
    };
}
