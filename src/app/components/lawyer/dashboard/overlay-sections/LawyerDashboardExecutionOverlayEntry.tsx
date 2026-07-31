import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ThemeConfig } from '@/app/types/common';
import type { ExecutionArchiveFile } from '@/app/types/common';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { ArchivePortalHost } from '@/app/components/lawyer/dashboard/ArchivePortalHost';
import type { LawyerDashboardOverlaysBundleProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';
import { isRecord } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import { prefetchExecutionCreationSurface } from '@/app/runtime/executionCreationLoader';
import {
    invalidateArchivePortalModuleCache,
    loadExecutionArchiveHubModule,
} from '@/app/runtime/hubArchiveLoader';
import {
    ensureExecutionArchiveOpenReady,
    resetExecutionArchiveOpenSession,
} from '@/app/runtime/executionArchiveOpenSession';

type Props = Pick<
    LawyerDashboardOverlaysBundleProps,
    'shell' | 'data' | 'archive' | 'executionCreate'
>;

function TabLoadErrorFallback({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-red-400 font-bold text-sm">تعذّر تحميل مخزن التنفيذ</p>
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

/**
 * محتوى مخزن التنفيذ فقط — القشرة keep-alive يملكها MainView (InstantChrome).
 */
export function LawyerDashboardExecutionOverlayEntry({
    shell,
    data,
    archive,
    executionCreate,
}: Props): React.ReactElement {
    const { setArchiveType, openArchiveFile } = archive;
    const closeArchive = useCallback(() => setArchiveType(null), [setArchiveType]);
    const [boundaryKey, setBoundaryKey] = useState(0);

    useEffect(() => {
        void ensureExecutionArchiveOpenReady();
        prefetchExecutionCreationSurface();
        // أثناء بقاء Host المخزن حيّاً: أكمل سلسلة أول paint للإضبارة
        void import('@/app/runtime/executionWorkspaceWarm')
            .then((m) => m.warmExecutionWorkspace({ includeSecondary: true, secondaryDelayMs: 0 }))
            .catch(() => undefined);
    }, []);

    const retry = useCallback(() => {
        resetExecutionArchiveOpenSession();
        invalidateArchivePortalModuleCache();
        void loadExecutionArchiveHubModule().catch(() => undefined);
        void ensureExecutionArchiveOpenReady();
        setBoundaryKey((key) => key + 1);
    }, []);

    const executionFiles = useMemo(
        () =>
            (Array.isArray(data.executionFiles) ? data.executionFiles : []) as unknown as ExecutionArchiveFile[],
        [data.executionFiles],
    );

    const lawsuitFilesForCluster = useMemo(
        () =>
            (Array.isArray(data.files) ? data.files : []).filter((f) => f.status !== 'deleted'),
        [data.files],
    );

    return (
        <ErrorBoundary key={boundaryKey} fallback={<TabLoadErrorFallback onRetry={retry} />}>
            <ArchivePortalHost
                type="executions"
                files={executionFiles}
                theme={shell.theme as unknown as ThemeConfig}
                shapeClass={shell.shapeClass}
                onClose={closeArchive}
                onFileClick={(f: unknown) => {
                    if (!isRecord(f)) return;
                    const id = f.id;
                    if (
                        !(
                            (typeof id === 'number' && Number.isFinite(id)) ||
                            (typeof id === 'string' && String(id).trim().length > 0)
                        )
                    ) {
                        return;
                    }
                    void Promise.resolve(openArchiveFile({ id, type: 'execution' }));
                }}
                onAddAction={() => {
                    void import('@/app/runtime/executionOpenContract').then((m) => {
                        m.openExecutionCreationWithContract(() => {
                            // الإبقاء على مخزن التنفيذ تحت نافذة الإنشاء — إغلاق الإنشاء يعيد إليه مباشرة
                            executionCreate.setIsExecutionModalOpen(true);
                        });
                    });
                }}
                lawsuitFilesForCluster={lawsuitFilesForCluster}
                onMoveExecutionToTrash={
                    archive.moveExecutionToTrash
                        ? (fileId: string | number) =>
                              archive.moveExecutionToTrash(String(fileId))
                        : undefined
                }
                onRestoreExecutionFromTrash={
                    archive.restoreExecutionFromTrash
                        ? (fileId: string | number) =>
                              archive.restoreExecutionFromTrash(String(fileId))
                        : undefined
                }
                onArchiveExecution={
                    archive.archiveExecution
                        ? (fileId: string | number) =>
                              archive.archiveExecution(String(fileId))
                        : undefined
                }
                onRestoreArchivedExecution={
                    archive.restoreArchivedExecution
                        ? (fileId: string | number) =>
                              archive.restoreArchivedExecution(String(fileId))
                        : undefined
                }
                onPermanentlyDeleteExecutions={
                    archive.permanentlyDeleteExecutions
                        ? (fileIds: Array<string | number>) =>
                              archive.permanentlyDeleteExecutions(fileIds.map(String))
                        : undefined
                }
                executionFilesHydrating={Boolean(data.executionFilesHydrating)}
                embedded
                hideHeader
                hideTopActionBar={false}
                loadingVariant="inline"
            />
        </ErrorBoundary>
    );
}
