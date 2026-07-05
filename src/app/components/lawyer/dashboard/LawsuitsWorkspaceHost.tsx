// @ts-nocheck
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ThemeConfig } from '@/app/types/common';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import { allLawsuitFilesForArchive } from '@/app/domain/lawsuit/lawsuitFileFactory';
import {
    LazyViewUrgentAndOrdersDashboard,
    prefetchUrgentOrdersView,
    resetUrgentOrdersViewPrefetch,
} from '@/app/utils/lazyComponents';
import { resetActiveOrderFilePanelCache } from '@/app/components/lawyer/DeferredActiveOrderFile';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { loadArchivePortalModule } from '@/app/runtime/hubArchiveLoader';
import { prefetchLawyerNewCaseModule } from '@/app/runtime/lawyerNewCaseLoader';
import { prefetchSmartFileModalPhased } from '@/app/runtime/smartFileModalLoader';
import { prefetchArchivePortal } from '@/app/utils/lazyComponents';
import { ArchivePortalHost } from './ArchivePortalHost';
import {
    LawsuitsAddCaseFab,
    LawsuitsWorkspaceShell,
    LawsuitsWorkspaceTabLoading,
    type LawsuitsWorkspaceTab,
} from './LawsuitsWorkspaceShell';

type LawsuitsWorkspaceHostProps = {
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
    onMoveLawsuitToTrash?: (id: string) => void;
    onRestoreLawsuitFromTrash?: (id: string) => void;
    onArchiveLawsuit?: (id: string) => void;
    onRestoreArchivedLawsuit?: (id: string) => void;
    onPermanentlyDeleteLawsuits?: (ids: string[]) => void;
};

function TabLoadErrorFallback({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-red-400 font-bold text-sm">تعذّر تحميل هذا القسم</p>
            <p className="text-white/40 text-xs">تحقق من الاتصال ثم أعد المحاولة</p>
            <button
                type="button"
                onClick={onRetry}
                className="min-h-[44px] rounded-xl px-4 py-2 border border-[#E6C673]/40 text-[#E6C673] text-xs font-bold touch-manipulation"
            >
                إعادة المحاولة
            </button>
        </div>
    );
}

export function LawsuitsWorkspaceHost(props: LawsuitsWorkspaceHostProps): React.ReactElement {
    const {
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
    } = props;

    const [urgentLoadKey, setUrgentLoadKey] = useState(0);
    const lawsuitArchiveFiles = useMemo(() => allLawsuitFilesForArchive(files), [files]);

    const primeCivilArchive = useCallback(() => {
        prefetchArchivePortal();
        void loadArchivePortalModule().catch(() => undefined);
        prefetchLawyerNewCaseModule();
        prefetchSmartFileModalPhased();
    }, []);

    const primeUrgentTab = useCallback(() => {
        prefetchUrgentOrdersView();
    }, []);

    const retryUrgentLoad = useCallback(() => {
        resetUrgentOrdersViewPrefetch();
        resetActiveOrderFilePanelCache();
        prefetchUrgentOrdersView();
        setUrgentLoadKey((key) => key + 1);
    }, []);

    useEffect(() => {
        primeCivilArchive();
    }, [primeCivilArchive]);

    return (
        <LawsuitsWorkspaceShell
            defaultTab={defaultTab}
            onClose={onClose}
            onShellReady={primeCivilArchive}
            onUrgentTabIntent={primeUrgentTab}
            onTabChange={(tab) => {
                if (tab === 'civil') primeCivilArchive();
                if (tab === 'urgent') primeUrgentTab();
            }}
        >
            {(tab) => (
                <>
                    <div className={tab === 'civil' ? 'relative h-full min-h-0' : 'hidden'} aria-hidden={tab !== 'civil'}>
                        <div className="absolute inset-0 overflow-hidden">
                            <ErrorBoundary fallback={<TabLoadErrorFallback onRetry={primeCivilArchive} />}>
                                <ArchivePortalHost
                                    type="lawsuits"
                                    files={lawsuitArchiveFiles}
                                    criminalCases={criminalCases}
                                    theme={theme}
                                    shapeClass={shapeClass}
                                    onClose={onClose}
                                    onFileClick={onOpenFile}
                                    onAddAction={onAddNewCase}
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
                        <LawsuitsAddCaseFab onClick={onAddNewCase} onIntent={primeCivilArchive} />
                    </div>

                    <div
                        className={tab === 'urgent' ? 'h-full overflow-y-auto overscroll-y-contain touch-pan-y' : 'hidden'}
                        aria-hidden={tab !== 'urgent'}
                    >
                        <ErrorBoundary key={`urgent-${urgentLoadKey}`} fallback={<TabLoadErrorFallback onRetry={retryUrgentLoad} />}>
                            <Suspense fallback={<LawsuitsWorkspaceTabLoading label="جاري تحميل الطلبات المستعجلة..." />}>
                                <LazyViewUrgentAndOrdersDashboard
                                    embeddedInWorkspace
                                    focusCaseId={urgentFocusCaseId}
                                />
                            </Suspense>
                        </ErrorBoundary>
                    </div>
                </>
            )}
        </LawsuitsWorkspaceShell>
    );
}

if (typeof window !== 'undefined') {
    prefetchArchivePortal();
    prefetchLawyerNewCaseModule();
    prefetchSmartFileModalPhased();
}
