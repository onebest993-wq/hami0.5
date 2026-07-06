import React, { memo, Suspense } from 'react';
import type { LawyerDashboardOverlaysHostProps } from './lawyerDashboardOverlaysHostBundles';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

const LazyLawyerDashboardProductivityOverlays = lazyWithRetry(() =>
    import('./overlay-sections/LawyerDashboardProductivityOverlays').then((m) => ({
        default: m.LawyerDashboardProductivityOverlays as unknown as LazyComponent,
    })),
);

const LazyLawyerDashboardCaseOverlays = lazyWithRetry(() =>
    import('./overlay-sections/LawyerDashboardCaseOverlays').then((m) => ({
        default: m.LawyerDashboardCaseOverlays as unknown as LazyComponent,
    })),
);

const LazyLawyerDashboardDiscoveryOverlays = lazyWithRetry(() =>
    import('./overlay-sections/LawyerDashboardDiscoveryOverlays').then((m) => ({
        default: m.LawyerDashboardDiscoveryOverlays as unknown as LazyComponent,
    })),
);

export type { LawyerDashboardOverlaysHostProps } from './lawyerDashboardOverlaysHostBundles';

export const LawyerDashboardOverlaysHost = memo(function LawyerDashboardOverlaysHost(
    props: LawyerDashboardOverlaysHostProps,
) {
    const productivityVisible =
        props.overlays.fieldTasksSheetOpen ||
        props.overlays.fieldTasksHostMounted ||
        props.overlays.showTasksManager ||
        props.overlays.fieldTasksManagerHostMounted ||
        props.overlays.showSettings ||
        props.overlays.settingsHostMounted ||
        props.overlays.isNotepadOpen ||
        props.overlays.repositoryHostMounted ||
        props.overlays.showTransactions ||
        props.overlays.transactionsHostMounted;

    const caseVisible =
        Boolean(props.dossier.activeFile) ||
        Boolean(props.archive.archiveType) ||
        props.newCase.isNewCaseModalOpen ||
        props.executionCreate.isExecutionModalOpen ||
        props.overlays.showLawsuitsWorkspace ||
        props.dossier.consolidationNavActive ||
        Boolean(props.dossier.caseLinkNav) ||
        Boolean(props.dossier.consolidationSpawnNav);

    const discoveryVisible =
        Boolean(props.overlays.criminalDashboardCaseId) ||
        props.overlays.showGlobalSearch ||
        props.overlays.showCommunity;

    return (
        <>
            {productivityVisible ? (
                <Suspense fallback={null}>
                    <LazyLawyerDashboardProductivityOverlays
                        shell={props.shell}
                        data={props.data}
                        overlays={props.overlays}
                        notepad={props.notepad}
                        nav={props.nav}
                        dossier={props.dossier}
                        archive={props.archive}
                    />
                </Suspense>
            ) : null}
            {caseVisible ? (
                <Suspense fallback={null}>
                    <LazyLawyerDashboardCaseOverlays
                        shell={props.shell}
                        data={props.data}
                        overlays={props.overlays}
                        criminalBridge={props.criminalBridge}
                        dossier={props.dossier}
                        archive={props.archive}
                        newCase={props.newCase}
                        executionCreate={props.executionCreate}
                        nav={props.nav}
                    />
                </Suspense>
            ) : null}
            {discoveryVisible ? (
                <Suspense fallback={null}>
                    <LazyLawyerDashboardDiscoveryOverlays
                        shell={props.shell}
                        data={props.data}
                        overlays={props.overlays}
                        criminalBridge={props.criminalBridge}
                        nav={props.nav}
                    />
                </Suspense>
            ) : null}
        </>
    );
});
