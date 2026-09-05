import type { Dispatch, SetStateAction } from 'react';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import {
    applyIndependentChallengeSpawn,
    allocateLawsuitFileId,
    type IndependentChallengeSpawnInput,
} from '@/app/domain/lawsuit/independentChallengeDossier';
import { persistLawsuitFiles } from '@/app/domain/lawsuit/lawsuitFilesRepository';
import { findLawsuitFileById } from '@/app/hooks/caseLinkingRuntime';
import { saveCaseDeferred } from '@/app/hooks/lawsuitPersistDeferred';
import { commitLawsuitPersistOrWarn } from '@/app/hooks/lawsuitCommitWarn';
import {
    listPendingLawsuitCreates,
    stagePendingLawsuitCreate,
} from '@/app/domain/lawsuit/lawsuitPendingCreateStore';
import { openLawsuitDossierWithContract } from '@/app/runtime/lawsuitOpenContract';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { dismissTransientOverlays, reconcileBodyScrollLock } from '@/app/utils/bodyScrollLock';

type ActiveFile = FileData | ExecutionFile | null;

function isFileData(value: unknown): value is FileData {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const v = value as Record<string, unknown>;
    return (
        (typeof v.id === 'number' || typeof v.id === 'string') &&
        (typeof v.caseNo === 'string' || typeof v.docType === 'string')
    );
}

function lawsuitIdsMatch(left: unknown, right: unknown): boolean {
    if (left == null || right == null || left === '' || right === '') return false;
    if (String(left) === String(right)) return true;
    const nLeft = Number(left);
    const nRight = Number(right);
    return Number.isFinite(nLeft) && Number.isFinite(nRight) && nLeft === nRight;
}

function findInPool(pool: FileData[], id: unknown): FileData | null {
    return pool.find((file) => lawsuitIdsMatch(file.id, id)) ?? null;
}

function resolveIndependentSpawnSource(args: {
    input: IndependentChallengeSpawnInput;
    files: FileData[];
    activeFile: ActiveFile;
}): FileData | null {
    const snapshot = args.input.sourceFile && isFileData(args.input.sourceFile) ? args.input.sourceFile : null;
    const lookupId = snapshot?.id ?? args.input.sourceFileId;
    const pending = (() => {
        try {
            return listPendingLawsuitCreates();
        } catch {
            return [] as FileData[];
        }
    })();
    const active = isFileData(args.activeFile) ? [args.activeFile] : [];
    return (
        findInPool(args.files, lookupId)
        ?? findLawsuitFileById(args.files, Number(args.input.sourceFileId))
        ?? findInPool(active, lookupId)
        ?? findInPool(pending, lookupId)
        ?? snapshot
        ?? null
    );
}

export async function persistIndependentChallengeSpawn(args: {
    input: IndependentChallengeSpawnInput;
    files: FileData[];
    activeFile: ActiveFile;
    setFiles: Dispatch<SetStateAction<FileData[]>>;
    setActiveFile: Dispatch<SetStateAction<ActiveFile>>;
    userId?: string | null;
}): Promise<void> {
    const { input, files, activeFile, setFiles, setActiveFile, userId } = args;
    const source = resolveIndependentSpawnSource({ input, files, activeFile });
    if (!source) {
        SmartToast.error('تعذّر تحديد الإضبارة الأصلية لإنشاء الطعن المستقل');
        return;
    }

    const spawnCaseNo = String(input.newCaseNumber ?? '').trim();
    const spawnCourt = String(input.newCourt ?? '').trim();
    if (!spawnCourt || !spawnCaseNo) {
        SmartToast.error('أدخل اسم محكمة الاستئناف ورقم دعوى الاستئناف قبل إنشاء الإضبارة المستقلة');
        return;
    }

    const createdId = allocateLawsuitFileId([source, ...files]);
    let spawned: { sourceFile: FileData; createdFile: FileData };
    try {
        spawned = applyIndependentChallengeSpawn({
            sourceFile: {
                ...source,
                stages: input.sourceStages.length > 0 ? input.sourceStages : source.stages,
                activeStageIndex: input.sourceStageIndex,
            },
            sourceStageIndex: input.sourceStageIndex,
            createdId,
            appealStage: input.appealStage,
            appealType: input.appealType,
            filingDate: input.filingDate,
            newCaseNumber: input.newCaseNumber,
            newCourt: input.newCourt,
        });
    } catch {
        SmartToast.error('تعذّر برمجة إضبارة الطعن المستقل');
        return;
    }

    stagePendingLawsuitCreate(spawned.createdFile);
    setFiles((prev) => {
        const sourceId = String(spawned.sourceFile.id);
        const createdIdKey = String(spawned.createdFile.id);
        const existing = prev.find((file) => String(file.id) === sourceId);
        const sourcePatched = existing
            ? {
                  ...existing,
                  stages: spawned.sourceFile.stages,
                  activeStageIndex: spawned.sourceFile.activeStageIndex,
                  caseLinks: spawned.sourceFile.caseLinks,
              }
            : spawned.sourceFile;
        const without = prev.filter(
            (file) => String(file.id) !== sourceId && String(file.id) !== createdIdKey,
        );
        return persistLawsuitFiles([spawned.createdFile, sourcePatched, ...without]);
    });

    if (userId) {
        saveCaseDeferred(userId, spawned.sourceFile as unknown as Record<string, unknown>);
        saveCaseDeferred(userId, spawned.createdFile as unknown as Record<string, unknown>);
    }

    const ok = await commitLawsuitPersistOrWarn(
        'إنشاء طعن مستقل',
        [spawned.sourceFile.id, spawned.createdFile.id],
        { requireActiveFileId: spawned.createdFile.id },
    );
    dismissTransientOverlays();
    reconcileBodyScrollLock();
    openLawsuitDossierWithContract(() => {
        setActiveFile(spawned.createdFile);
    });
    if (ok) {
        SmartToast.success(
            `أُنشئت إضبارة ${input.appealType} مستقلة برقم ${spawned.createdFile.caseNo} — رول الاستئناف المستخرج لم يُغيَّر`,
        );
    }
}
