import type { Dispatch, SetStateAction } from 'react';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import {
    applyLawsuitConsolidationSegments,
    persistLawsuitFiles,
    type LawsuitFileSegments,
} from '@/app/domain/lawsuit/lawsuitFilesRepository';
import { findLawsuitFileById, loadCaseLinkingRuntime } from '@/app/hooks/caseLinkingRuntime';
import {
    saveCaseDeferred,
    syncLawsuitFileToCalendarDeferred,
} from '@/app/hooks/lawsuitPersistDeferred';
import { commitLawsuitPersistOrWarn } from '@/app/hooks/lawsuitCommitWarn';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { dismissTransientOverlays, reconcileBodyScrollLock } from '@/app/utils/bodyScrollLock';

type ActiveFile = FileData | ExecutionFile | null;

export async function consolidateLawsuitWithExisting(args: {
    primaryFileId: number;
    secondaryFileId: number;
    meta: { consolidationDate: string; notes?: string };
    files: FileData[];
    setLawsuitSegments: Dispatch<SetStateAction<LawsuitFileSegments>>;
    setActiveFile: Dispatch<SetStateAction<ActiveFile>>;
    persistConsolidatedFiles: (mergedPrimary: FileData, archivedSecondary: FileData) => void;
}): Promise<void> {
    const {
        primaryFileId,
        secondaryFileId,
        meta,
        files,
        setLawsuitSegments,
        setActiveFile,
        persistConsolidatedFiles,
    } = args;
    const { assertDistinctConsolidationPair, mergeLawsuitFilesForConsolidation } =
        await loadCaseLinkingRuntime();
    const pair = assertDistinctConsolidationPair(primaryFileId, secondaryFileId);
    if (!pair) {
        SmartToast.error('لا يمكن توحيد الإضبارة مع نفسها');
        return;
    }
    const primary = findLawsuitFileById(files, pair.primary);
    const secondary = findLawsuitFileById(files, pair.secondary);
    if (!primary || !secondary) {
        SmartToast.error('تعذّر العثور على إحدى الإضابير للتوحيد');
        return;
    }
    const mergeResult = mergeLawsuitFilesForConsolidation(primary, secondary, meta);
    if ('error' in mergeResult) {
        SmartToast.error(mergeResult.error);
        return;
    }
    const { mergedPrimary, archivedSecondary } = mergeResult;
    setLawsuitSegments((prev) =>
        applyLawsuitConsolidationSegments(prev, mergedPrimary, archivedSecondary),
    );
    persistConsolidatedFiles(mergedPrimary, archivedSecondary);

    const ok = await commitLawsuitPersistOrWarn('التوحيد', [mergedPrimary.id, archivedSecondary.id], {
        requireActiveFileId: mergedPrimary.id,
    });
    if (!ok) {
        dismissTransientOverlays();
        reconcileBodyScrollLock();
        setActiveFile(mergedPrimary);
        return;
    }

    dismissTransientOverlays();
    reconcileBodyScrollLock();
    setActiveFile(mergedPrimary);
    SmartToast.success(`تم توحيد الدعويين — الإضبارة الموحّدة (${mergedPrimary.caseNo}) جاهزة`);
}

export async function linkLawsuitWithExistingCase(args: {
    primaryFileId: number;
    peer: {
        dossierKind: 'lawsuit' | 'criminal';
        lawsuitFileId?: number;
        criminalId?: string;
        caseNo: string;
    };
    meta: { linkDate: string; reason?: string };
    files: FileData[];
    activeFile: ActiveFile;
    setFiles: Dispatch<SetStateAction<FileData[]>>;
    setActiveFile: Dispatch<SetStateAction<ActiveFile>>;
    userId?: string | null;
}): Promise<void> {
    const { primaryFileId, peer, meta, files, activeFile, setFiles, setActiveFile, userId } = args;
    const { rejectCaseLinkPair, linkExistingLawsuitFiles, linkCriminalPeerToOrigin } =
        await loadCaseLinkingRuntime();
    const primary = findLawsuitFileById(files, primaryFileId);
    if (!primary) {
        SmartToast.error('تعذّر العثور على الإضبارة الأصلية للربط');
        return;
    }

    let updatedPrimary: FileData;
    if (peer.dossierKind === 'criminal') {
        const rejection = rejectCaseLinkPair(primary);
        if (rejection) {
            SmartToast.error(rejection);
            return;
        }
        const criminalId = String(peer.criminalId ?? '').trim();
        if (!criminalId) {
            SmartToast.error('تعذّر تحديد الإضبارة الجزائية');
            return;
        }
        ({ updatedPrimary } = linkCriminalPeerToOrigin(
            primary,
            { criminalId, caseNo: peer.caseNo },
            meta,
        ));
    } else {
        const secondaryId = peer.lawsuitFileId;
        if (secondaryId == null || Number(primaryFileId) === Number(secondaryId)) {
            SmartToast.error('لا يمكن ربط الإضبارة مع نفسها');
            return;
        }
        const secondary = findLawsuitFileById(files, secondaryId);
        if (!secondary) {
            SmartToast.error('تعذّر العثور على الإضبارة المربوطة');
            return;
        }
        const rejection = rejectCaseLinkPair(primary, secondary);
        if (rejection) {
            SmartToast.error(rejection);
            return;
        }
        ({ updatedPrimary } = linkExistingLawsuitFiles(primary, secondary, meta));
    }

    setFiles((prev) => {
        const next = prev.map((f) => {
            const id = String(f.id);
            if (id === String(primaryFileId)) return updatedPrimary;
            return f;
        });
        return persistLawsuitFiles(next);
    });
    if (userId) {
        saveCaseDeferred(userId, updatedPrimary as unknown as Record<string, unknown>);
    }
    syncLawsuitFileToCalendarDeferred(updatedPrimary as unknown as Record<string, unknown>, userId);

    const ok = await commitLawsuitPersistOrWarn('الربط', [updatedPrimary.id], {
        requireActiveFileId: updatedPrimary.id,
    });
    if (!ok) {
        const activeId = activeFile?.id != null ? String(activeFile.id) : '';
        setActiveFile(activeId === String(primaryFileId) ? updatedPrimary : activeFile);
        return;
    }

    const activeId = activeFile?.id != null ? String(activeFile.id) : '';
    setActiveFile(activeId === String(primaryFileId) ? updatedPrimary : activeFile);
    SmartToast.success('تم ربط الإضبارة بنجاح — نسخة للاطلاع فقط');
}
