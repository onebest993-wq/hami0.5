import { useCallback, useState } from 'react';
import type { FileData, Party } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { isFileData } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import { buildFileDataFromNewCaseSave } from '@/app/domain/lawsuit/lawsuitFileFactory';
import { persistLawsuitFiles } from '@/app/domain/lawsuit/lawsuitFilesRepository';
import { prefetchLawyerNewCaseModule } from '@/app/runtime/lawyerNewCaseLoader';
import {
    findFileById,
    patchIncidentalLinkedFile,
    type IncidentalSpawnContext,
} from '@/app/components/lawyer/smart-modal/smartFile/incidentalCaseLinking';
import {
    mergeLawsuitFilesForConsolidation,
    assertDistinctConsolidationPair,
    alignSecondaryFileLitigationStage,
    type ConsolidationSpawnContext,
} from '@/app/components/lawyer/smart-modal/smartFile/caseConsolidationLinking';
import {
    linkExistingLawsuitFiles,
} from '@/app/components/lawyer/smart-modal/smartFile/caseLinking';
import { syncLawsuitFileToCalendar } from '@/app/services/calendarDossierSync';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { LawyerDB } from '@/app/services/lawyerDbRuntime';
import { debug } from '@/app/utils/debug';
import { dismissTransientOverlays, reconcileBodyScrollLock } from '@/app/utils/bodyScrollLock';

type ActiveFile = FileData | ExecutionFile | null;

type CriminalBridge = {
    prepareNormalCriminalCaseForm: () => void;
    resumePendingSeveranceForm: () => boolean;
};

export type UseLawsuitNewCaseFlowOptions = {
    files: FileData[];
    setFiles: React.Dispatch<React.SetStateAction<FileData[]>>;
    activeFile: ActiveFile;
    setActiveFile: React.Dispatch<React.SetStateAction<ActiveFile>>;
    userId?: string | null;
    criminalBridge: CriminalBridge;
    onOpenCriminalDashboard: (caseId: string) => void;
};

export function useLawsuitNewCaseFlow({
    files,
    setFiles,
    activeFile,
    setActiveFile,
    userId,
    criminalBridge,
    onOpenCriminalDashboard,
}: UseLawsuitNewCaseFlowOptions) {
    const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
    const [isCriminalSeveranceRedirect, setIsCriminalSeveranceRedirect] = useState(false);
    const [subFileBase, setSubFileBase] = useState<FileData | null>(null);
    const [incidentalSpawnContext, setIncidentalSpawnContext] = useState<IncidentalSpawnContext | null>(null);
    const [consolidationSpawnContext, setConsolidationSpawnContext] =
        useState<ConsolidationSpawnContext | null>(null);

    const resetSpawnContexts = useCallback(() => {
        setSubFileBase(null);
        setIncidentalSpawnContext(null);
        setConsolidationSpawnContext(null);
        setIsCriminalSeveranceRedirect(false);
    }, []);

    const closeNewCaseModal = useCallback(() => {
        setIsNewCaseModalOpen(false);
        resetSpawnContexts();
    }, [resetSpawnContexts]);

    const openNormalNewCaseModal = useCallback(() => {
        prefetchLawyerNewCaseModule();
        criminalBridge.prepareNormalCriminalCaseForm();
        setIsCriminalSeveranceRedirect(false);
        setIsNewCaseModalOpen(true);
    }, [criminalBridge]);

    const openSeveranceNewCaseModal = useCallback(() => {
        if (!criminalBridge.resumePendingSeveranceForm()) return;
        setIsCriminalSeveranceRedirect(true);
        setIsNewCaseModalOpen(true);
    }, [criminalBridge]);

    const initiateSubFile = useCallback(
        (parentFile: FileData) => {
            setSubFileBase(parentFile);
            openNormalNewCaseModal();
        },
        [openNormalNewCaseModal],
    );

    const handleSpawnLinkedIncidentalCase = useCallback(
        (ctx: IncidentalSpawnContext) => {
            const parent = files.find((f) => f.id === ctx.parentFileId) || (activeFile as FileData | null);
            if (!parent || !isFileData(parent)) {
                SmartToast.error('تعذّر تحديد الإضبارة الأم');
                return;
            }
            setIncidentalSpawnContext(ctx);
            setSubFileBase(parent);
            openNormalNewCaseModal();
        },
        [files, activeFile, openNormalNewCaseModal],
    );

    const handleOpenLinkedFile = useCallback(
        (fileId: number) => {
            const target = findFileById(files, fileId);
            if (!target) {
                SmartToast.error('تعذّر العثور على الإضبارة المرتبطة');
                return;
            }
            setActiveFile(target);
        },
        [files, setActiveFile],
    );

    const persistConsolidatedFiles = useCallback(
        (mergedPrimary: FileData, archivedSecondary: FileData) => {
            if (userId) {
                void LawyerDB.saveCase(userId, mergedPrimary as unknown as Record<string, unknown>).catch(
                    debug.error,
                );
                void LawyerDB.saveCase(
                    userId,
                    archivedSecondary as unknown as Record<string, unknown>,
                ).catch(debug.error);
            }
            syncLawsuitFileToCalendar(mergedPrimary as unknown as Record<string, unknown>, userId);
            syncLawsuitFileToCalendar(archivedSecondary as unknown as Record<string, unknown>, userId);
        },
        [userId],
    );

    const handleStartConsolidationNewCase = useCallback(
        (ctx: ConsolidationSpawnContext) => {
            const primary = findFileById(files, ctx.primaryFileId) || (activeFile as FileData | null);
            if (!primary || !isFileData(primary)) {
                SmartToast.error('تعذّر تحديد الإضبارة الأولى للتوحيد');
                return;
            }
            setConsolidationSpawnContext(ctx);
            setSubFileBase(primary);
            setActiveFile(primary);
            openNormalNewCaseModal();
        },
        [files, activeFile, openNormalNewCaseModal, setActiveFile],
    );

    const handleConsolidateWithExisting = useCallback(
        (
            primaryFileId: number,
            secondaryFileId: number,
            meta: { consolidationDate: string; notes?: string },
        ) => {
            const pair = assertDistinctConsolidationPair(primaryFileId, secondaryFileId);
            if (!pair) {
                SmartToast.error('لا يمكن توحيد الإضبارة مع نفسها');
                return;
            }
            const primary = findFileById(files, pair.primary);
            const secondary = findFileById(files, pair.secondary);
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
            setFiles((prev) => {
                const next = prev.map((f) => {
                    const id = String(f.id);
                    if (id === String(pair.primary)) return mergedPrimary;
                    if (id === String(pair.secondary)) return archivedSecondary;
                    return f;
                });
                return persistLawsuitFiles(next);
            });
            persistConsolidatedFiles(mergedPrimary, archivedSecondary);
            setActiveFile(mergedPrimary);
            SmartToast.success(`تم توحيد الدعوى ${secondary.caseNo} في ${primary.caseNo}`);
        },
        [files, persistConsolidatedFiles, setActiveFile, setFiles],
    );

    const handleLinkWithExistingCase = useCallback(
        (
            primaryFileId: number,
            secondaryFileId: number,
            meta: { linkDate: string; reason?: string },
        ) => {
            const pair = assertDistinctConsolidationPair(primaryFileId, secondaryFileId);
            if (!pair) {
                SmartToast.error('لا يمكن ربط الإضبارة مع نفسها');
                return;
            }
            const primary = findFileById(files, pair.primary);
            const secondary = findFileById(files, pair.secondary);
            if (!primary || !secondary) {
                SmartToast.error('تعذّر العثور على إحدى الإضابير للربط');
                return;
            }
            const { updatedPrimary, updatedSecondary } = linkExistingLawsuitFiles(
                primary,
                secondary,
                meta,
            );
            setFiles((prev) => {
                const next = prev.map((f) => {
                    const id = String(f.id);
                    if (id === String(pair.primary)) return updatedPrimary;
                    if (id === String(pair.secondary)) return updatedSecondary;
                    return f;
                });
                return persistLawsuitFiles(next);
            });
            persistConsolidatedFiles(updatedPrimary, updatedSecondary);
            const activeId = activeFile?.id != null ? String(activeFile.id) : '';
            setActiveFile(
                activeId === String(pair.primary)
                    ? updatedPrimary
                    : activeId === String(pair.secondary)
                      ? updatedSecondary
                      : updatedPrimary,
            );
            SmartToast.success('تم ربط الدعويين بنجاح');
        },
        [files, activeFile, persistConsolidatedFiles, setActiveFile, setFiles],
    );

    const handleNewCaseSave = useCallback(
        (data: unknown) => {
            const newFile = buildFileDataFromNewCaseSave(data);
            if (!newFile) return;

            let created: FileData = subFileBase ? { ...newFile, parentId: subFileBase.id } : newFile;

            if (incidentalSpawnContext) {
                created = {
                    ...created,
                    parentId: incidentalSpawnContext.parentFileId,
                    incidentalLink: {
                        parentFileId: incidentalSpawnContext.parentFileId,
                        parentCaseNo: incidentalSpawnContext.parentCaseNo,
                        incidentalId: incidentalSpawnContext.incidentalId,
                        type: incidentalSpawnContext.type,
                    },
                };
            }

            if (consolidationSpawnContext) {
                const ctx = consolidationSpawnContext;
                const primary = findFileById(files, ctx.primaryFileId) || subFileBase;
                if (!primary) {
                    SmartToast.error('تعذّر تحديد الإضبارة الأولى للتوحيد');
                    return;
                }
                const alignedCreated = alignSecondaryFileLitigationStage(created, primary);
                const mergeResult = mergeLawsuitFilesForConsolidation(
                    primary,
                    alignedCreated,
                    {
                        consolidationDate: ctx.consolidationDate,
                        notes: ctx.notes,
                    },
                );
                if ('error' in mergeResult) {
                    SmartToast.error(mergeResult.error);
                    return;
                }
                const { mergedPrimary, archivedSecondary } = mergeResult;
                setFiles((prev) =>
                    persistLawsuitFiles(
                        prev.map((f) => (f.id === primary.id ? mergedPrimary : f)).concat([archivedSecondary]),
                    ),
                );
                persistConsolidatedFiles(mergedPrimary, archivedSecondary);
                SmartToast.success('تم توحيد الدعاوى بنجاح');
                setIsNewCaseModalOpen(false);
                resetSpawnContexts();
                dismissTransientOverlays();
                reconcileBodyScrollLock();
                setActiveFile(mergedPrimary);
                return;
            }

            setFiles((prev) => {
                const withNew = [created, ...prev];
                if (!incidentalSpawnContext) {
                    return persistLawsuitFiles(withNew);
                }
                const next = withNew.map((f) => {
                    if (f.id !== incidentalSpawnContext.parentFileId) return f;
                    const patched = patchIncidentalLinkedFile(
                        f,
                        incidentalSpawnContext.incidentalId,
                        created.id,
                        created.caseNo,
                    );
                    if (userId) {
                        void LawyerDB.saveCase(
                            userId,
                            patched as unknown as Record<string, unknown>,
                        ).catch(debug.error);
                    }
                    syncLawsuitFileToCalendar(
                        patched as unknown as Record<string, unknown>,
                        userId,
                    );
                    return patched;
                });
                return persistLawsuitFiles(next);
            });

            SmartToast.success('تم إنشاء الملف بنجاح');
            setIsNewCaseModalOpen(false);
            setSubFileBase(null);
            setIncidentalSpawnContext(null);
            dismissTransientOverlays();
            reconcileBodyScrollLock();
            setActiveFile(created);
        },
        [
            files,
            subFileBase,
            incidentalSpawnContext,
            consolidationSpawnContext,
            persistConsolidatedFiles,
            resetSpawnContexts,
            setActiveFile,
            setFiles,
            userId,
        ],
    );

    const newCaseModalKey = isCriminalSeveranceRedirect
        ? 'new-case-modal-severance'
        : consolidationSpawnContext
          ? 'new-case-modal-consolidation'
          : incidentalSpawnContext
            ? 'new-case-modal-incidental'
            : 'new-case-modal';

    const consolidationSpawnNav =
        consolidationSpawnContext != null
            ? {
                  primaryCaseNo: consolidationSpawnContext.primaryCaseNo,
                  activeView: (isNewCaseModalOpen ? 'secondary' : 'primary') as 'primary' | 'secondary',
                  onSelectPrimary: () => {
                      const primary = files.find(
                          (f) => f.id === consolidationSpawnContext.primaryFileId,
                      );
                      if (primary) setActiveFile(primary);
                      setIsNewCaseModalOpen(false);
                  },
                  onSelectSecondary: () => {
                      setIsNewCaseModalOpen(true);
                  },
              }
            : null;

    return {
        isNewCaseModalOpen,
        isCriminalSeveranceRedirect,
        consolidationNavActive: Boolean(consolidationSpawnContext),
        openNormalNewCaseModal,
        openSeveranceNewCaseModal,
        closeNewCaseModal,
        initiateSubFile,
        handleSpawnLinkedIncidentalCase,
        handleStartConsolidationNewCase,
        handleConsolidateWithExisting,
        handleLinkWithExistingCase,
        handleOpenLinkedFile,
        handleNewCaseSave,
        newCaseModalKey,
        consolidationSpawnNav,
        onNewCaseOpenCriminalDashboard: (caseId: string) => {
            onOpenCriminalDashboard(caseId);
            setIsCriminalSeveranceRedirect(false);
        },
        presetSelectedType: isCriminalSeveranceRedirect
            ? ('criminal' as const)
            : consolidationSpawnContext || incidentalSpawnContext
              ? ('civil' as const)
              : undefined,
    };
}
