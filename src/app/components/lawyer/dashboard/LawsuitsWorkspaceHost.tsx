import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { JurisdictionId } from '@/app/components/lawyer/LawyerNewCase/wordLists';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import type { ThemeConfig } from '@/app/types/common';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import { allLawsuitFilesForArchive } from '@/app/domain/lawsuit/lawsuitArchivePool';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { loadLawsuitArchiveHubModule } from '@/app/runtime/hubArchiveLoader';
import { setPendingLawyerNewCaseJurisdiction } from '@/app/runtime/lawyerNewCasePendingJurisdiction';
import { ArchivePortalHost } from '@/app/components/lawyer/dashboard/ArchivePortalHost';
import { LawsuitsAddCaseFabWithPicker } from '@/app/components/lawyer/dashboard/LawsuitsAddCaseFabWithPicker';
import {
    LawsuitsWorkspaceShell,
    type LawsuitsWorkspaceTab,
} from './LawsuitsWorkspaceShell';
import {
    LawsuitsCivilTabLoadErrorFallback,
    LawsuitsWorkspaceUrgentTab,
} from './LawsuitsWorkspaceUrgentTab';

type LawsuitsWorkspaceHostProps = {
    active?: boolean;
    /**
     * أبقِ شبكة الأرشيف/المستعجل تحت إضبارة أو نموذج جديد أو جزائي أو keep-alive المخزن.
     */
    retainArchive?: boolean;
    escapeEnabled?: boolean;
    files: FileData[];
    lawsuitLifecycleCounts?: { active: number; archived: number; trash: number };
    lawsuitArchivedFiles?: FileData[] | null;
    lawsuitTrashFiles?: FileData[] | null;
    onEnsureLawsuitArchivedLoaded?: () => void | Promise<void>;
    onEnsureLawsuitTrashLoaded?: () => void | Promise<void>;
    lawsuitFilesHydrating?: boolean;
    criminalCases: unknown[];
    theme: ThemeConfig;
    shapeClass: string;
    defaultTab?: LawsuitsWorkspaceTab;
    urgentFocusCaseId?: string;
    initialDossierSection?: LawsuitJurisdictionTab;
    onClose: () => void;
    onOpenCriminalCase: (id: string) => void;
    onDeleteCriminalCase: (id: string) => boolean | void;
    onOpenFile: (file: unknown) => void;
    onAddNewCase: () => void;
    onMoveLawsuitToTrash?: (id: string | number) => void;
    onRestoreLawsuitFromTrash?: (id: string | number) => void;
    onArchiveLawsuit?: (id: string | number) => void;
    onRestoreArchivedLawsuit?: (id: string | number) => void;
    onPermanentlyDeleteLawsuits?: (ids: (string | number)[]) => void;
    onExitToHome?: () => void;
};

function prefetchNewCaseModule(): void {
    void import('@/app/runtime/lawyerNewCaseLoader')
        .then((m) => m.prefetchLawyerNewCaseModule())
        .catch(() => undefined);
}

export function LawsuitsWorkspaceHost(props: LawsuitsWorkspaceHostProps): React.ReactElement {
    const {
        active = true,
        retainArchive = false,
        escapeEnabled = true,
        files,
        lawsuitLifecycleCounts,
        lawsuitArchivedFiles,
        lawsuitTrashFiles,
        onEnsureLawsuitArchivedLoaded,
        onEnsureLawsuitTrashLoaded,
        lawsuitFilesHydrating = false,
        criminalCases,
        theme,
        shapeClass,
        defaultTab = 'civil',
        urgentFocusCaseId,
        initialDossierSection = 'all',
        onClose,
        onOpenCriminalCase,
        onDeleteCriminalCase,
        onOpenFile,
        onAddNewCase,
        onMoveLawsuitToTrash,
        onRestoreLawsuitFromTrash,
        onArchiveLawsuit,
        onRestoreArchivedLawsuit,
        onPermanentlyDeleteLawsuits,
        onExitToHome,
    } = props;

    const lawsuitArchiveFiles = useMemo(() => allLawsuitFilesForArchive(files), [files]);
    const mountLawsuitTrees = active || retainArchive;

    /** Hub الدعاوى فقط — بلا غلاف الأرشيف المشترك (تنفيذ+دعوى). */
    const primeCivilArchiveCore = useCallback(() => {
        void loadLawsuitArchiveHubModule().catch(() => undefined);
    }, []);

    const secondaryWarmTimersRef = useRef<number[]>([]);
    const dossierWarmTimerRef = useRef<number | null>(null);

    const clearDossierWarm = useCallback(() => {
        if (dossierWarmTimerRef.current != null) {
            window.clearTimeout(dossierWarmTimerRef.current);
            dossierWarmTimerRef.current = null;
        }
    }, []);

    const clearSecondaryLawsuitWarm = useCallback(() => {
        for (const id of secondaryWarmTimersRef.current) window.clearTimeout(id);
        secondaryWarmTimersRef.current = [];
    }, []);

    /**
     * NewCase — تحميل مسبق فوري عند فتح مساحة الدعاوى (بلا تأخير 800ms).
     */
    const scheduleSecondaryLawsuitWarm = useCallback(() => {
        clearSecondaryLawsuitWarm();
        prefetchNewCaseModule();
    }, [clearSecondaryLawsuitWarm]);

    const primeCivilArchive = useCallback(() => {
        primeCivilArchiveCore();
        scheduleSecondaryLawsuitWarm();
    }, [primeCivilArchiveCore, scheduleSecondaryLawsuitWarm]);

    const prefetchUrgentDashboard = useCallback(() => {
        void import('@/app/runtime/urgentOrdersViewLoader')
            .then((m) => m.prefetchUrgentOrdersViewModule())
            .catch(() => undefined);
    }, []);

    const primeUrgentTab = useCallback(() => {
        prefetchUrgentDashboard();
        const warmCompanions = () => {
            void import('@/app/components/lawyer/DeferredActiveOrderFile')
                .then((m) => m.preloadActiveOrderFilePanel())
                .catch(() => undefined);
            void import('@/app/components/lawyer/Form_Urgent_Actions').catch(() => undefined);
        };
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(warmCompanions, { timeout: 1_200 });
            return;
        }
        const timer = window.setTimeout(warmCompanions, 400);
        secondaryWarmTimersRef.current.push(timer);
    }, [prefetchUrgentDashboard]);

    useEffect(() => {
        if (!active) {
            clearSecondaryLawsuitWarm();
            return;
        }
        primeCivilArchiveCore();
        prefetchUrgentDashboard();
    }, [active, clearSecondaryLawsuitWarm, prefetchUrgentDashboard, primeCivilArchiveCore]);

    useEffect(() => {
        if (!active) {
            clearDossierWarm();
            return;
        }
        dossierWarmTimerRef.current = window.setTimeout(() => {
            dossierWarmTimerRef.current = null;
            if (
                document.querySelector('[data-testid="lawsuits-jurisdiction-picker"]') ||
                document.querySelector('[data-testid="lawyer-new-case-save"]') ||
                document.querySelector('[data-testid="lawyer-new-case-instant-shell"]')
            ) {
                return;
            }
            void import('@/app/runtime/lawsuitOpenContract')
                .then((m) => m.prepareLawsuitDossierChromeOnce())
                .catch(() => undefined);
        }, 200);
        return () => clearDossierWarm();
    }, [active, clearDossierWarm]);

    useEffect(() => () => clearSecondaryLawsuitWarm(), [clearSecondaryLawsuitWarm]);

    const handleShellReady = useCallback(() => {
        primeCivilArchiveCore();
        prefetchUrgentDashboard();
    }, [prefetchUrgentDashboard, primeCivilArchiveCore]);

    const handleJurisdictionSelect = useCallback(
        (id: JurisdictionId) => {
            clearDossierWarm();
            prefetchNewCaseModule();
            setPendingLawyerNewCaseJurisdiction(id);
            if (id === 'criminal') {
                void import('@/app/components/lawyer/criminal-system/criminalStore').then(
                    ({ useCriminalStore }) => useCriminalStore.getState().prepareNormalCriminalCaseForm(),
                );
            }
            onAddNewCase();
        },
        [clearDossierWarm, onAddNewCase],
    );

    return (
        <LawsuitsWorkspaceShell
            defaultTab={defaultTab}
            open={active}
            onClose={onClose}
            onExitToHome={onExitToHome}
            onShellReady={handleShellReady}
            onUrgentTabIntent={primeUrgentTab}
            escapeEnabled={escapeEnabled && active}
            onTabChange={(nextTab) => {
                if (nextTab === 'civil') primeCivilArchive();
                if (nextTab === 'urgent') primeUrgentTab();
            }}
            addCaseFab={
                <LawsuitsAddCaseFabWithPicker
                    onSelect={handleJurisdictionSelect}
                    onIntent={() => {
                        clearDossierWarm();
                        prefetchNewCaseModule();
                        primeCivilArchive();
                    }}
                    label="إضبارة جديدة"
                />
            }
        >
            {(tab) =>
                mountLawsuitTrees ? (
                <>
                    <div
                        className={tab === 'civil' ? 'relative h-full min-h-0' : 'hidden'}
                        aria-hidden={tab !== 'civil'}
                    >
                        <div className="absolute inset-0 overflow-hidden">
                            <ErrorBoundary
                                fallback={
                                    <LawsuitsCivilTabLoadErrorFallback
                                        onRetry={primeCivilArchiveCore}
                                    />
                                }
                            >
                                <ArchivePortalHost
                                    type="lawsuits"
                                    files={lawsuitArchiveFiles as never}
                                    criminalCases={criminalCases}
                                    theme={theme}
                                    shapeClass={shapeClass}
                                    onClose={onClose}
                                    onFileClick={onOpenFile}
                                    onAddAction={() => {
                                        clearDossierWarm();
                                        primeCivilArchive();
                                        onAddNewCase();
                                    }}
                                    embedded
                                    hideHeader
                                    hideTopActionBar
                                    initialLawsuitJurisdictionTab={initialDossierSection}
                                    onOpenCriminalCase={onOpenCriminalCase}
                                    onDeleteCriminalCase={onDeleteCriminalCase}
                                    onMoveLawsuitToTrash={onMoveLawsuitToTrash}
                                    onRestoreLawsuitFromTrash={onRestoreLawsuitFromTrash}
                                    onArchiveLawsuit={onArchiveLawsuit}
                                    onRestoreArchivedLawsuit={onRestoreArchivedLawsuit}
                                    onPermanentlyDeleteLawsuits={onPermanentlyDeleteLawsuits}
                                    lawsuitLifecycleCounts={lawsuitLifecycleCounts}
                                    lawsuitArchivedFiles={lawsuitArchivedFiles}
                                    lawsuitTrashFiles={lawsuitTrashFiles}
                                    onEnsureLawsuitArchivedLoaded={onEnsureLawsuitArchivedLoaded}
                                    onEnsureLawsuitTrashLoaded={onEnsureLawsuitTrashLoaded}
                                    lawsuitFilesHydrating={lawsuitFilesHydrating}
                                    loadingVariant="inline"
                                />
                            </ErrorBoundary>
                        </div>
                    </div>

                    <LawsuitsWorkspaceUrgentTab
                        active={tab === 'urgent'}
                        focusCaseId={urgentFocusCaseId}
                    />
                </>
                ) : null
            }
        </LawsuitsWorkspaceShell>
    );
}
