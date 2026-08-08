import React, { Suspense, lazy, useEffect } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { X, Plus } from '@/app/components/ui/lucideIcons';
import type { ArchivePortalProps } from '@/app/types/common';
import { warmExecutionWorkspace } from '@/app/utils/lazyComponentsIntent';
import { ExecutionArchiveTrashDialogs } from './components/ExecutionArchiveTrashDialogs';
import { ExecutionArchiveLifecycleBars } from './components/ExecutionArchiveLifecycleBars';
import { ArchivePortalTrashBulkBar } from './components/ArchivePortalTrashBulkBar';
import { ExecutionArchiveFileGrid } from './components/ExecutionArchiveFileGrid';
import { ExecutionArchiveToolbar } from './components/ExecutionArchiveToolbar';
import { ARCHIVE_ROYAL_GLASS_FAB } from './archiveToolbarStyles';
import type { LooseArchiveFile } from './types';
import { SparkExecutionArchiveInsight } from '@/app/spark/ui/SparkExecutionArchiveInsight';

const LazyArchivePortalExecutionPreviewModal = lazy(() =>
    import('./components/ArchivePortalExecutionPreviewModal').then((m) => ({
        default: m.ArchivePortalExecutionPreviewModal,
    })),
);

export function ExecutionArchiveChrome({
    onClose,
    onFileClick,
    onAddAction,
    embedded,
    hideHeader,
    hideTopActionBar,
    escapeEnabled = true,
    onMoveExecutionToTrash,
    onRestoreExecutionFromTrash,
    onArchiveExecution,
    onRestoreArchivedExecution,
    onPermanentlyDeleteExecutions,
    lawsuitFilesForCluster = [],
    executionFilesHydrating = false,
    executionTrashDaysRemaining,
    portal,
}: ArchivePortalProps & {
    portal: Record<string, unknown>;
    executionTrashDaysRemaining?: (file: LooseArchiveFile) => number | undefined;
}) {
    const {
        searchQuery,
        setSearchQuery,
        filterType,
        setFilterType,
        perspectiveFilter,
        setPerspectiveFilter,
        dossierStatusFilter,
        setDossierStatusFilter,
        executionPreviewFile,
        setExecutionPreviewFile,
        executionViewMode,
        setExecutionViewMode,
        executionArchivedCount,
        trashConfirmTarget,
        setTrashConfirmTarget,
        archiveConfirmTarget,
        setArchiveConfirmTarget,
        selectedTrashIds,
        setSelectedTrashIds,
        permanentDeleteOpen,
        setPermanentDeleteOpen,
        confirmPermanentDelete,
        beginPermanentDeleteForIds,
        permanentIdsRef,
        previewTimelineEvents,
        executionTrashedCountTotal,
        executionJurisdictionCountsForView,
        enrichedFiles,
        selectAllTrashedInView,
        beginPermanentDeleteFlow,
        hasExecutionLifecycle,
        executionFilterSummary,
        getTitle,
        toggleTrashSelect,
    } = portal as {
        searchQuery: string;
        setSearchQuery: (q: string) => void;
        filterType: import('./components/ExecutionArchiveToolbar').ExecutionArchiveFilter;
        setFilterType: (f: import('./components/ExecutionArchiveToolbar').ExecutionArchiveFilter) => void;
        perspectiveFilter: import('./executionArchiveFilterUtils').ExecutionPerspectiveFilter;
        setPerspectiveFilter: (f: import('./executionArchiveFilterUtils').ExecutionPerspectiveFilter) => void;
        dossierStatusFilter: import('./executionArchiveFilterUtils').ExecutionDossierStatusFilter;
        setDossierStatusFilter: (f: import('./executionArchiveFilterUtils').ExecutionDossierStatusFilter) => void;
        executionPreviewFile: LooseArchiveFile | null;
        setExecutionPreviewFile: (f: LooseArchiveFile | null) => void;
        executionViewMode: import('./executionArchiveFilterUtils').ExecutionViewMode;
        setExecutionViewMode: (m: import('./executionArchiveFilterUtils').ExecutionViewMode) => void;
        executionArchivedCount: number;
        trashConfirmTarget: LooseArchiveFile | null;
        setTrashConfirmTarget: (f: LooseArchiveFile | null) => void;
        archiveConfirmTarget: LooseArchiveFile | null;
        setArchiveConfirmTarget: (f: LooseArchiveFile | null) => void;
        selectedTrashIds: Set<string>;
        setSelectedTrashIds: (s: Set<string>) => void;
        permanentDeleteOpen: boolean;
        setPermanentDeleteOpen: (o: boolean) => void;
        confirmPermanentDelete: () => void;
        beginPermanentDeleteForIds: (ids: Array<string | number>) => void;
        permanentIdsRef: React.MutableRefObject<Array<string | number>>;
        previewTimelineEvents: unknown[];
        executionTrashedCountTotal: number;
        executionJurisdictionCountsForView: Record<string, number>;
        enrichedFiles: unknown[];
        selectAllTrashedInView: () => void;
        beginPermanentDeleteFlow: () => void;
        hasExecutionLifecycle: boolean;
        executionFilterSummary: string;
        getTitle: () => string;
        toggleTrashSelect: (id: string | number) => void;
    };

    useBodyScrollLock(!embedded);

    useEffect(() => {
        if (embedded) return;
        warmExecutionWorkspace({ includeSecondary: true, secondaryDelayMs: 0 });
        return undefined;
    }, [embedded]);

    useEffect(() => {
        if (embedded || !escapeEnabled) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [embedded, escapeEnabled, onClose]);

    const chromeScrollRef = React.useRef<HTMLDivElement | null>(null);
    const getChromeScrollElement = React.useCallback(
        () => chromeScrollRef.current,
        [],
    );

    const sparkArchiveInsight = (
        <SparkExecutionArchiveInsight
            files={enrichedFiles as Array<Record<string, unknown>>}
            executionViewMode={executionViewMode}
            onOpenFile={(file) => onFileClick(file as Parameters<typeof onFileClick>[0])}
        />
    );

    const shellClass = embedded
        ? "relative flex h-full min-h-0 flex-col bg-[#0B1021] font-['Tajawal']"
        : "fixed inset-0 z-[220] bg-[#0B1021] flex flex-col font-['Tajawal']";

    const layer = (
        <div className={shellClass}>
            {!hideHeader && (
                <div className="px-5 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-4 border-b border-white/[0.06] flex justify-between items-center gap-4 bg-[#0A0F1C]/80 backdrop-blur-xl shrink-0">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{getTitle()}</h2>
                        <p className="text-white/40 text-sm mt-0.5 leading-relaxed">
                            {executionViewMode === 'trash' ? (
                                <>
                                    {enrichedFiles.length}{' '}
                                    {enrichedFiles.length === 1 ? 'إضبارة' : 'إضبارات'} في سلة المهملات
                                </>
                            ) : executionViewMode === 'archived' ? (
                                <>
                                    {enrichedFiles.length}{' '}
                                    {enrichedFiles.length === 1 ? 'إضبارة' : 'إضبارات'} في مخزن الأرشيف
                                </>
                            ) : (
                                <>
                                    {enrichedFiles.length}{' '}
                                    {enrichedFiles.length === 1 ? 'إضبارة' : 'إضبارات'}
                                    {executionFilterSummary ? (
                                        <span className="text-[#E6C673]/80"> · {executionFilterSummary}</span>
                                    ) : null}
                                </>
                            )}
                            {executionViewMode === 'trash' ? (
                                <span className="block mt-1 text-amber-200/80 text-[11px]">
                                    تبقى الإضابير هنا 30 يوماً ثم تُحذف تلقائياً نهائياً ما لم تُسترجع.
                                </span>
                            ) : null}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="إغلاق مخزن الإضابير"
                        className="shrink-0 inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all touch-manipulation"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}

            <ExecutionArchiveLifecycleBars
                executionViewMode={executionViewMode}
                setExecutionViewMode={setExecutionViewMode}
                executionTrashedCountTotal={executionTrashedCountTotal}
                executionArchivedCount={executionArchivedCount}
            />

            <ExecutionArchiveToolbar
                lifecycleMode={executionViewMode}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                filterType={filterType}
                onFilterTypeChange={setFilterType}
                perspectiveFilter={perspectiveFilter}
                onPerspectiveFilterChange={setPerspectiveFilter}
                dossierStatusFilter={dossierStatusFilter}
                onDossierStatusFilterChange={setDossierStatusFilter}
                jurisdictionCounts={executionJurisdictionCountsForView}
            />

            {executionViewMode === 'trash' &&
                enrichedFiles.length > 0 &&
                onPermanentlyDeleteExecutions && (
                    <ArchivePortalTrashBulkBar
                        selectedCount={selectedTrashIds.size}
                        onSelectAll={selectAllTrashedInView}
                        onClearSelection={() => setSelectedTrashIds(new Set())}
                        onBeginPermanentDelete={beginPermanentDeleteFlow}
                    />
                )}

            <div
                ref={chromeScrollRef}
                className={`flex-1 overflow-y-auto px-4 sm:px-5 lg:px-6 py-5 ${
                    embedded
                        ? 'pb-[max(5.5rem,calc(4.5rem+env(safe-area-inset-bottom)))]'
                        : 'pb-[max(2rem,calc(5.25rem+env(safe-area-inset-bottom)))]'
                }`}
            >
                {sparkArchiveInsight}
                <ExecutionArchiveFileGrid
                    enrichedFiles={enrichedFiles as import('./types').ArchiveEnrichedRow[]}
                    searchQuery={searchQuery}
                    filterType={filterType}
                    perspectiveFilter={perspectiveFilter}
                    dossierStatusFilter={dossierStatusFilter}
                    executionViewMode={executionViewMode}
                    setExecutionViewMode={setExecutionViewMode}
                    lawsuitFilesForCluster={lawsuitFilesForCluster}
                    onFileClick={(file) => onFileClick(file as Parameters<typeof onFileClick>[0])}
                    setExecutionPreviewFile={setExecutionPreviewFile}
                    onMoveExecutionToTrash={onMoveExecutionToTrash}
                    onArchiveExecution={onArchiveExecution}
                    onRestoreExecutionFromTrash={onRestoreExecutionFromTrash}
                    onRestoreArchivedExecution={onRestoreArchivedExecution}
                    onPermanentlyDeleteExecutions={onPermanentlyDeleteExecutions}
                    executionTrashDaysRemaining={executionTrashDaysRemaining ?? (() => undefined)}
                    selectedTrashIds={selectedTrashIds}
                    toggleTrashSelect={toggleTrashSelect}
                    setTrashConfirmTarget={setTrashConfirmTarget}
                    setArchiveConfirmTarget={setArchiveConfirmTarget}
                    executionFilesHydrating={executionFilesHydrating}
                    beginPermanentDeleteForIds={beginPermanentDeleteForIds}
                    getArchiveScrollElement={getChromeScrollElement}
                />
            </div>

            {executionPreviewFile && (
                <Suspense fallback={null}>
                    <LazyArchivePortalExecutionPreviewModal
                        file={executionPreviewFile}
                        previewTimelineEvents={previewTimelineEvents}
                        onClose={() => setExecutionPreviewFile(null)}
                        onOpenFull={(file) => {
                            flushSync(() => {
                                setExecutionPreviewFile(null);
                            });
                            onFileClick(file);
                        }}
                    />
                </Suspense>
            )}

            <ExecutionArchiveTrashDialogs
                embedded={embedded}
                trashConfirmTarget={trashConfirmTarget}
                setTrashConfirmTarget={setTrashConfirmTarget}
                archiveConfirmTarget={archiveConfirmTarget}
                setArchiveConfirmTarget={setArchiveConfirmTarget}
                onArchiveExecution={onArchiveExecution}
                permanentDeleteOpen={permanentDeleteOpen}
                setPermanentDeleteOpen={setPermanentDeleteOpen}
                confirmPermanentDelete={confirmPermanentDelete}
                permanentIdsRef={permanentIdsRef}
                onMoveExecutionToTrash={onMoveExecutionToTrash}
            />

            {!hideTopActionBar && executionViewMode === 'active' && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-[max(1rem,env(safe-area-inset-left))] pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.75rem))]">
                    <div className="pointer-events-auto flex justify-start px-1">
                        <button
                            type="button"
                            data-testid="executions-add-new"
                            onClick={onAddAction}
                            onPointerEnter={() => {
                                void import('@/app/runtime/executionCreationLoader')
                                    .then((m) => m.prefetchExecutionCreationViewModule())
                                    .catch(() => undefined);
                            }}
                            title="فتح إضبارة تنفيذ جديدة"
                            aria-label="فتح إضبارة تنفيذ جديدة"
                            className={ARCHIVE_ROYAL_GLASS_FAB}
                        >
                            <Plus size={22} strokeWidth={3} className="drop-shadow" />
                            <span className="text-sm tracking-wide whitespace-nowrap">إضبارة تنفيذ جديدة</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    if (embedded) return layer;
    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}
