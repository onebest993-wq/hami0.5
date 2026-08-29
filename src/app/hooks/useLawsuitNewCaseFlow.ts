import { useCallback, useState } from 'react';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import {
    clearPendingIncidentalSpawnContext,
    prefetchLawyerNewCaseModule,
    setPendingIncidentalSpawnContext,
} from '@/app/runtime/lawyerNewCaseLoader';
import type { IncidentalSpawnContext } from '@/app/domain/lawsuit/incidentalSpawnPrefill';
import { type ConsolidationSpawnContext } from '@/app/components/lawyer/smart-modal/smartFile/caseConsolidationLinking';
import {
    enrichIncidentalSpawnContext,
    isCounterClaimAllowedStage,
    type IncidentalSpawnContextEnriched,
} from '@/app/domain/lawsuit/incidentalSpawnPrefill';
import { findLawsuitFileById } from '@/app/hooks/caseLinkingRuntime';
import {
    consolidateLawsuitWithExisting,
    linkLawsuitWithExistingCase,
} from '@/app/hooks/lawsuitNewCaseLinking';
import { performLawsuitNewCaseSave } from '@/app/hooks/lawsuitNewCaseSave';
import {
    saveCaseDeferred,
    syncLawsuitFileToCalendarDeferred,
} from '@/app/hooks/lawsuitPersistDeferred';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { LawsuitFileSegments } from '@/app/domain/lawsuit/lawsuitFilesRepository';

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
    setLawsuitSegments: React.Dispatch<React.SetStateAction<LawsuitFileSegments>>;
    activeFile: ActiveFile;
    setActiveFile: React.Dispatch<React.SetStateAction<ActiveFile>>;
    userId?: string | null;
    criminalBridge: CriminalBridge;
    onOpenCriminalDashboard: (caseId: string) => void;
};

export function useLawsuitNewCaseFlow({
    files,
    setFiles,
    setLawsuitSegments,
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
        // لا نستدعي prepareNormal هنا: يصفّر pendingSeverance ويُفسِد الشطر.
        // مسار الجزائي من FAB يستدعي prepare في LawsuitsWorkspaceHost عند اختيار الاختصاص.
        setIsCriminalSeveranceRedirect(false);
        setIsNewCaseModalOpen(true);
    }, []);

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
            syncLawsuitFileToCalendarDeferred(
                archivedSecondary as unknown as Record<string, unknown>,
                userId,
            );
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
            void consolidateLawsuitWithExisting({
                primaryFileId,
                secondaryFileId,
                meta,
                files,
                setLawsuitSegments,
                setActiveFile,
                persistConsolidatedFiles,
            });
        },
        [files, persistConsolidatedFiles, setActiveFile, setLawsuitSegments],
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
            void linkLawsuitWithExistingCase({
                primaryFileId,
                peer,
                meta,
                files,
                activeFile,
                setFiles,
                setActiveFile,
                userId,
            });
        },
        [files, activeFile, setActiveFile, setFiles, userId],
    );

    const handleNewCaseSave = useCallback(
        async (data: unknown): Promise<boolean> =>
            performLawsuitNewCaseSave({
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
            }),
        [
            files,
            subFileBase,
            incidentalSpawnContext,
            consolidationSpawnContext,
            persistConsolidatedFiles,
            resetSpawnContexts,
            setActiveFile,
            setFiles,
            setLawsuitSegments,
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
