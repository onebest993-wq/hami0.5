import React, { Suspense, lazy, useEffect } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { registerNativeBackHandler } from '@/app/runtime/nativeBackStack';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { ExecutionArchivePlusMark, ExecutionArchiveXMark } from './executionArchiveMarks';
import type { ArchivePortalProps } from '@/app/types/common';
import { ExecutionArchiveTrashDialogs } from './components/ExecutionArchiveTrashDialogs';
import { hasExecutionArchiveTrashDialogsLayer } from './executionArchiveTrashDialogsLayer';
import { hasExecutionArchivePreviewLayer } from './executionArchivePreviewLayer';
import { ExecutionArchiveLifecycleBars } from './components/ExecutionArchiveLifecycleBars';
import { ArchivePortalTrashBulkBar } from './components/ArchivePortalTrashBulkBar';
import { ExecutionArchiveFileGrid } from './components/ExecutionArchiveFileGrid';
import { ExecutionArchiveToolbar } from './components/ExecutionArchiveToolbar';
import { ExecutionArchivePreviewPaintSlot } from './components/ExecutionArchivePreviewPaintSlot';
import { EXECUTION_ARCHIVE_FAB } from './executionArchiveVisualLite';
import type { ExecutionArchivePortalState } from './hooks/useArchivePortalController';
import type { LooseArchiveFile } from './types';

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
    portal: ExecutionArchivePortalState;
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
        executionTrashedCountTotal,
        executionJurisdictionCountsForView,
        enrichedFiles,
        selectAllTrashedInView,
        beginPermanentDeleteFlow,
        executionFilterSummary,
        getTitle,
        toggleTrashSelect,
    } = portal;

    useBodyScrollLock(!embedded);

    useEffect(() => {
        if (embedded) return;
        void import('@/app/runtime/executionWorkspaceWarm')
            .then((m) =>
                m.warmExecutionWorkspace({ includeSecondary: true, secondaryDelayMs: 0 }),
            )
            .catch(() => undefined);
        return undefined;
    }, [embedded]);

    useEffect(() => {
        if (!executionPreviewFile) return;
        const closePreview = () => {
            setExecutionPreviewFile(null);
            return true;
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            setExecutionPreviewFile(null);
        };
        window.addEventListener('keydown', onKeyDown, true);
        const unregisterNativeBack = registerNativeBackHandler(closePreview);
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            unregisterNativeBack();
        };
    }, [executionPreviewFile, setExecutionPreviewFile]);

    useEffect(() => {
        if (embedded || !escapeEnabled) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (event.defaultPrevented) return;
            if (hasExecutionArchiveTrashDialogsLayer()) return;
            if (executionPreviewFile || hasExecutionArchivePreviewLayer()) return;
            event.preventDefault();
            onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [embedded, escapeEnabled, onClose, executionPreviewFile]);

    const chromeScrollRef = React.useRef<HTMLDivElement | null>(null);
    const getChromeScrollElement = React.useCallback(
        () => chromeScrollRef.current,
        [],
    );

    const shellClass = embedded
        ? "relative flex h-full min-h-0 flex-col bg-[#0B1021] font-['Tajawal']"
        : "fixed inset-0 z-[220] bg-[#0B1021] flex flex-col font-['Tajawal']";

    const layer = (
        <div className={shellClass}>
            {!hideHeader && (
                <div className="px-3 sm:px-4 hami-overlay-header-safe-pad pb-2 border-b border-white/[0.06] flex justify-between items-center gap-3 bg-[#0B1021] shrink-0">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-[13px] sm:text-sm font-bold text-white truncate">{getTitle()}</h2>
                        <p className="text-white/40 text-[11px] mt-0.5 leading-snug">
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
                        className="shrink-0 inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-white/80 hover:text-white transition-colors touch-manipulation"
                    >
                        <ExecutionArchiveXMark size={18} />
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
                className={`flex-1 overflow-y-auto px-3 sm:px-4 py-2 ${
                    embedded
                        ? 'pb-[max(4.25rem,calc(3.25rem+env(safe-area-inset-bottom)))]'
                        : 'pb-[max(1.75rem,calc(4rem+env(safe-area-inset-bottom)))]'
                }`}
            >
                <ExecutionArchiveFileGrid
                    enrichedFiles={enrichedFiles}
                    searchQuery={searchQuery}
                    filterType={filterType}
                    perspectiveFilter={perspectiveFilter}
                    dossierStatusFilter={dossierStatusFilter}
                    executionViewMode={executionViewMode}
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
                <Suspense fallback={<ExecutionArchivePreviewPaintSlot />}>
                    <LazyArchivePortalExecutionPreviewModal
                        file={executionPreviewFile}
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
                                    .then((m) => m.prefetchExecutionCreationSurface())
                                    .catch(() => undefined);
                            }}
                            title="فتح إضبارة تنفيذ جديدة"
                            aria-label="فتح إضبارة تنفيذ جديدة"
                            className={EXECUTION_ARCHIVE_FAB}
                        >
                            <ExecutionArchivePlusMark />
                            <span className="tracking-wide whitespace-nowrap">إضبارة تنفيذ جديدة</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    if (embedded) return layer;
    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}
