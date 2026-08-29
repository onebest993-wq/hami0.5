import React, { useCallback } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { ArchivePortalHost } from '@/app/components/lawyer/dashboard/ArchivePortalHost';
import type { ThemeConfig } from '@/app/types/common';
import {
    lawyerOverlayToArchivePortalType,
    resolveOpenableFileData,
    isRecord,
} from '@/app/components/lawyer/LawyerDashboardParts/utils';
import type { LawyerDashboardOverlaysBundleProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';

type Props = Pick<LawyerDashboardOverlaysBundleProps, 'shell' | 'data' | 'archive' | 'newCase'>;

/**
 * أرشيف غير التنفيذ — على MainView مباشرة.
 * مخزن التنفيذ له Entry مستقل.
 */
export function LawyerDashboardNonExecArchiveOverlayEntry({
    shell,
    data,
    archive,
    newCase,
}: Props): React.ReactElement | null {
    const { shapeClass, theme } = shell;
    const { files } = data;
    const { archiveType, setArchiveType, openArchiveFile, handleRestoreFile } = archive;
    const { openNormalNewCaseModal } = newCase;

    const closeArchive = useCallback(() => setArchiveType(null), [setArchiveType]);

    if (!archiveType || archiveType === 'execution') return null;

    return (
        <ArchivePortalHost
            type={lawyerOverlayToArchivePortalType(archiveType)}
            files={
                (archiveType === 'deleted'
                    ? files.filter((f) => f.status === 'deleted')
                    : files.filter((f) => f.status !== 'deleted')) as unknown as Parameters<
                    typeof ArchivePortalHost
                >[0]['files']
            }
            theme={theme as unknown as ThemeConfig}
            shapeClass={shapeClass}
            onClose={closeArchive}
            onFileClick={(f: unknown) => {
                if (isRecord(f) && f.type === 'execution') {
                    void openArchiveFile({ id: f.id, type: 'execution' });
                    return;
                }
                const resolved = resolveOpenableFileData(f, files);
                if (!resolved) {
                    SmartToast.error('تعذّر فتح الإضبارة — تحقق من بيانات الملف');
                    return;
                }
                if (archiveType === 'deleted') {
                    handleRestoreFile(resolved);
                } else if (openArchiveFile(resolved)) {
                    setArchiveType(null);
                }
            }}
            onAddAction={() => {
                openNormalNewCaseModal();
                setArchiveType(null);
            }}
            executionFilesHydrating={false}
            escapeEnabled={false}
        />
    );
}
