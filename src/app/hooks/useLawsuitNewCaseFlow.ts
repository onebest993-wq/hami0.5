import { useCallback, useState } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { persistLawsuitFiles } from '@/app/domain/lawsuit/lawsuitFilesRepository';
import {
    clearPendingIncidentalSpawnContext,
    prefetchLawyerNewCaseModule,
    setPendingIncidentalSpawnContext,
} from '@/app/runtime/lawyerNewCaseLoader';
import type { IncidentalSpawnContext } from '@/app/components/lawyer/smart-modal/smartFile/incidentalCaseLinking';
import {
    resolveConsolidationMergedOpenTarget,
    type ConsolidationSpawnContext,
} from '@/app/components/lawyer/smart-modal/smartFile/caseConsolidationLinking';
import {
    enrichIncidentalSpawnContext,
    isCounterClaimAllowedStage,
    type IncidentalSpawnContextEnriched,
} from '@/app/domain/lawsuit/incidentalSpawnPrefill';
import { findLawsuitFileById, loadCaseLinkingRuntime } from '@/app/hooks/caseLinkingRuntime';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';
import { dismissTransientOverlays, reconcileBodyScrollLock } from '@/app/utils/bodyScrollLock';

function saveCaseDeferred(userId: string, caseData: Record<string, unknown>): void {
    void import('@/app/services/lawyerDbRuntime')
        .then(({ LawyerDB }) => LawyerDB.saveCase(userId, caseData))
        .catch(debug.error);
}

function syncLawsuitFileToCalendarDeferred(
    file: Record<string, unknown>,
    userId?: string | null,
): void {
    void import('@/app/services/calendar/dossierSyncLazy')
        .then((m) => m.syncLawsuitFileToCalendar(file, userId))
        .catch(() => undefined);
}

/** خفيف — بلا سحب LawyerDashboardParts/utils إلى stem اللوحة */
function isFileData(value: unknown): value is FileData {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const v = value as Record<string, unknown>;
    return (
        (typeof v.id === 'number' || typeof v.id === 'string') &&
        (typeof v.caseNo === 'string' || typeof v.docType === 'string')
    );
}

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
    const [incidentalSpawnContext, setIncidentalSpawnContext] =
        useState<IncidentalSpawnContextEnriched | null>(null);
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
        clearPendingIncidentalSpawnContext();
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
            const parent =
                findLawsuitFileById(files, ctx.parentFileId) || (activeFile as FileData | null);
            if (!parent || !isFileData(parent)) {
                SmartToast.error('تعذّر تحديد الإضبارة الأم');
                return;
            }
            const enriched = enrichIncidentalSpawnContext(parent, ctx);
            if (
                enriched.type === 'counter' &&
                !isCounterClaimAllowedStage(enriched.parent.stage)
            ) {
                SmartToast.error('لا يمكن إنشاء دعوى متقابلة في مرحلة الاستئناف أو إعادة المحاكمة');
                return;
            }
            setPendingIncidentalSpawnContext(enriched);
            setIncidentalSpawnContext(enriched);
            setSubFileBase(parent);
            openNormalNewCaseModal();
        },
        [files, activeFile, openNormalNewCaseModal],
    );

    const persistConsolidatedFiles = useCallback(
        (mergedPrimary: FileData, archivedSecondary: FileData) => {
            if (userId) {
                saveCaseDeferred(userId, mergedPrimary as unknown as Record<string, unknown>);
                saveCaseDeferred(userId, archivedSecondary as unknown as Record<string, unknown>);
            }
            syncLawsuitFileToCalendarDeferred(mergedPrimary as unknown as Record<string, unknown>, userId);
            syncLawsuitFileToCalendarDeferred(archivedSecondary as unknown as Record<string, unknown>, userId);
        },
        [userId],
    );

    const handleStartConsolidationNewCase = useCallback(
        (ctx: ConsolidationSpawnContext) => {
            const primary = findLawsuitFileById(files, ctx.primaryFileId) || (activeFile as FileData | null);
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
            void (async () => {
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
                dismissTransientOverlays();
                reconcileBodyScrollLock();
                setActiveFile(mergedPrimary);
                SmartToast.success(
                    `تم توحيد الدعويين — الإضبارة الموحّدة (${mergedPrimary.caseNo}) جاهزة`,
                );
            })();
        },
        [files, persistConsolidatedFiles, setActiveFile, setFiles],
    );

    const handleLinkWithExistingCase = useCallback(
        (
            primaryFileId: number,
            peer: {
                dossierKind: 'lawsuit' | 'criminal';
                lawsuitFileId?: number;
                criminalId?: string;
                caseNo: string;
            },
            meta: { linkDate: string; reason?: string },
        ) => {
            void (async () => {
                const {
                    rejectCaseLinkPair,
                    linkExistingLawsuitFiles,
                    linkCriminalPeerToOrigin,
                } = await loadCaseLinkingRuntime();
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
                syncLawsuitFileToCalendarDeferred(
                    updatedPrimary as unknown as Record<string, unknown>,
                    userId,
                );
                const activeId = activeFile?.id != null ? String(activeFile.id) : '';
                setActiveFile(
                    activeId === String(primaryFileId) ? updatedPrimary : activeFile,
                );
                SmartToast.success('تم ربط الإضبارة بنجاح — نسخة للاطلاع فقط');
            })();
        },
        [files, activeFile, setActiveFile, setFiles, userId],
    );

    const handleNewCaseSave = useCallback(
        async (data: unknown): Promise<boolean> => {
            try {
                const { buildFileDataFromNewCaseSave } = await import(
                    '@/app/domain/lawsuit/lawsuitFileFactory'
                );
                const newFile = buildFileDataFromNewCaseSave(data);
                if (!newFile) {
                    SmartToast.error('تعذّر إنشاء الملف — تحقق من البيانات المدخلة');
                    return false;
                }

                let created: FileData = subFileBase ? { ...newFile, parentId: subFileBase.id } : newFile;

                // يُقرآن في كتلتَي incidentalSpawnContext المنفصلتين أدناه — إعادتهما
                // إلى داخل إحداهما تُخرجهما عن نطاق الأخرى بلا خطأ ترجمة ظاهر.
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
                    const ctx = consolidationSpawnContext;
                    const primary = findLawsuitFileById(files, ctx.primaryFileId) || subFileBase;
                    if (!primary) {
                        SmartToast.error('تعذّر تحديد الإضبارة الأولى للتوحيد');
                        return false;
                    }
                    const {
                        alignSecondaryFileLitigationStage,
                        mergeLawsuitFilesForConsolidation,
                    } = await loadCaseLinkingRuntime();
                    const alignedCreated = alignSecondaryFileLitigationStage(created, primary);
                    const mergeResult = mergeLawsuitFilesForConsolidation(primary, alignedCreated, {
                        consolidationDate: ctx.consolidationDate,
                        notes: ctx.notes,
                    });
                    if ('error' in mergeResult) {
                        SmartToast.error(mergeResult.error);
                        return false;
                    }
                    const { mergedPrimary, archivedSecondary } = mergeResult;
                    setFiles((prev) =>
                        persistLawsuitFiles(
                            prev.map((f) => (f.id === primary.id ? mergedPrimary : f)).concat([archivedSecondary]),
                        ),
                    );
                    persistConsolidatedFiles(mergedPrimary, archivedSecondary);
                    SmartToast.success('تم توحيد الدعويين — الإضبارة الموحّدة جاهزة');
                    setIsNewCaseModalOpen(false);
                    resetSpawnContexts();
                    dismissTransientOverlays();
                    reconcileBodyScrollLock();
                    setActiveFile(mergedPrimary);
                    return true;
                }

                if (incidentalSpawnContext) {
                    const { patchIncidentalLinkedFile } = await loadCaseLinkingRuntime();
                    setFiles((prev) => {
                        const withNew = [created, ...prev];
                        const next = withNew.map((f) => {
                            if (f.id !== incidentalSpawnContext.parentFileId) return f;
                            const patched = patchIncidentalLinkedFile(
                                f,
                                incidentalSpawnContext.incidentalId,
                                created.id,
                                created.caseNo,
                                incidentalPartyLabel || spawnMeta?.filingPartyName,
                            );
                            if (userId) {
                                saveCaseDeferred(userId, patched as unknown as Record<string, unknown>);
                            }
                            syncLawsuitFileToCalendarDeferred(
                                patched as unknown as Record<string, unknown>,
                                userId,
                            );
                            return patched;
                        });
                        return persistLawsuitFiles(next);
                    });
                } else {
                    setFiles((prev) => persistLawsuitFiles([created, ...prev]));
                }

                if (userId) {
                    saveCaseDeferred(userId, created as unknown as Record<string, unknown>);
                }
                syncLawsuitFileToCalendarDeferred(
                    created as unknown as Record<string, unknown>,
                    userId,
                );

                SmartToast.success('تم إنشاء الملف بنجاح');
                setIsNewCaseModalOpen(false);
                setSubFileBase(null);
                setIncidentalSpawnContext(null);
                dismissTransientOverlays();
                reconcileBodyScrollLock();
                setActiveFile(created);
                return true;
            } catch {
                SmartToast.error('تعذّر حفظ الدعوى الجديدة');
                return false;
            }
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
            ? `new-case-modal-incidental-${incidentalSpawnContext.incidentalId}`
            : 'new-case-modal';

    const consolidationSpawnNav =
        consolidationSpawnContext != null
            ? {
                  primaryCaseNo: consolidationSpawnContext.primaryCaseNo,
                  activeView: (isNewCaseModalOpen ? 'secondary' : 'primary') as 'primary' | 'secondary',
                  onSelectPrimary: () => {
                      const primary = findLawsuitFileById(
                          files,
                          consolidationSpawnContext.primaryFileId,
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
        dossierNewCaseElevated: Boolean(
            incidentalSpawnContext || consolidationSpawnContext || subFileBase,
        ),
        openNormalNewCaseModal,
        openSeveranceNewCaseModal,
        closeNewCaseModal,
        initiateSubFile,
        handleSpawnLinkedIncidentalCase,
        handleStartConsolidationNewCase,
        handleConsolidateWithExisting,
        handleLinkWithExistingCase,
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
