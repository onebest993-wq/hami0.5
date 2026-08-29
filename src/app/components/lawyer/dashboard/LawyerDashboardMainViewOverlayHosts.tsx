import React, { Suspense, lazy, memo, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { CRIMINAL_MODAL_Z } from '@/app/components/lawyer/criminal-system/criminalModalPortal';
import { HAMI_OVERLAY_SAFE_INSETS_CLASS } from '@/app/utils/overlayPortal';
import type { LawyerDashboardOverlaysBundleProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';
import { SmartFileModalBootChrome } from '@/app/components/lawyer/dashboard/SmartFileModalBootChrome';
import { ExecutionArchiveInstantPaintCover } from '@/app/components/lawyer/dashboard/ExecutionArchiveInstantPaintCover';
import { ExecutionDossierInstantPaintCover } from '@/app/components/lawyer/dashboard/ExecutionDossierInstantPaintCover';
import { useKeepAliveIdleRelease } from '@/app/hooks/lawyerDashboard/useKeepAliveIdleRelease';
import {
    LazyCommunityOverlayEntry,
    LazyExecutionOverlayEntry,
    LazyNonExecArchiveOverlayEntry,
    LazyExecutionDossierOverlayEntry,
    LazyExecutionCreateOverlayEntry,
    LazySmartFileOverlayEntry,
    LazyNewCaseOverlayEntry,
    LazyConsolidationNavOverlayEntry,
    LazyLawsuitsOverlayEntry,
    LazyCriminalOverlayEntry,
    LazyRepositoryOverlayEntry,
    LazyTransactionsOverlayEntry,
    LazyFieldTasksOverlayEntry,
    LazyGlobalSearchOverlayEntry,
} from './LawyerDashboardMainView.lazyEntries';

const LazyExecutionArchiveInstantChrome = lazy(() =>
    import('@/app/components/lawyer/dashboard/ExecutionArchiveInstantChrome').then((m) => ({
        default: m.ExecutionArchiveInstantChrome,
    })),
);

const LazyCriminalDashboardBootChrome = lazy(() =>
    import('@/app/components/lawyer/criminal-system/CriminalDashboardBootChrome').then((m) => ({
        default: m.CriminalDashboardBootChrome,
    })),
);

const LazyGlobalSearchInstantPaintCover = lazy(() =>
    import('@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchInstantPaintCover').then((m) => ({
        default: m.GlobalSearchInstantPaintCover,
    })),
);

export type LawyerDashboardMainViewOverlayHostsProps = {
    overlaysBundle: LawyerDashboardOverlaysBundleProps;
    communityLive: boolean;
    executionLive: boolean;
    executionArchiveOpen: boolean;
    nonExecArchiveLive: boolean;
    executionDossierOverlayLive: boolean;
    executionDossierLive: FileData | null;
    executionCreateLive: boolean;
    smartFileLive: boolean;
    newCaseLive: boolean;
    consolidationNavLive: boolean;
    lawsuitsLive: boolean;
    criminalLive: boolean;
    repositoryLive: boolean;
    transactionsLive: boolean;
    fieldTasksLive: boolean;
    globalSearchLive: boolean;
    closeExecutionArchive: () => void;
    closeExecutionCreate?: () => void;
    executionCreateCloseGuard?: boolean;
};

/**
 * طبقات الـ overlays الكسولة لـ MainView — مجاورة community→execution تبقى هنا لقفل honesty.
 */
export const LawyerDashboardMainViewOverlayHosts = memo(function LawyerDashboardMainViewOverlayHosts({
    overlaysBundle,
    communityLive,
    executionLive,
    executionArchiveOpen,
    nonExecArchiveLive,
    executionDossierOverlayLive,
    executionDossierLive,
    executionCreateLive,
    smartFileLive,
    newCaseLive,
    consolidationNavLive,
    lawsuitsLive,
    criminalLive,
    repositoryLive,
    transactionsLive,
    fieldTasksLive,
    globalSearchLive,
    closeExecutionArchive,
    closeExecutionCreate,
    executionCreateCloseGuard = false,
}: LawyerDashboardMainViewOverlayHostsProps) {
    const smartFileBootFile =
        overlaysBundle.dossier.activeFile &&
        overlaysBundle.dossier.activeFile.type !== 'execution'
            ? (overlaysBundle.dossier.activeFile as FileData)
            : null;
    const lawsuitDossierOpen = smartFileBootFile != null;
    const [smartFileHeld, setSmartFileHeld] = useState(false);
    useLayoutEffect(() => {
        if (lawsuitDossierOpen) setSmartFileHeld(true);
    }, [lawsuitDossierOpen]);
    useKeepAliveIdleRelease(lawsuitDossierOpen, () => setSmartFileHeld(false));
    const smartFileSurfaceLive = lawsuitDossierOpen || smartFileHeld;

    const closeSmartFileBoot = () => {
        overlaysBundle.dossier.clearCaseLinkBrowse?.();
        overlaysBundle.overlays.returnFromLawsuitDossier();
        overlaysBundle.dossier.setActiveFile(null);
    };

    const smartFileOverlay = (
        <LazySmartFileOverlayEntry
            shell={overlaysBundle.shell}
            data={overlaysBundle.data}
            dossier={overlaysBundle.dossier}
            overlays={overlaysBundle.overlays}
            newCase={overlaysBundle.newCase}
            nav={overlaysBundle.nav}
            archive={overlaysBundle.archive}
        />
    );

    const smartFileBootFallback =
        smartFileBootFile != null ? (
            <SmartFileModalBootChrome file={smartFileBootFile} onClose={closeSmartFileBoot} />
        ) : null;

    return (
        <>
            {/* منتدى الزملاء — كسول + تسخين؛ الفتح ينتظر المقطع قبل التركيب */}
            {communityLive ? (
                <Suspense fallback={null}>
                    <LazyCommunityOverlayEntry
                        shell={overlaysBundle.shell}
                        overlays={overlaysBundle.overlays}
                    />
                </Suspense>
            ) : null}

            {/* مخزن التنفيذ — InstantChrome كسول (يُسخَّن مع prefetch فتح الأرشيف) */}
            {executionLive ? (
                <Suspense
                    fallback={
                        executionArchiveOpen ? (
                            <ExecutionArchiveInstantPaintCover
                                onClose={closeExecutionArchive}
                                onAddNew={() => {
                                    overlaysBundle.executionCreate.setIsExecutionModalOpen(true);
                                }}
                            />
                        ) : null
                    }
                >
                    <LazyExecutionArchiveInstantChrome
                        open={executionArchiveOpen}
                        onClose={closeExecutionArchive}
                        contentInteractive={!executionCreateLive && !executionCreateCloseGuard}
                        onAddNew={() => {
                            overlaysBundle.executionCreate.setIsExecutionModalOpen(true);
                        }}
                    >
                        <LazyExecutionOverlayEntry
                            shell={overlaysBundle.shell}
                            data={overlaysBundle.data}
                            archive={overlaysBundle.archive}
                            executionCreate={overlaysBundle.executionCreate}
                            onCloseArchive={closeExecutionArchive}
                        />
                    </LazyExecutionArchiveInstantChrome>
                </Suspense>
            ) : null}

            {executionCreateCloseGuard && !executionCreateLive && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          data-testid="execution-create-close-pointer-shield"
                          aria-hidden="true"
                          style={{ position: 'fixed', inset: 0, zIndex: 10100 }}
                          onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                          }}
                          onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                          }}
                      />,
                      document.body,
                  )
                : null}

            {/* أرشيف غير التنفيذ + طلبات العملاء */}
            {nonExecArchiveLive ? (
                <Suspense fallback={null}>
                    <LazyNonExecArchiveOverlayEntry
                        shell={overlaysBundle.shell}
                        data={overlaysBundle.data}
                        archive={overlaysBundle.archive}
                        newCase={overlaysBundle.newCase}
                    />
                </Suspense>
            ) : null}

            {/* إضبارة التنفيذ — PaintCover فوري إن علّق الـ Entry؛ بلا فراغ fallback={null} */}
            {executionDossierOverlayLive && executionDossierLive ? (
                <Suspense
                    fallback={
                        <ExecutionDossierInstantPaintCover
                            file={executionDossierLive}
                            onExitToHome={() => {
                                overlaysBundle.dossier.setActiveFile(null);
                                overlaysBundle.archive.setArchiveType(null);
                            }}
                        />
                    }
                >
                    <LazyExecutionDossierOverlayEntry
                        dossier={overlaysBundle.dossier}
                        archive={overlaysBundle.archive}
                        file={executionDossierLive}
                        open
                    />
                </Suspense>
            ) : null}

            {/* إنشاء تنفيذ — يُركَّب مع تسليح المخزن حتى لا ينتظر chunk بعد النقرة */}
            {executionLive || executionCreateLive ? (
                <Suspense fallback={null}>
                    <LazyExecutionCreateOverlayEntry
                        archive={overlaysBundle.archive}
                        executionCreate={overlaysBundle.executionCreate}
                        onCloseCreate={closeExecutionCreate}
                    />
                </Suspense>
            ) : null}

            {/* إضبارة الدعوى SmartFile — BootChrome فوري إن علّق الـ Entry؛ preload-aware يمنع الوميض */}
            {smartFileLive || smartFileSurfaceLive ? (
                <Suspense
                    fallback={
                        overlaysBundle.overlays.showLawsuitsWorkspace ? null : smartFileBootFallback
                    }
                >
                    {smartFileOverlay}
                </Suspense>
            ) : null}

            {/* دعوى جديدة */}
            {newCaseLive ? (
                <Suspense fallback={null}>
                    <LazyNewCaseOverlayEntry
                        overlays={overlaysBundle.overlays}
                        newCase={overlaysBundle.newCase}
                        dossier={overlaysBundle.dossier}
                    />
                </Suspense>
            ) : null}

            {/* شريط توحيد/ربط الدعاوى — lazy (مسار نادر؛ لا يثقل stem) */}
            {consolidationNavLive ? (
                <Suspense fallback={null}>
                    <LazyConsolidationNavOverlayEntry dossier={overlaysBundle.dossier} />
                </Suspense>
            ) : null}

            {/* مساحة الدعاوى — Entry كسول؛ Host lazy داخل Entry مع InstantChrome */}
            {lawsuitsLive ? (
                <Suspense fallback={null}>
                    <LazyLawsuitsOverlayEntry
                        shell={overlaysBundle.shell}
                        data={overlaysBundle.data}
                        overlays={overlaysBundle.overlays}
                        archive={overlaysBundle.archive}
                        criminalBridge={overlaysBundle.criminalBridge}
                        newCase={overlaysBundle.newCase}
                        dossier={overlaysBundle.dossier}
                    />
                </Suspense>
            ) : null}

            {/* الإضبارة الجنائية — BootChrome كسول أثناء تحميل Entry */}
            {criminalLive ? (
                <Suspense
                    fallback={
                        <div
                            className={`fixed inset-0 flex flex-col overflow-hidden bg-slate-900 print:bg-white ${HAMI_OVERLAY_SAFE_INSETS_CLASS}`}
                            style={{ zIndex: CRIMINAL_MODAL_Z.shell }}
                            data-testid="criminal-dashboard-portal"
                            aria-busy="true"
                            aria-label="جاري فتح الإضبارة الجزائية"
                        >
                            <Suspense fallback={null}>
                                <LazyCriminalDashboardBootChrome
                                    caseId={String(overlaysBundle.overlays.criminalDashboardCaseId ?? '')}
                                    onClose={overlaysBundle.overlays.closeCriminalCase}
                                    onExitToHome={overlaysBundle.overlays.exitToHomeDashboard}
                                />
                            </Suspense>
                        </div>
                    }
                >
                    <LazyCriminalOverlayEntry
                        overlays={overlaysBundle.overlays}
                        criminalBridge={overlaysBundle.criminalBridge}
                    />
                </Suspense>
            ) : null}

            {/* المستودع الذكي — Host دافئ من مُرطِّب الإقلاع */}
            {repositoryLive ? (
                <Suspense fallback={null}>
                    <LazyRepositoryOverlayEntry
                        shell={overlaysBundle.shell}
                        data={overlaysBundle.data}
                        overlays={overlaysBundle.overlays}
                        notepad={overlaysBundle.notepad}
                        dossier={overlaysBundle.dossier}
                    />
                </Suspense>
            ) : null}

            {/* مركز المعاملات — Entry عند الفتح فقط */}
            {transactionsLive ? (
                <Suspense fallback={null}>
                    <LazyTransactionsOverlayEntry
                        shell={overlaysBundle.shell}
                        overlays={overlaysBundle.overlays}
                    />
                </Suspense>
            ) : null}

            {/* مهام الميدان + الأجندة — Entry sync مثل المعاملات؛ Host دافئ؛ chunk الستارة يُسخَّن مسبقاً */}
            {fieldTasksLive ? (
                <Suspense fallback={null}>
                    <LazyFieldTasksOverlayEntry
                        data={overlaysBundle.data}
                        overlays={overlaysBundle.overlays}
                    />
                </Suspense>
            ) : null}

            {/*
             * البحث الشامل — Entry كسول (حجم الجذع)، لكن عند الفتح الحقيقي
             * Suspense يعرض InstantPaintCover فوراً بدل fallback={null} الذي يترك
             * Android WebView على ستارة/فراغ حتى يكتمل chunk الـ Entry.
             */}
            {globalSearchLive ? (
                <Suspense
                    fallback={
                        overlaysBundle.overlays.showGlobalSearch ? (
                            <Suspense fallback={null}>
                                <LazyGlobalSearchInstantPaintCover
                                    onClose={overlaysBundle.nav.closeGlobalSearch}
                                />
                            </Suspense>
                        ) : null
                    }
                >
                    <LazyGlobalSearchOverlayEntry
                        shell={overlaysBundle.shell}
                        data={overlaysBundle.data}
                        overlays={overlaysBundle.overlays}
                        nav={overlaysBundle.nav}
                    />
                </Suspense>
            ) : null}
        </>
    );
});
