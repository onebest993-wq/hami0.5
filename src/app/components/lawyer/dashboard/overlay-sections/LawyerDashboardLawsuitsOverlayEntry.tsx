import React, { Suspense, useCallback, useLayoutEffect, useRef } from 'react';
import { snapProfileShellClose } from '@/app/services/profile/profileShellSnap';
import { executeOverlaySnapClose } from '@/app/runtime/overlaySnapClose';
import { armHubLayerEnter, clearHubLayerClosing } from '@/app/runtime/overlayHubLayerMotion';
import { LAWSUITS_HUB_LAYER } from '@/app/runtime/overlayHubLayerSpecs';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ThemeConfig } from '@/app/types/common';
import type { LawyerDashboardOverlaysBundleProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';
import { LawsuitsWorkspaceInstantChrome } from '@/app/components/lawyer/dashboard/LawsuitsWorkspaceInstantChrome';
import { LazyLawsuitsWorkspaceHost } from '@/app/components/lawyer/dashboard/lawsuitsWorkspaceHostLazy';
import { SmartToast } from '@/app/components/ui/SmartToast';

type Props = Pick<
    LawyerDashboardOverlaysBundleProps,
    'shell' | 'data' | 'overlays' | 'archive' | 'criminalBridge' | 'newCase' | 'dossier'
>;

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
    dossier,
}: Props): React.ReactElement | null {
    const visible = overlays.showLawsuitsWorkspace;
    const closingRef = useRef(false);
    const shouldMount = visible || overlays.lawsuitsHostMounted;
    const lawsuitDossierOpen =
        Boolean(dossier.activeFile) && dossier.activeFile?.type !== 'execution';
    const retainArchive =
        newCase.isNewCaseModalOpen ||
        lawsuitDossierOpen ||
        Boolean(overlays.criminalDashboardCaseId);

    useLayoutEffect(() => {
        if (typeof document === 'undefined') return;
        if (!visible) {
            document.documentElement.removeAttribute(LAWSUITS_HUB_LAYER.openAttr);
            return;
        }
        document.documentElement.setAttribute(LAWSUITS_HUB_LAYER.openAttr, '1');
        armHubLayerEnter(LAWSUITS_HUB_LAYER);
        void LazyLawsuitsWorkspaceHost.preload();
        void import('@/app/runtime/hubArchiveLoader')
            .then((m) => m.prefetchLawsuitArchiveHubModule())
            .catch(() => undefined);
        void import('@/app/runtime/lawsuitOpenContract')
            .then((m) => m.prepareLawsuitDossierChrome())
            .catch(() => undefined);
    }, [visible]);

    const closeLawsuitsWorkspace = useCallback(() => {
        if (closingRef.current) return;
        closingRef.current = true;
        executeOverlaySnapClose({
            conceal: () => {
                snapProfileShellClose();
                if (typeof document !== 'undefined') {
                    document.documentElement.removeAttribute(LAWSUITS_HUB_LAYER.openAttr);
                }
                clearHubLayerClosing(LAWSUITS_HUB_LAYER);
            },
            commit: () => {
                overlays.setShowLawsuitsWorkspace(false);
                overlays.setUrgentFocusCaseId(undefined);
                closingRef.current = false;
            },
        });
    }, [overlays]);

    const handleOpenFile = useCallback(
        (f: unknown) => {
            void Promise.resolve(archive.openArchiveFile(f)).then((opened) => {
                if (!opened) return;
                /* بلا أنيميشن إغلاق المخزن — يبقى ظاهراً حتى تُرسم الإضبارة */
                overlays.markLawsuitDossierOpenedFromWorkspace();
            });
        },
        [archive, overlays],
    );

    if (!shouldMount) return null;

    return (
        <Suspense
            fallback={
                /* أثناء التسخين المخفي: لا تُظهر InstantChrome فوق اللوحة */
                visible ? (
                    <LawsuitsWorkspaceInstantChrome
                        onExitToHome={overlays.exitToHomeDashboard}
                        defaultTab={overlays.lawsuitsWorkspaceTab}
                        filesHydrating={Boolean(data.lawsuitFilesHydrating)}
                    />
                ) : null
            }
        >
            <LazyLawsuitsWorkspaceHost
                key="lawsuits-workspace"
                active={visible && !overlays.criminalDashboardCaseId}
                retainArchive={retainArchive || overlays.lawsuitsHostMounted}
                escapeEnabled={visible && !overlays.criminalDashboardCaseId && !lawsuitDossierOpen}
                files={data.files as FileData[]}
                lawsuitLifecycleCounts={data.lawsuitLifecycleCounts}
                lawsuitArchivedFiles={data.lawsuitArchivedFiles as FileData[] | null}
                lawsuitTrashFiles={data.lawsuitTrashFiles as FileData[] | null}
                onEnsureLawsuitArchivedLoaded={data.ensureLawsuitArchivedLoaded}
                onEnsureLawsuitTrashLoaded={data.ensureLawsuitTrashLoaded}
                lawsuitFilesHydrating={Boolean(data.lawsuitFilesHydrating)}
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
                onDeleteCriminalCase={(id: string) => {
                    if (!criminalBridge.ready) {
                        SmartToast.error('جاري تحميل النظام الجزائي — أعد المحاولة بعد لحظات');
                        return false;
                    }
                    const ok = criminalBridge.deleteCriminalCase(id);
                    if (!ok) {
                        SmartToast.error('تعذر حذف الإضبارة — تحقق من الصلاحية أو أعد المحاولة');
                    }
                    return ok;
                }}
                onOpenFile={handleOpenFile}
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
