import type { Dispatch, SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { buildFileDataFromNewCaseSave } from '@/app/domain/lawsuit/lawsuitFileFactory';
import {
    applyLawsuitConsolidationSegments,
    loadLawsuitBootSegments,
    persistLawsuitFiles,
    type LawsuitFileSegments,
} from '@/app/domain/lawsuit/lawsuitFilesRepository';
import type { ConsolidationSpawnContext } from '@/app/components/lawyer/smart-modal/smartFile/caseConsolidationLinking';
import { normalizeFileId } from '@/app/components/lawyer/smart-modal/smartFile/incidentalCaseLinking';
import type { IncidentalSpawnContextEnriched } from '@/app/domain/lawsuit/incidentalSpawnPrefill';
import { findLawsuitFileById, loadCaseLinkingRuntime } from '@/app/hooks/caseLinkingRuntime';
import {
    saveCaseDeferred,
    syncLawsuitFileToCalendarDeferred,
} from '@/app/hooks/lawsuitPersistDeferred';
import { flushLawsuitWorkspacePersist, awaitLawsuitWorkspaceCommit } from '@/app/domain/lawsuit/lawsuitPersistFlush';
import SecureStoreService from '@/app/services/SecureStoreService';
import { LAWSUIT_FILES_ACTIVE_KEY } from '@/app/domain/dossier/dossierStorageKeys';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { dismissTransientOverlays, reconcileBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import {
    finalizeLawsuitDurabilityAfterCommit,
    flushLawsuitDurabilityOverlaysToActive,
    mergeLawsuitDurabilityOverlaysInto,
} from '@/app/domain/lawsuit/lawsuitDurabilityOverlay';
import { stagePendingLawsuitCreate } from '@/app/domain/lawsuit/lawsuitPendingCreateStore';
import { mergeRicherLawsuitActive } from '@/app/domain/lawsuit/lawsuitActiveDurability';

let lawsuitNewCaseSaveOpenCounter = 0;
let lastActiveNewCaseSaveId = 0;
const lawsuitNewCaseSaveSessionIdRef = { current: 0 };
const activeLawsuitNewCaseSaveSessionIdRef = { current: 0 };

type ActiveFile = FileData | ExecutionFile | null;

/** أغنى قائمة: React ∪ boot ∪ معلّقات إنشاء */
function resolveRichestActiveFiles(reactFiles: FileData[]): FileData[] {
    const bootActive = loadLawsuitBootSegments().active;
    const withBoot =
        bootActive.length > reactFiles.length
            ? mergeRicherLawsuitActive(reactFiles, bootActive)
            : reactFiles.length > bootActive.length
              ? mergeRicherLawsuitActive(bootActive, reactFiles)
              : mergeRicherLawsuitActive(reactFiles, bootActive);
    return mergeLawsuitDurabilityOverlaysInto(withBoot);
}

/**
 * تثبيت متزامن فوري — بلا انتظار Crypto/IDB.
 * المعلّق يبقى حتى يثبت القرص في الخلفية (لا تمسحه الذاكرة).
 */
function commitCreateToMemorySync(nextActive: FileData[], created: FileData): FileData[] {
    stagePendingLawsuitCreate(created);
    const richest = mergeLawsuitDurabilityOverlaysInto(nextActive);

    if (SecureStoreService.isUnreadSync(LAWSUIT_FILES_ACTIVE_KEY)) {
        return richest;
    }

    try {
        const saved = persistLawsuitFiles(richest);
        try {
            SecureStoreService.flushHeavyPersistPending();
        } catch {
            /* ignore */
        }
        return mergeLawsuitDurabilityOverlaysInto(saved);
    } catch {
        return richest;
    }
}

function markLawsuitNewCaseSaveSessionBoot(): void {
    lawsuitNewCaseSaveOpenCounter += 1;
    lastActiveNewCaseSaveId = lawsuitNewCaseSaveOpenCounter;
    lawsuitNewCaseSaveSessionIdRef.current = lawsuitNewCaseSaveOpenCounter;
    activeLawsuitNewCaseSaveSessionIdRef.current = lawsuitNewCaseSaveOpenCounter;
}


/** خلفية فقط — تسخين محدود ثم دمج المعلّق وتثبيت القرص */
function scheduleCreatedFileDiskCommit(fileId: string | number): void {
    markLawsuitNewCaseSaveSessionBoot();
    void (async () => {
        if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) return;
        try {
            await Promise.race([
                SecureStoreService.ensureLawsuitKeysReady(),
                new Promise<void>((resolve) => {
                    setTimeout(() => {
                        if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) return;
                        resolve();
                    }, 2_500);
                }),
            ]);
        } catch {
            /* ignore */
        }
        if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) return;

        try {
            await flushLawsuitDurabilityOverlaysToActive();
        } catch {
            /* ignore */
        }
        if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) return;

        const commit = await awaitLawsuitWorkspaceCommit({
            timeoutMs: 8_000,
            requireActiveFileId: fileId,
        });
        if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) return;
        const finalized = await finalizeLawsuitDurabilityAfterCommit(commit, [fileId]);
        if (finalized > 0) return;
        if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) return;

        SmartToast.warning('الإضبارة مفتوحة — التثبيت على القرص قيد الإكمال، لا تغلق الصفحة');
        if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) return;
        void flushLawsuitWorkspacePersist(8_000);
    })();
}

function openCreatedDossier(args: {
    file: FileData;
    setIsNewCaseModalOpen: Dispatch<SetStateAction<boolean>>;
    setSubFileBase: Dispatch<SetStateAction<FileData | null>>;
    setIncidentalSpawnContext: Dispatch<SetStateAction<IncidentalSpawnContextEnriched | null>>;
    setActiveFile: Dispatch<SetStateAction<ActiveFile>>;
    resetSpawnContexts?: () => void;
    successMessage: string;
}): void {
    SmartToast.success(args.successMessage);
    flushSync(() => {
        args.setIsNewCaseModalOpen(false);
        if (args.resetSpawnContexts) {
            args.resetSpawnContexts();
        } else {
            args.setSubFileBase(null);
            args.setIncidentalSpawnContext(null);
        }
        args.setActiveFile(args.file);
    });
    dismissTransientOverlays();
    reconcileBodyScrollLock();
}

export type LawsuitNewCaseSaveArgs = {
    data: unknown;
    files: FileData[];
    subFileBase: FileData | null;
    incidentalSpawnContext: IncidentalSpawnContextEnriched | null;
    consolidationSpawnContext: ConsolidationSpawnContext | null;
    userId?: string | null;
    setFiles: Dispatch<SetStateAction<FileData[]>>;
    setLawsuitSegments: Dispatch<SetStateAction<LawsuitFileSegments>>;
    setActiveFile: Dispatch<SetStateAction<ActiveFile>>;
    setIsNewCaseModalOpen: Dispatch<SetStateAction<boolean>>;
    setSubFileBase: Dispatch<SetStateAction<FileData | null>>;
    setIncidentalSpawnContext: Dispatch<SetStateAction<IncidentalSpawnContextEnriched | null>>;
    persistConsolidatedFiles: (mergedPrimary: FileData, archivedSecondary: FileData) => void;
    resetSpawnContexts: () => void;
};

/**
 * إنشاء دعوى — المسار الحرج متزامن بالكامل (لا await على Crypto/تسخين).
 * أي انتظار سابق هنا كان يعلّق زر «حفظ» على «جارٍ الحفظ…» إلى ما لا نهاية.
 */
export async function performLawsuitNewCaseSave(args: LawsuitNewCaseSaveArgs): Promise<boolean> {
    markLawsuitNewCaseSaveSessionBoot();
    const {
        data,
        files,
        subFileBase,
        incidentalSpawnContext,
        consolidationSpawnContext,
        userId,
        setFiles,
        setLawsuitSegments,
        setActiveFile,
        setIsNewCaseModalOpen,
        setSubFileBase,
        setIncidentalSpawnContext,
        persistConsolidatedFiles,
        resetSpawnContexts,
    } = args;

    try {
        if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) return false;
        const newFile = buildFileDataFromNewCaseSave(data);
        if (!newFile) {
            SmartToast.error('تعذّر إنشاء الملف — تحقق من البيانات المدخلة');
            return false;
        }

        let created: FileData = subFileBase ? { ...newFile, parentId: subFileBase.id } : newFile;
        const richestFiles = resolveRichestActiveFiles(files);

        const spawnMeta =
            data &&
            typeof data === 'object' &&
            'incidentalSpawnMeta' in data &&
            data.incidentalSpawnMeta &&
            typeof data.incidentalSpawnMeta === 'object'
                ? (data.incidentalSpawnMeta as {
                      filingPartyId?: string;
                      filingPartyName?: string;
                      opposingPartyId?: string;
                      opposingPartyName?: string;
                  })
                : undefined;
        const incidentalPartyLabel = [spawnMeta?.filingPartyName, spawnMeta?.opposingPartyName]
            .filter((name) => Boolean(String(name ?? '').trim()))
            .join(' ضد ');

        if (incidentalSpawnContext) {
            created = {
                ...created,
                parentId: incidentalSpawnContext.parentFileId,
                incidentalLink: {
                    parentFileId: incidentalSpawnContext.parentFileId,
                    parentCaseNo: incidentalSpawnContext.parentCaseNo,
                    incidentalId: incidentalSpawnContext.incidentalId,
                    type: incidentalSpawnContext.type,
                    filingPartyId: spawnMeta?.filingPartyId,
                    filingPartyName: spawnMeta?.filingPartyName,
                    opposingPartyId: spawnMeta?.opposingPartyId,
                    opposingPartyName: spawnMeta?.opposingPartyName,
                },
            };
        }

        if (consolidationSpawnContext) {
            if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) return false;
            const ctx = consolidationSpawnContext;
            const primary =
                findLawsuitFileById(richestFiles, ctx.primaryFileId) || subFileBase;
            if (!primary) {
                SmartToast.error('تعذّر تحديد الإضبارة الأولى للتوحيد');
                return false;
            }
            const { alignSecondaryFileLitigationStage, mergeLawsuitFilesForConsolidation } =
                await loadCaseLinkingRuntime();
            if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) return false;
            const alignedCreated = alignSecondaryFileLitigationStage(created, primary);
            const mergeResult = mergeLawsuitFilesForConsolidation(primary, alignedCreated, {
                consolidationDate: ctx.consolidationDate,
                notes: ctx.notes,
            });
            if ('error' in mergeResult) {
                SmartToast.error(mergeResult.error);
                return false;
            }
            if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) return false;
            const { mergedPrimary, archivedSecondary } = mergeResult;
            setLawsuitSegments((prev) =>
                applyLawsuitConsolidationSegments(prev, mergedPrimary, archivedSecondary),
            );
            if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) return false;
            persistConsolidatedFiles(mergedPrimary, archivedSecondary);
            stagePendingLawsuitCreate(mergedPrimary);
            if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) return false;
            openCreatedDossier({
                file: mergedPrimary,
                setIsNewCaseModalOpen,
                setSubFileBase,
                setIncidentalSpawnContext,
                setActiveFile,
                resetSpawnContexts,
                successMessage: 'تم توحيد الدعويين — الإضبارة الموحّدة جاهزة',
            });
            scheduleCreatedFileDiskCommit(mergedPrimary.id);
            return true;
        }

        if (incidentalSpawnContext) {
            if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) return false;
            const { patchIncidentalLinkedFile } = await loadCaseLinkingRuntime();
            if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) return false;
            const parentId = normalizeFileId(incidentalSpawnContext.parentFileId);
            const createPartyName =
                incidentalPartyLabel || spawnMeta?.filingPartyName || undefined;
            const withNew = [created, ...richestFiles];
            const nextActive = withNew.map((f) => {
                if (normalizeFileId(f.id) !== parentId) return f;
                return patchIncidentalLinkedFile(
                    f,
                    incidentalSpawnContext.incidentalId,
                    created.id,
                    created.caseNo,
                    createPartyName,
                    {
                        type: incidentalSpawnContext.type,
                        details: incidentalSpawnContext.details,
                        date: getLocalTodayYmd(),
                        partyName: createPartyName,
                    },
                );
            });
            if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) return false;
            const saved = commitCreateToMemorySync(nextActive, created);
            flushSync(() => {
                setFiles(() => saved);
            });
            for (const patched of saved) {
                if (normalizeFileId(patched.id) !== parentId) continue;
                if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) continue;
                if (userId) {
                    saveCaseDeferred(userId, patched as unknown as Record<string, unknown>);
                }
                syncLawsuitFileToCalendarDeferred(
                    patched as unknown as Record<string, unknown>,
                    userId,
                );
            }
        } else {
            if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) return false;
            const nextActive = [
                created,
                ...richestFiles.filter((f) => String(f.id) !== String(created.id)),
            ];
            const saved = commitCreateToMemorySync(nextActive, created);
            flushSync(() => {
                setFiles(saved);
            });
        }

        if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) return false;
        if (userId) {
            saveCaseDeferred(userId, created as unknown as Record<string, unknown>);
        }
        syncLawsuitFileToCalendarDeferred(created as unknown as Record<string, unknown>, userId);

        if (lawsuitNewCaseSaveSessionIdRef.current !== activeLawsuitNewCaseSaveSessionIdRef.current) return false;
        openCreatedDossier({
            file: created,
            setIsNewCaseModalOpen,
            setSubFileBase,
            setIncidentalSpawnContext,
            setActiveFile,
            successMessage: 'تم إنشاء الملف بنجاح',
        });
        scheduleCreatedFileDiskCommit(created.id);
        return true;
    } catch (error) {
        const name =
            error && typeof error === 'object' && 'name' in error
                ? String((error as { name: unknown }).name)
                : '';
        if (name === 'StorageEncryptionError') {
            SmartToast.error('تعذّر التشفير قبل الحفظ — أعد تحميل الصفحة ثم حاول مجدداً');
        } else {
            SmartToast.error('تعذّر حفظ الدعوى الجديدة');
        }
        return false;
    }
}
