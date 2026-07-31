import React, { Suspense, useCallback } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ThemeConfig } from '@/app/types/common';
import type { LawyerDashboardOverlaysBundleProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';
import { LawsuitsWorkspaceInstantChrome } from '@/app/components/lawyer/dashboard/LawsuitsWorkspaceInstantChrome';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

type Props = Pick<
    LawyerDashboardOverlaysBundleProps,
    'shell' | 'data' | 'overlays' | 'archive' | 'criminalBridge' | 'newCase'
>;

const LazyLawsuitsWorkspaceHost = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/LawsuitsWorkspaceHost').then((m) => ({
        default: m.LawsuitsWorkspaceHost as unknown as LazyComponent,
    })),
);

/**
 * مساحة الدعاوى — Entry متزامن على MainView (مثل إضبارة التنفيذ).
 * Host/Archive يُحمَّلان lazy؛ InstantChrome يغطي أول نقرة بلا شاشة نص فارغة.
 * تبقى مركَّبة بعد أول فتح (keep-alive) حتى لا يتكرر تأخير التحميل عند كل عودة.
 */
export function LawyerDashboardLawsuitsOverlayEntry({
    shell,
    data,
    overlays,
    archive,
    criminalBridge,
    newCase,
}: Props): React.ReactElement | null {
    const visible = overlays.showLawsuitsWorkspace;
    const shouldMount = visible || overlays.lawsuitsHostMounted;

    const closeLawsuitsWorkspace = useCallback(() => {
        overlays.setShowLawsuitsWorkspace(false);
        overlays.setUrgentFocusCaseId(undefined);
    }, [overlays]);

    if (!shouldMount) return null;

    return (
        <Suspense
            fallback={
                /* أثناء التسخين المخفي: لا تُظهر InstantChrome فوق اللوحة */
                visible ? (
                    <LawsuitsWorkspaceInstantChrome
                onClose={closeLawsuitsWorkspace}
                onExitToHome={overlays.exitToHomeDashboard}
                defaultTab={overlays.lawsuitsWorkspaceTab}
                    />
                ) : null
            }
        >
            <LazyLawsuitsWorkspaceHost
                key="lawsuits-workspace"
                active={visible}
                escapeEnabled={visible && !overlays.criminalDashboardCaseId}
                files={data.files as FileData[]}
                criminalCases={data.criminalCasesForCluster}
                theme={shell.theme as unknown as ThemeConfig}
                shapeClass={shell.shapeClass}
                defaultTab={overlays.lawsuitsWorkspaceTab}
                urgentFocusCaseId={overlays.urgentFocusCaseId}
                initialDossierSection={overlays.lawsuitsDossierSection}
                onClose={closeLawsuitsWorkspace}
                onOpenCriminalCase={(id: string) => {
                    overlays.openCriminalCase(id, { fromLawsuitsWorkspace: true });
                }}
                onDeleteCriminalCase={(id: string) => criminalBridge.deleteCriminalCase(id)}
                onOpenFile={(f: unknown) => {
                    void Promise.resolve(archive.openArchiveFile(f)).then((opened) => {
                        if (opened) closeLawsuitsWorkspace();
                    });
                }}
                onAddNewCase={() => {
                    newCase.openNormalNewCaseModal();
                }}
                onMoveLawsuitToTrash={archive.moveLawsuitToTrash}
                onRestoreLawsuitFromTrash={archive.restoreLawsuitFromTrash}
                onArchiveLawsuit={archive.archiveLawsuit}
                onRestoreArchivedLawsuit={archive.restoreArchivedLawsuit}
                onPermanentlyDeleteLawsuits={archive.permanentlyDeleteLawsuits}
                onExitToHome={overlays.exitToHomeDashboard}
            />
        </Suspense>
    );
}
