import React, { Suspense, lazy, memo } from 'react';
import type { ArchivePortalProps } from '@/app/types/common';
import { ArchiveVirtualGrid } from './ArchiveVirtualGrid';
import type { LooseArchiveFile, ArchiveEnrichedRow } from '../types';
import {
    resolveExecutionArchiveEmptyCopy,
    type ExecutionDossierStatusFilter,
    type ExecutionJurisdictionFilter,
    type ExecutionPerspectiveFilter,
    type ExecutionViewMode,
} from '../executionArchiveFilterPresentation';
import {
    archiveGridClassForColumnCount,
    readArchiveGridWidthGuess,
    resolveArchiveGridColumnCount,
} from '../archiveGridGeometry';
import { useExecutionArchiveCardLiveRevision } from '../hooks/useExecutionArchiveCardLiveRevision';
import { ExecutionArchiveCardPaintSlot } from './ExecutionArchiveCardPaintSlot';

const LazyExecutionSmartCard = lazy(() => import('./ExecutionSmartCard'));

export type ExecutionArchiveFileGridProps = {
    enrichedFiles: ArchiveEnrichedRow[];
    searchQuery: string;
    filterType: ExecutionJurisdictionFilter;
    perspectiveFilter: ExecutionPerspectiveFilter;
    dossierStatusFilter?: ExecutionDossierStatusFilter;
    executionViewMode: ExecutionViewMode;
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
    toggleTrashSelect: (id: string | number) => void;
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
        const hydrateColumnCount = resolveArchiveGridColumnCount(readArchiveGridWidthGuess(0));
        const hydrateGridClass = archiveGridClassForColumnCount(hydrateColumnCount);
        return (
            <div
                className={hydrateGridClass}
                data-testid="executions-archive-loading"
                aria-busy="true"
                aria-label="جاري تجهيز بطاقات المخزن"
            >
                {Array.from({ length: hydrateColumnCount }, (_, slot) => (
                    <ExecutionArchiveCardPaintSlot key={slot} />
                ))}
            </div>
        );
    }

    if (enrichedFiles.length === 0) {
        const empty = resolveExecutionArchiveEmptyCopy(executionViewMode, hasNarrowFilters);
        return (
            <div
                className="flex flex-col items-center justify-center px-4 py-10 text-center"
                data-testid="executions-archive-empty"
            >
                <h3 className="text-sm font-bold text-white/45">{empty.title}</h3>
                {empty.hint ? (
                    <p className="mt-1.5 max-w-xs text-[11px] leading-relaxed text-white/28">
                        {empty.hint}
                    </p>
                ) : null}
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
            estimateRowSize={176}
            getItemKey={(file) => String(file.id)}
            testId="executions-archive-virtual-grid"
            getScrollElement={getArchiveScrollElement}
            renderItem={(file) => (
                <Suspense fallback={<ExecutionArchiveCardPaintSlot />}>
                    <LazyExecutionSmartCard
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
                </Suspense>
            )}
        />
    );
}

export const ExecutionArchiveFileGrid = memo(ExecutionArchiveFileGridImpl);
ExecutionArchiveFileGrid.displayName = 'ExecutionArchiveFileGrid';
