import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import type { JurisdictionId } from '@/app/components/lawyer/LawyerNewCase/wordLists';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ThemeConfig } from '@/app/types/common';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import { allLawsuitFilesForArchive } from '@/app/domain/lawsuit/lawsuitFileFactory';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { loadArchivePortalModule } from '@/app/runtime/hubArchiveLoader';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import { setPendingLawyerNewCaseJurisdiction } from '@/app/runtime/lawyerNewCaseLoader';
import { ArchivePortalHost } from '@/app/components/lawyer/dashboard/ArchivePortalHost';
import { LawsuitsAddCaseFabWithPicker } from '@/app/components/lawyer/dashboard/LawsuitsAddCaseFabWithPicker';
import {
    LawsuitsWorkspaceShell,
    LawsuitsWorkspaceTabLoading,
    type LawsuitsWorkspaceTab,
} from './LawsuitsWorkspaceShell';
import {
    URGENT_DOSSIER_BTN_GHOST,
    URGENT_DOSSIER_DIALOG_PANEL,
} from '@/app/components/lawyer/Dashboard_Active_Order_File/layout/urgentDossierUi';

function createLazyUrgentDashboard(loadKey: number) {
    void loadKey;
    return lazyWithRetry(() =>
        import('@/app/runtime/urgentOrdersViewLoader')
            .then((m) => m.loadUrgentOrdersViewModule())
            .then((mod) => ({
                default: mod.View_Urgent_And_Orders_Dashboard as unknown as LazyComponent,
            })),
    );
}

type UrgentWorkspaceTabProps = {
    loadKey: number;
    focusCaseId?: string;
};

function UrgentWorkspaceTab({ loadKey, focusCaseId }: UrgentWorkspaceTabProps) {
    const LazyView = useMemo(() => createLazyUrgentDashboard(loadKey), [loadKey]);
    return (
        <Suspense fallback={<LawsuitsWorkspaceTabLoading label="جاري تحميل الطلبات المستعجلة..." />}>
            <LazyView embeddedInWorkspace focusCaseId={focusCaseId} />
        </Suspense>
    );
}

type LawsuitsWorkspaceHostProps = {
    active?: boolean;
    escapeEnabled?: boolean;
    files: FileData[];
    criminalCases: unknown[];
    theme: ThemeConfig;
    shapeClass: string;
    defaultTab?: LawsuitsWorkspaceTab;
    urgentFocusCaseId?: string;
    initialDossierSection?: LawsuitJurisdictionTab;
    onClose: () => void;
    onOpenCriminalCase: (id: string) => void;
    onDeleteCriminalCase: (id: string) => void;
    onOpenFile: (file: unknown) => void;
    onAddNewCase: () => void;
    onMoveLawsuitToTrash?: (id: string | number) => void;
    onRestoreLawsuitFromTrash?: (id: string | number) => void;
    onArchiveLawsuit?: (id: string | number) => void;
    onRestoreArchivedLawsuit?: (id: string | number) => void;
    onPermanentlyDeleteLawsuits?: (ids: (string | number)[]) => void;
    onExitToHome?: () => void;
};

function TabLoadErrorFallback({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="h-full flex items-center justify-center p-4">
            <div className={`${URGENT_DOSSIER_DIALOG_PANEL} max-w-md w-full text-right`}>
                <p className="text-white font-extrabold text-sm">تعذّر تحميل هذا القسم</p>
                <p className="text-white/50 text-xs mt-1 leading-relaxed">
                    تحقق من الاتصال ثم أعد المحاولة. إن استمر الخطأ، حدّث الصفحة (Ctrl+Shift+R).
                </p>
                <div className="mt-4 flex justify-end">
                    <button type="button" onClick={onRetry} className={`${URGENT_DOSSIER_BTN_GHOST} min-h-[40px] py-2 text-xs`}>
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        </div>
    );
}

export function LawsuitsWorkspaceHost(props: LawsuitsWorkspaceHostProps): React.ReactElement {
    const {
        active = true,
        escapeEnabled = true,
        files,
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

    const [urgentLoadKey, setUrgentLoadKey] = useState(0);
    const lawsuitArchiveFiles = useMemo(() => allLawsuitFilesForArchive(files), [files]);

    const primeCivilArchiveCore = useCallback(() => {
        void loadArchivePortalModule().catch(() => undefined);
    }, []);

    const scheduleSecondaryLawsuitWarm = useCallback(() => {
        window.setTimeout(() => {
            void import('@/app/runtime/lawyerNewCaseLoader')
                .then((m) => m.prefetchLawyerNewCaseModule())
                .catch(() => undefined);
        }, 400);
        window.setTimeout(() => {
            void import('@/app/runtime/smartFileModalLoader')
                .then((m) => m.prefetchSmartFileModalPhased())
                .catch(() => undefined);
        }, 5_000);
    }, []);

    const primeCivilArchive = useCallback(() => {
        primeCivilArchiveCore();
        scheduleSecondaryLawsuitWarm();
    }, [primeCivilArchiveCore, scheduleSecondaryLawsuitWarm]);

    const primeUrgentTab = useCallback(() => {
        void import('@/app/runtime/urgentOrdersViewLoader')
            .then((m) => m.prefetchUrgentOrdersViewModule())
            .catch(() => undefined);
        void import('@/app/components/lawyer/DeferredActiveOrderFile')
            .then((m) => m.preloadActiveOrderFilePanel())
            .catch(() => undefined);
        void import('@/app/components/lawyer/Form_Urgent_Actions').catch(() => undefined);
    }, []);

    const retryUrgentLoad = useCallback(() => {
        void import('@/app/runtime/urgentOrdersViewLoader')
            .then((m) => {
                m.resetUrgentOrdersViewLoaderForTests();
                m.prefetchUrgentOrdersViewModule();
            })
            .catch(() => undefined);
        setUrgentLoadKey((key) => key + 1);
    }, []);

    useEffect(() => {
        primeCivilArchiveCore();
        scheduleSecondaryLawsuitWarm();
    }, [primeCivilArchiveCore, scheduleSecondaryLawsuitWarm]);

    const handleJurisdictionSelect = useCallback(
        (id: JurisdictionId) => {
            setPendingLawyerNewCaseJurisdiction(id);
            if (id === 'criminal') {
                void import('@/app/components/lawyer/criminal-system/criminalStore').then(
                    ({ useCriminalStore }) => useCriminalStore.getState().prepareNormalCriminalCaseForm(),
                );
            }
            onAddNewCase();
        },
        [onAddNewCase],
    );

    return (
        <LawsuitsWorkspaceShell
            defaultTab={defaultTab}
            open={active}
            onClose={onClose}
            onExitToHome={onExitToHome}
            onShellReady={primeCivilArchiveCore}
            onUrgentTabIntent={primeUrgentTab}
            escapeEnabled={escapeEnabled && active}
            onTabChange={(nextTab) => {
                if (nextTab === 'civil') primeCivilArchive();
                if (nextTab === 'urgent') primeUrgentTab();
            }}
            addCaseFab={
                <LawsuitsAddCaseFabWithPicker
                    onSelect={handleJurisdictionSelect}
                    onIntent={primeCivilArchive}
                    label="إضبارة جديدة"
                />
            }
        >
            {(tab) => (
                <>
                    <div
                        className={tab === 'civil' ? 'relative h-full min-h-0' : 'hidden'}
                        aria-hidden={tab !== 'civil'}
                    >
                        <div className="absolute inset-0 overflow-hidden">
                            <ErrorBoundary
                                fallback={<TabLoadErrorFallback onRetry={primeCivilArchiveCore} />}
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
                                    loadingVariant="inline"
                                />
                            </ErrorBoundary>
                        </div>
                    </div>

                    <div
                        className={
                            tab === 'urgent'
                                ? 'h-full overflow-y-auto overscroll-y-contain touch-pan-y'
                                : 'hidden'
                        }
                        aria-hidden={tab !== 'urgent'}
                    >
                        <ErrorBoundary
                            key={`urgent-${urgentLoadKey}`}
                            fallback={<TabLoadErrorFallback onRetry={retryUrgentLoad} />}
                        >
                            <UrgentWorkspaceTab loadKey={urgentLoadKey} focusCaseId={urgentFocusCaseId} />
                        </ErrorBoundary>
                    </div>
                </>
            )}
        </LawsuitsWorkspaceShell>
    );
}
