import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import type { ThemeConfig } from '@/app/types/common';
import type { ExecutionArchiveFile } from '@/app/types/common';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { ExecutionArchiveInstantBody } from '@/app/components/lawyer/dashboard/ExecutionArchiveInstantBody';
import type { LawyerDashboardOverlaysBundleProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';
import { prefetchExecutionCreationSurface } from '@/app/runtime/executionCreationLoader';
import { openExecutionCreationWithContract } from '@/app/runtime/executionOpenContract';
import { getCachedExecutionSurface } from '@/app/runtime/hubArchiveLoader';
import {
    ensureExecutionArchiveOpenReady,
    resetExecutionArchiveOpenSession,
} from '@/app/runtime/executionArchiveOpenSession';

const LazyArchivePortalExecutionSurface = lazy(() =>
    import('@/app/components/lawyer/ArchivePortal/ArchivePortalExecutionSurface').then((m) => ({
        default: m.ArchivePortalExecutionSurface,
    })),
);

type Props = Pick<
    LawyerDashboardOverlaysBundleProps,
    'shell' | 'data' | 'archive' | 'executionCreate'
> & {
    onCloseArchive?: () => void;
};

function isArchiveClickRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

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
 * Surface كسول؛ InstantBody يغطي الانتظار بتوأم هندسي للإطار (بلا شريط تفاعلي).
 */
export function LawyerDashboardExecutionOverlayEntry({
    shell,
    data,
    archive,
    executionCreate,
    onCloseArchive,
}: Props): React.ReactElement {
    const { setArchiveType, openArchiveFile } = archive;
    const closeArchive = useCallback(
        () => (onCloseArchive ? onCloseArchive() : setArchiveType(null)),
        [onCloseArchive, setArchiveType],
    );
    const [boundaryKey, setBoundaryKey] = useState(0);

    useEffect(() => {
        void ensureExecutionArchiveOpenReady();
        let cancelled = false;
        const warmDossierAfterStorePaint = () => {
            if (cancelled) return;
            prefetchExecutionCreationSurface();
            void import('@/app/runtime/executionWorkspaceWarm')
                .then((m) =>
                    m.warmExecutionWorkspace({
                        includeSecondary: true,
                        secondaryDelayMs: 0,
                    }),
                )
                .catch(() => undefined);
        };
        if (typeof requestIdleCallback !== 'undefined') {
            const idleId = requestIdleCallback(warmDossierAfterStorePaint, { timeout: 1_200 });
            return () => {
                cancelled = true;
                cancelIdleCallback(idleId);
            };
        }
        const timeoutId = window.setTimeout(warmDossierAfterStorePaint, 400);
        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, []);

    const retry = useCallback(() => {
        resetExecutionArchiveOpenSession();
        void ensureExecutionArchiveOpenReady();
        setBoundaryKey((key) => key + 1);
    }, []);

    const openCreate = useCallback(() => {
        openExecutionCreationWithContract(() => {
            executionCreate.setIsExecutionModalOpen(true);
        });
    }, [executionCreate]);

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

    const onFileClick = useCallback(
        (f: unknown) => {
            if (!isArchiveClickRecord(f)) return;
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
        },
        [openArchiveFile],
    );

    const surfaceProps = {
        type: 'executions' as const,
        files: executionFiles,
        theme: shell.theme as unknown as ThemeConfig,
        shapeClass: shell.shapeClass,
        onClose: closeArchive,
        onFileClick,
        onAddAction: openCreate,
        lawsuitFilesForCluster,
        onMoveExecutionToTrash: archive.moveExecutionToTrash
            ? (fileId: string | number) => archive.moveExecutionToTrash(String(fileId))
            : undefined,
        onRestoreExecutionFromTrash: archive.restoreExecutionFromTrash
            ? (fileId: string | number) => archive.restoreExecutionFromTrash(String(fileId))
            : undefined,
        onArchiveExecution: archive.archiveExecution
            ? (fileId: string | number) => archive.archiveExecution(String(fileId))
            : undefined,
        onRestoreArchivedExecution: archive.restoreArchivedExecution
            ? (fileId: string | number) => archive.restoreArchivedExecution(String(fileId))
            : undefined,
        onPermanentlyDeleteExecutions: archive.permanentlyDeleteExecutions
            ? (fileIds: Array<string | number>) =>
                  archive.permanentlyDeleteExecutions(fileIds.map(String))
            : undefined,
        executionFilesHydrating: Boolean(data.executionFilesHydrating),
        embedded: true,
        hideHeader: true,
        hideTopActionBar: false,
    };

    const CachedSurface = getCachedExecutionSurface();
    const surface = CachedSurface ? (
        <CachedSurface {...surfaceProps} />
    ) : (
        <Suspense fallback={<ExecutionArchiveInstantBody onAddAction={openCreate} />}>
            <LazyArchivePortalExecutionSurface {...surfaceProps} />
        </Suspense>
    );

    return (
        <ErrorBoundary key={boundaryKey} fallback={<TabLoadErrorFallback onRetry={retry} />}>
            {surface}
        </ErrorBoundary>
    );
}
