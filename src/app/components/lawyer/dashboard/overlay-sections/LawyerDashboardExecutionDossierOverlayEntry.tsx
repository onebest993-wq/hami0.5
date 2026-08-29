import React, { Suspense, useCallback, useEffect } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { LawyerDashboardOverlaysBundleProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';
import { setExecutionDossierNavHandlers } from '@/app/components/lawyer/ExecutionDashboard/utils/executionDossierNavRegistry';
import { LazyExecutionDashboardPortal } from '@/app/components/lawyer/dashboard/executionDashboardPortalLazy';
import { ExecutionDossierInstantPaintCover } from '@/app/components/lawyer/dashboard/ExecutionDossierInstantPaintCover';

type Props = Pick<LawyerDashboardOverlaysBundleProps, 'dossier' | 'archive'> & {
    file: FileData;
    open: boolean;
};

/**
 * إضبارة التنفيذ — Entry متزامن.
 * السهم: رجوع للأرشيف | X: مغادرة نهائية للصفحة الرئيسية
 */
export function LawyerDashboardExecutionDossierOverlayEntry({
    dossier,
    archive,
    file,
    open,
}: Props): React.ReactElement {
    const { setActiveFile, handleUpdateExecutionFile } = dossier;
    const { setArchiveType } = archive;

    const backToArchive = useCallback(() => setActiveFile(null), [setActiveFile]);
    const exitToHome = useCallback(() => {
        setActiveFile(null);
        setArchiveType(null);
    }, [setActiveFile, setArchiveType]);

    useEffect(() => {
        setExecutionDossierNavHandlers({ backToArchive, exitToHome });
        return () => setExecutionDossierNavHandlers(null);
    }, [backToArchive, exitToHome]);

    const onUpdate = (next: FileData) =>
        handleUpdateExecutionFile(
            next as unknown as Parameters<typeof handleUpdateExecutionFile>[0],
        );

    const portalProps = {
        file,
        onClose: backToArchive,
        onExitToHome: exitToHome,
        onUpdate,
        open,
    };

    if (LazyExecutionDashboardPortal.isPreloaded()) {
        return <LazyExecutionDashboardPortal {...portalProps} />;
    }

    return (
        <Suspense
            fallback={
                <ExecutionDossierInstantPaintCover file={file} onExitToHome={exitToHome} />
            }
        >
            <LazyExecutionDashboardPortal {...portalProps} />
        </Suspense>
    );
}
