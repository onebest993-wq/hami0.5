// @ts-nocheck
import React, { useEffect } from 'react';
import type { ThemeConfig } from '@/app/types/common';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { loadArchivePortalModule } from '@/app/runtime/hubArchiveLoader';
import { ArchivePortalHost } from './ArchivePortalHost';
import { ExecutionArchiveShell, ExecutionArchiveTabLoading } from './ExecutionArchiveShell';

type ExecutionArchiveOverlayHostProps = {
    files: unknown[];
    lawsuitFilesForCluster: unknown[];
    theme: ThemeConfig;
    shapeClass: string;
    executionFilesHydrating: boolean;
    onClose: () => void;
    onFileClick: (file: unknown) => void;
    onAddAction: () => void;
    onMoveExecutionToTrash?: (id: string) => void;
    onRestoreExecutionFromTrash?: (id: string) => void;
    onArchiveExecution?: (id: string) => void;
    onRestoreArchivedExecution?: (id: string) => void;
    onPermanentlyDeleteExecutions?: (ids: string[]) => void;
};

function TabLoadErrorFallback({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-red-400 font-bold text-sm">تعذّر تحميل مخزن التنفيذ</p>
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

export function ExecutionArchiveOverlayHost(props: ExecutionArchiveOverlayHostProps): React.ReactElement {
    const {
        files,
        lawsuitFilesForCluster,
        theme,
        shapeClass,
        executionFilesHydrating,
        onClose,
        onFileClick,
        onAddAction,
        onMoveExecutionToTrash,
        onRestoreExecutionFromTrash,
        onArchiveExecution,
        onRestoreArchivedExecution,
        onPermanentlyDeleteExecutions,
    } = props;

    const primeArchive = () => {
        void loadArchivePortalModule().catch(() => undefined);
    };

    useEffect(() => {
        primeArchive();
    }, []);

    return (
        <ExecutionArchiveShell onClose={onClose}>
            <ErrorBoundary fallback={<TabLoadErrorFallback onRetry={primeArchive} />}>
                <ArchivePortalHost
                    type="executions"
                    files={files}
                    theme={theme}
                    shapeClass={shapeClass}
                    onClose={onClose}
                    onFileClick={onFileClick}
                    onAddAction={onAddAction}
                    lawsuitFilesForCluster={lawsuitFilesForCluster}
                    onMoveExecutionToTrash={onMoveExecutionToTrash}
                    onRestoreExecutionFromTrash={onRestoreExecutionFromTrash}
                    onArchiveExecution={onArchiveExecution}
                    onRestoreArchivedExecution={onRestoreArchivedExecution}
                    onPermanentlyDeleteExecutions={onPermanentlyDeleteExecutions}
                    executionFilesHydrating={executionFilesHydrating}
                    embedded
                    hideHeader
                    hideTopActionBar={false}
                    loadingVariant="inline"
                />
            </ErrorBoundary>
        </ExecutionArchiveShell>
    );
}