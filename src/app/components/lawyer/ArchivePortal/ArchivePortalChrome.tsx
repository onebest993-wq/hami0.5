import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { X, Plus } from 'lucide-react';
import type { ArchivePortalProps } from '@/app/types/common';
import { warmExecutionWorkspace, warmLawsuitWorkspace } from '@/app/utils/lazyComponentsIntent';
import { ArchiveDossierToolbar } from './components/ArchiveDossierToolbar';
import { ArchivePortalTrashDialogs } from './components/ArchivePortalTrashDialogs';
import { ArchivePortalLifecycleBars } from './components/ArchivePortalLifecycleBars';
import { ArchivePortalTrashBulkBar } from './components/ArchivePortalTrashBulkBar';
import { ExecutionArchiveFileGrid } from './components/ExecutionArchiveFileGrid';
import { ExecutionArchiveToolbar } from './components/ExecutionArchiveToolbar';
import { ARCHIVE_ROYAL_GLASS_FAB } from './archiveToolbarStyles';
import type { LooseArchiveFile } from './types';

const LazyArchivePortalFileGrid = lazy(() =>
    import('./components/ArchivePortalFileGrid').then((m) => ({
        default: m.ArchivePortalFileGrid,
    })),
);

const LazyArchivePortalExecutionPreviewModal = lazy(() =>
    import('./components/ArchivePortalExecutionPreviewModal').then((m) => ({
        default: m.ArchivePortalExecutionPreviewModal,
    })),
);

export function ArchivePortalChrome({
    type,
    files,
    theme: _theme,
    shapeClass: _shapeClass,
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
    onMoveLawsuitToTrash,
    onRestoreLawsuitFromTrash,
    onArchiveLawsuit,
    onRestoreArchivedLawsuit,
    onPermanentlyDeleteLawsuits,
    lawsuitFilesForCluster = [],
    criminalCases = [],
    onOpenCriminalCase,
    onDeleteCriminalCase,
    initialLawsuitJurisdictionTab: _initialLawsuitJurisdictionTab,
    executionFilesHydrating = false,
    executionTrashDaysRemaining,
    gridOnly = false,
    archiveScrollParent = null,
    portal,
}: ArchivePortalProps & {
    portal: any;
    executionTrashDaysRemaining?: (file: LooseArchiveFile) => number | undefined;
}) {
    /** مكافئ محتوى LawsuitsCivilArchiveInstantShell داخل منطقة الشبكة فقط (بلا تكرار شريط/أدوات). */
    const LawsuitArchiveGridFallback = (
        <div
            className="flex flex-col items-center justify-center h-full text-center py-20"
            aria-busy="true"
            data-testid="lawsuit-archive-grid-fallback"
        >
            <h3 className="text-white/40 text-2xl font-bold mb-2">لا توجد ملفات</h3>
        </div>
    );

    const {
        dossierSearchOpen,
        setDossierSearchOpen,
        dossierSearchQuery,
        setDossierSearchQuery,
        lawsuitJurisdictionTab,
        setLawsuitJurisdictionTab,
        viewingCriminal,
        dossierViewMode,
        setDossierViewMode,
        criminalDeleteTarget,
        setCriminalDeleteTarget,
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
        lawsuitViewMode,
        setLawsuitViewMode,
        trashConfirmTarget,
        setTrashConfirmTarget,
        archiveConfirmTarget,
        setArchiveConfirmTarget,
        lawsuitTrashConfirmTarget,
        setLawsuitTrashConfirmTarget,
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
        lawsuitTrashedCount,
        unifiedArchivedCount,
        toggleTrashSelect,
        getTitle,
        filteredCriminalCases,
        showLawsuitCardsInGrid,
        showCriminalCardsInGrid,
        showDossierToolbar,
        enrichedFiles,
        selectAllTrashedInView,
        beginPermanentDeleteFlow,
        hasLawsuitLifecycle,
        hasExecutionLifecycle,
        executionFilterSummary,
    } = portal;

    useBodyScrollLock(!embedded && !gridOnly);

    useEffect(() => {
        if (embedded || gridOnly) return;
        if (type === 'lawsuits') {
            const warmArchiveIntent = () => {
                warmLawsuitWorkspace({ includeSecondary: false });
            };
            if (typeof requestIdleCallback !== 'undefined') {
                const idleId = requestIdleCallback(warmArchiveIntent, { timeout: 1_400 });
                return () => cancelIdleCallback(idleId);
            }
            const timeoutId = window.setTimeout(warmArchiveIntent, 320);
            return () => window.clearTimeout(timeoutId);
        }
        if (type === 'executions') {
            // فوري — لا تؤجّل تسخين الإضبارة إلى idle وإلا أول نقرة تظل باردة
            warmExecutionWorkspace({ includeSecondary: true, secondaryDelayMs: 0 });
        }
        return undefined;
    }, [embedded, gridOnly, type]);

    useEffect(() => {
        if (embedded || gridOnly || !escapeEnabled) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [embedded, gridOnly, escapeEnabled, onClose]);

    const lawsuitTrashBulkBar =
        type === 'lawsuits' && lawsuitViewMode === 'trash' && enrichedFiles.length > 0 && onPermanentlyDeleteLawsuits ? (
            <ArchivePortalTrashBulkBar
                animated
                selectedCount={selectedTrashIds.size}
                onSelectAll={selectAllTrashedInView}
                onClearSelection={() => setSelectedTrashIds(new Set())}
                onBeginPermanentDelete={beginPermanentDeleteFlow}
            />
        ) : null;

    const getArchiveScrollElement = React.useCallback(
        () => archiveScrollParent,
        [archiveScrollParent],
    );

    const chromeScrollRef = React.useRef<HTMLDivElement | null>(null);
    const getChromeScrollElement = React.useCallback(
        () => archiveScrollParent ?? chromeScrollRef.current,
        [archiveScrollParent],
    );

    const lawsuitFileGrid = (
        <Suspense fallback={LawsuitArchiveGridFallback}>
            <LazyArchivePortalFileGrid
                type={type}
                enrichedFiles={enrichedFiles}
                searchQuery={searchQuery}
                filterType={filterType}
                perspectiveFilter={perspectiveFilter}
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
                hasLawsuitLifecycle={hasLawsuitLifecycle}
                dossierViewMode={dossierViewMode}
                showCriminalCardsInGrid={showCriminalCardsInGrid}
                filteredCriminalCases={filteredCriminalCases}
                showLawsuitCardsInGrid={showLawsuitCardsInGrid}
                onOpenCriminalCase={onOpenCriminalCase}
                lawsuitViewMode={lawsuitViewMode}
                onMoveLawsuitToTrash={onMoveLawsuitToTrash}
                onArchiveLawsuit={onArchiveLawsuit}
                onRestoreLawsuitFromTrash={onRestoreLawsuitFromTrash}
                onRestoreArchivedLawsuit={onRestoreArchivedLawsuit}
                onPermanentlyDeleteLawsuits={onPermanentlyDeleteLawsuits}
                setLawsuitTrashConfirmTarget={setLawsuitTrashConfirmTarget}
                setCriminalDeleteTarget={setCriminalDeleteTarget}
                onDeleteCriminalCase={onDeleteCriminalCase}
                dossierSearchQuery={dossierSearchQuery}
                lawsuitJurisdictionTab={lawsuitJurisdictionTab}
                executionFilesHydrating={executionFilesHydrating}
                beginPermanentDeleteForIds={beginPermanentDeleteForIds}
                getArchiveScrollElement={gridOnly ? getArchiveScrollElement : getChromeScrollElement}
                onAddAction={onAddAction}
            />
        </Suspense>
    );

    const trashDialogs = (
        <ArchivePortalTrashDialogs
            type={type}
            trashConfirmTarget={trashConfirmTarget}
            setTrashConfirmTarget={setTrashConfirmTarget}
            archiveConfirmTarget={archiveConfirmTarget}
            setArchiveConfirmTarget={setArchiveConfirmTarget}
            onArchiveExecution={onArchiveExecution}
            lawsuitTrashConfirmTarget={lawsuitTrashConfirmTarget}
            setLawsuitTrashConfirmTarget={setLawsuitTrashConfirmTarget}
            criminalDeleteTarget={criminalDeleteTarget}
            setCriminalDeleteTarget={setCriminalDeleteTarget}
            permanentDeleteOpen={permanentDeleteOpen}
            setPermanentDeleteOpen={setPermanentDeleteOpen}
            confirmPermanentDelete={confirmPermanentDelete}
            permanentIdsRef={permanentIdsRef}
            onMoveExecutionToTrash={onMoveExecutionToTrash}
            onMoveLawsuitToTrash={onMoveLawsuitToTrash}
            onDeleteCriminalCase={onDeleteCriminalCase}
        />
    );

    if (gridOnly) {
        return (
            <div className="relative flex min-h-0 flex-1 flex-col">
                {lawsuitTrashBulkBar}
                {lawsuitFileGrid}
                {trashDialogs}
            </div>
        );
    }

    // لون القشرة يطابق InstantChrome — bg-black/90 كان يظهر وميضاً أسود عند اعتماد المحتوى
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
                                {type === 'executions' ? (
                                    <>
                                        {executionViewMode === 'trash' ? (
                                            <>
                                                {enrichedFiles.length}{' '}
                                                {enrichedFiles.length === 1 ? 'إضبارة' : 'إضبارات'} في
                                                سلة المهملات
                                            </>
                                        ) : executionViewMode === 'archived' ? (
                                            <>
                                                {enrichedFiles.length}{' '}
                                                {enrichedFiles.length === 1 ? 'إضبارة' : 'إضبارات'} في
                                                مخزن الأرشيف
                                            </>
                                        ) : (
                                            <>
                                                {enrichedFiles.length}{' '}
                                                {enrichedFiles.length === 1 ? 'إضبارة' : 'إضبارات'}
                                                {executionFilterSummary ? (
                                                    <span className="text-[#E6C673]/80">
                                                        {' '}
                                                        · {executionFilterSummary}
                                                    </span>
                                                ) : null}
                                            </>
                                        )}
                                        {executionViewMode === 'trash' ? (
                                            <span className="block mt-1 text-amber-200/80 text-[11px]">
                                                تبقى الإضابير هنا 30 يوماً ثم تُحذف تلقائياً نهائياً ما لم
                                                تُسترجع.
                                            </span>
                                        ) : null}
                                    </>
                                ) : (
                                    <>
                                        {enrichedFiles.length}{' '}
                                        {(searchQuery || filterType !== 'all') &&
                                        files.length !== enrichedFiles.length ? (
                                            <span>من أصل {files.length} </span>
                                        ) : null}
                                        ملف
                                    </>
                                )}
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

            <ArchivePortalLifecycleBars
                hasExecutionLifecycle={hasExecutionLifecycle}
                executionViewMode={executionViewMode}
                setExecutionViewMode={setExecutionViewMode}
                executionTrashedCountTotal={executionTrashedCountTotal}
                executionArchivedCount={executionArchivedCount}
                executionTrashActionVisible={
                    executionViewMode === 'trash' ||
                    selectedTrashIds.size > 0 ||
                    executionTrashedCountTotal > 0
                }
                hideExecutionPrimarySegments
                hasLawsuitLifecycle={hasLawsuitLifecycle}
                lawsuitViewMode={lawsuitViewMode}
                setLawsuitViewMode={setLawsuitViewMode}
                unifiedArchivedCount={unifiedArchivedCount}
                lawsuitTrashedCount={lawsuitTrashedCount}
                lawsuitTrashActionVisible={
                    lawsuitViewMode === 'trash' ||
                    selectedTrashIds.size > 0 ||
                    lawsuitTrashedCount > 0
                }
            />

            {showDossierToolbar ? (
                <ArchiveDossierToolbar
                    showJurisdictionTabs={type === 'lawsuits'}
                    showUrgentChip={false}
                    jurisdictionTab={lawsuitJurisdictionTab}
                    onJurisdictionTabChange={setLawsuitJurisdictionTab}
                    searchOpen={dossierSearchOpen}
                    onToggleSearch={() => setDossierSearchOpen((v) => !v)}
                    searchQuery={dossierSearchQuery}
                    onSearchQueryChange={setDossierSearchQuery}
                    searchPlaceholder={
                        viewingCriminal
                            ? 'ابحث برقم الإضبارة، المشتكي، المتهم، أو المادة…'
                            : 'ابحث برقم الإضبارة أو اسم الدعوى...'
                    }
                    viewMode={dossierViewMode}
                    onViewModeChange={setDossierViewMode}
                />
            ) : null}

            {/* ⓘ زر "إضافة ملف قضائي جديد" تم نقله إلى FAB ثابت أسفل-يسار المنفذ — يظهر في كل التبويبات (مدني/شخصي/جزائي) ولا يأخذ مساحة من قائمة الإضابير. */}

            {type === 'executions' ? (
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
            ) : null}

            {type === 'lawsuits' && lawsuitViewMode === 'trash' && enrichedFiles.length > 0 && onPermanentlyDeleteLawsuits
                ? lawsuitTrashBulkBar
                : null}

            {type === 'executions' && executionViewMode === 'trash' && enrichedFiles.length > 0 && onPermanentlyDeleteExecutions && (
                <ArchivePortalTrashBulkBar
                    selectedCount={selectedTrashIds.size}
                    onSelectAll={selectAllTrashedInView}
                    onClearSelection={() => setSelectedTrashIds(new Set())}
                    onBeginPermanentDelete={beginPermanentDeleteFlow}
                />
            )}

            {/* Grid */}
            <div
                ref={chromeScrollRef}
                className={`flex-1 overflow-y-auto px-4 sm:px-5 lg:px-6 py-5 ${
                    embedded
                        ? 'pb-[max(5.5rem,calc(4.5rem+env(safe-area-inset-bottom)))]'
                        : 'pb-[max(2rem,calc(5.25rem+env(safe-area-inset-bottom)))]'
                }`}
            >
            {type === 'executions' ? (
                <ExecutionArchiveFileGrid
                    enrichedFiles={enrichedFiles}
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
            ) : (
                lawsuitFileGrid
            )}
            </div>

            {type === 'executions' && executionPreviewFile && (
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

            {trashDialogs}

            {/* ⭐ Floating Action Button — يظهر في كل تبويبات الإضابير (مدني/شخصي/جزائي/تنفيذ) ولا يأخذ مساحة من القائمة. */}
            {!hideTopActionBar &&
                lawsuitViewMode === 'active' &&
                !(type === 'executions' && executionViewMode !== 'active') &&
                (type === 'lawsuits' || type === 'executions') && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-[max(1rem,env(safe-area-inset-left))] pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.75rem))]">
                        <div className="pointer-events-auto flex justify-start px-1">
                            <button
                                type="button"
                                data-testid={type === 'lawsuits' ? 'lawsuits-add-new' : 'executions-add-new'}
                                onClick={onAddAction}
                                onPointerEnter={() => {
                                    if (type === 'executions') {
                                        void import('@/app/runtime/executionCreationLoader')
                                            .then((m) => m.prefetchExecutionCreationViewModule())
                                            .catch(() => undefined);
                                    }
                                }}
                                title={
                                    type === 'executions'
                                        ? 'فتح إضبارة تنفيذ جديدة'
                                        : lawsuitJurisdictionTab === 'criminal'
                                          ? 'إنشاء إضبارة جزائية جديدة'
                                          : 'إضافة ملف قضائي جديد'
                                }
                                aria-label={
                                    type === 'executions'
                                        ? 'فتح إضبارة تنفيذ جديدة'
                                        : lawsuitJurisdictionTab === 'criminal'
                                          ? 'إنشاء إضبارة جزائية جديدة'
                                          : 'إضافة ملف قضائي جديد'
                                }
                                className={
                                    lawsuitJurisdictionTab === 'criminal' && type === 'lawsuits'
                                        ? 'group flex min-h-[3.5rem] items-center gap-2.5 rounded-full border-2 pl-5 pr-4 font-bold shadow-2xl ring-1 ring-white/10 backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 touch-manipulation bg-gradient-to-r from-rose-700 to-red-600 hover:from-red-600 hover:to-rose-600 text-white border-rose-400/40 shadow-rose-900/50'
                                        : ARCHIVE_ROYAL_GLASS_FAB
                                }
                            >
                                <Plus size={22} strokeWidth={3} className="drop-shadow" />
                                <span className="text-sm tracking-wide whitespace-nowrap">
                                    {type === 'executions'
                                        ? 'إضبارة تنفيذ جديدة'
                                        : lawsuitJurisdictionTab === 'criminal'
                                          ? 'إضبارة جزائية جديدة'
                                          : 'ملف قضائي جديد'}
                                </span>
                            </button>
                        </div>
                    </div>
                )}
        </div>
    );

    if (embedded) return layer;
    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}
