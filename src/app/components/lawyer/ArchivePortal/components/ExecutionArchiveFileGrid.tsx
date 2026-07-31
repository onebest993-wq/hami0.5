import React, { memo } from 'react';
import { Clock } from 'lucide-react';
import type { ArchivePortalProps } from '@/app/types/common';
import ExecutionSmartCard from './ExecutionSmartCard';
import { ArchiveVirtualGrid } from './ArchiveVirtualGrid';
import type { LooseArchiveFile, ArchiveEnrichedRow } from '../types';
import type { ExecutionArchiveFilter } from './ExecutionArchiveToolbar';
import type { ExecutionPerspectiveFilter, ExecutionViewMode } from '../executionArchiveFilterUtils';
import { useExecutionArchiveCardLiveRevision } from '../hooks/useExecutionArchiveCardLiveRevision';

export type ExecutionArchiveFileGridProps = {
    enrichedFiles: ArchiveEnrichedRow[];
    searchQuery: string;
    filterType: ExecutionArchiveFilter;
    perspectiveFilter: ExecutionPerspectiveFilter;
    dossierStatusFilter?: import('../executionArchiveFilterUtils').ExecutionDossierStatusFilter;
    executionViewMode: ExecutionViewMode;
    setExecutionViewMode: (mode: ExecutionViewMode) => void;
    lawsuitFilesForCluster: unknown[];
    onFileClick: ArchivePortalProps['onFileClick'] | ((file: LooseArchiveFile) => void);
    setExecutionPreviewFile: (file: LooseArchiveFile | null) => void;
    onMoveExecutionToTrash?: (id: string) => void;
    onArchiveExecution?: (id: string) => void;
    onRestoreExecutionFromTrash?: (id: string) => void;
    onRestoreArchivedExecution?: (id: string) => void;
    onPermanentlyDeleteExecutions?: (ids: string[]) => void;
    executionTrashDaysRemaining: (file: LooseArchiveFile) => number | undefined;
    selectedTrashIds: Set<string>;
    toggleTrashSelect: (id: string) => void;
    setTrashConfirmTarget: (file: LooseArchiveFile) => void;
    setArchiveConfirmTarget: (file: LooseArchiveFile) => void;
    executionFilesHydrating?: boolean;
    beginPermanentDeleteForIds?: (ids: Array<string | number>) => void;
    getArchiveScrollElement?: () => Element | null;
};

function ExecutionArchiveFileGridImpl({
    enrichedFiles,
    searchQuery,
    filterType,
    perspectiveFilter,
    dossierStatusFilter = 'all',
    executionViewMode,
    setExecutionViewMode: _setExecutionViewMode,
    lawsuitFilesForCluster,
    onFileClick,
    setExecutionPreviewFile,
    onMoveExecutionToTrash,
    onArchiveExecution,
    onRestoreExecutionFromTrash,
    onRestoreArchivedExecution,
    onPermanentlyDeleteExecutions,
    executionTrashDaysRemaining,
    selectedTrashIds,
    toggleTrashSelect,
    setTrashConfirmTarget,
    setArchiveConfirmTarget,
    executionFilesHydrating = false,
    beginPermanentDeleteForIds,
    getArchiveScrollElement,
}: ExecutionArchiveFileGridProps) {
    const executionCardLiveRevision = useExecutionArchiveCardLiveRevision(true);
    const hasNarrowFilters =
        Boolean(searchQuery.trim()) ||
        filterType !== 'all' ||
        perspectiveFilter !== 'all' ||
        dossierStatusFilter !== 'all';

    if (
        executionFilesHydrating &&
        enrichedFiles.length === 0 &&
        !hasNarrowFilters
    ) {
        return (
            <div
                className="flex flex-col items-center justify-center py-20 text-center"
                data-testid="executions-archive-loading"
                aria-busy="true"
            >
                <Clock size={48} className="mb-4 animate-pulse text-[#E6C673]/40" />
                <h3 className="mb-2 text-xl font-bold text-white/55">جاري تحميل الإضابير…</h3>
                <p className="max-w-sm text-sm text-white/30">
                    يتم جلب قائمة إضابير التنفيذ من التخزين المحلي.
                </p>
            </div>
        );
    }

    if (enrichedFiles.length === 0) {
        return (
            <div
                className="flex min-h-full flex-col items-center justify-center py-12 text-center"
                data-testid="executions-archive-empty"
            >
                <h3 className="text-xl font-bold text-white/45">
                    {hasNarrowFilters
                        ? 'لا توجد نتائج'
                        : executionViewMode === 'trash'
                          ? 'سلة المهملات فارغة'
                          : executionViewMode === 'archived'
                            ? 'مخزن الأرشيف فارغ'
                            : 'لا توجد إضابير نشطة'}
                </h3>
            </div>
        );
    }

    const executionVariant =
        executionViewMode === 'trash'
            ? 'trash'
            : executionViewMode === 'archived'
              ? 'archived'
              : 'active';

    return (
        <ArchiveVirtualGrid
            items={enrichedFiles}
            estimateRowSize={280}
            getItemKey={(file) => String(file.id)}
            testId="executions-archive-virtual-grid"
            getScrollElement={getArchiveScrollElement}
            renderItem={(file) => (
                <ExecutionSmartCard
                    file={file}
                    liveRevision={executionCardLiveRevision}
                    lawsuitFilesForCluster={lawsuitFilesForCluster}
                    variant={executionVariant}
                    onOpen={() => onFileClick(file)}
                    onPreview={() => setExecutionPreviewFile(file as LooseArchiveFile)}
                    onRequestMoveToTrash={
                        executionVariant === 'active' && onMoveExecutionToTrash
                            ? () => setTrashConfirmTarget(file as LooseArchiveFile)
                            : undefined
                    }
                    onRequestArchive={
                        executionVariant === 'active' && onArchiveExecution
                            ? () => setArchiveConfirmTarget(file as LooseArchiveFile)
                            : undefined
                    }
                    onRestoreFromTrash={
                        executionVariant === 'trash' && onRestoreExecutionFromTrash
                            ? () => onRestoreExecutionFromTrash((file as LooseArchiveFile).id)
                            : undefined
                    }
                    onRestoreFromArchive={
                        executionVariant === 'archived' && onRestoreArchivedExecution
                            ? () => onRestoreArchivedExecution((file as LooseArchiveFile).id)
                            : undefined
                    }
                    trashDaysRemaining={executionTrashDaysRemaining(file as LooseArchiveFile)}
                    selected={selectedTrashIds.has(String((file as LooseArchiveFile).id))}
                    onToggleSelect={
                        executionVariant === 'trash' && onPermanentlyDeleteExecutions
                            ? () => toggleTrashSelect((file as LooseArchiveFile).id)
                            : undefined
                    }
                    onRequestPermanentDelete={
                        executionVariant === 'trash' && beginPermanentDeleteForIds
                            ? () => beginPermanentDeleteForIds([(file as LooseArchiveFile).id])
                            : undefined
                    }
                />
            )}
        />
    );
}

export const ExecutionArchiveFileGrid = memo(ExecutionArchiveFileGridImpl);
ExecutionArchiveFileGrid.displayName = 'ExecutionArchiveFileGrid';
