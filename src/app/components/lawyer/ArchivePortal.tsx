// @ts-nocheck
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { X, Plus } from 'lucide-react';
import { executionTrashDaysRemaining } from '@/app/utils/executionTrash';
import type { ArchivePortalProps } from '@/app/types/common';
import {
    prefetchExecutionCreationView,
    warmExecutionWorkspace,
    warmLawsuitWorkspace,
} from '@/app/utils/lazyComponents';
import {
    ExecutionArchiveToolbar,
} from './ArchivePortal/components/ExecutionArchiveToolbar';
import {
    ArchiveDossierToolbar,
} from './ArchivePortal/components/ArchiveDossierToolbar';
import { ArchivePortalTrashDialogs } from './ArchivePortal/components/ArchivePortalTrashDialogs';
import { ArchivePortalFileGrid } from './ArchivePortal/components/ArchivePortalFileGrid';
import { useArchivePortalController } from './ArchivePortal/hooks/useArchivePortalController';
import { ArchivePortalLifecycleBars } from './ArchivePortal/components/ArchivePortalLifecycleBars';
import { ArchivePortalTrashBulkBar } from './ArchivePortal/components/ArchivePortalTrashBulkBar';
import { ArchivePortalExecutionPreviewModal } from './ArchivePortal/components/ArchivePortalExecutionPreviewModal';

/** Runtime / mock fields not present on strict CaseFile | ExecutionArchiveFile. */
export type { LooseArchiveFile, StageWithCaseMeta, ComputedSmartStatus, ArchiveEnrichedRow } from './ArchivePortal/types';

export const ArchivePortal = ({
    type,
    files,
    theme,
    shapeClass,
    onClose,
    onFileClick,
    onAddAction,
    embedded,
    hideHeader,
    hideTopActionBar,
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
    initialLawsuitJurisdictionTab,
    executionFilesHydrating = false,
}: ArchivePortalProps) => {
    const portal = useArchivePortalController({
        type,
        files,
        criminalCases,
        initialLawsuitJurisdictionTab,
        onPermanentlyDeleteExecutions,
        onPermanentlyDeleteLawsuits,
        onMoveLawsuitToTrash,
        onArchiveLawsuit,
        onRestoreLawsuitFromTrash,
        onMoveExecutionToTrash,
        onRestoreExecutionFromTrash,
        onArchiveExecution,
        onRestoreArchivedExecution,
    });

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

    useBodyScrollLock(!embedded);

    useEffect(() => {
        if (type === 'executions') {
            prefetchExecutionCreationView();
        }
    }, [type]);

    useEffect(() => {
        if (type === 'lawsuits' && !embedded) warmLawsuitWorkspace();
        if (type === 'executions') warmExecutionWorkspace();
    }, [embedded, type]);

    useEffect(() => {
        if (embedded) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [embedded, onClose]);

    const shellClass = embedded
        ? "relative flex h-full min-h-0 flex-col bg-black/90 backdrop-blur-md font-['Tajawal']"
        : "fixed inset-0 z-[220] bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in duration-300 font-['Tajawal']";

    const layer = (
        <div className={shellClass}>
            {!hideHeader && (
                <div className="px-5 sm:px-6 py-4 border-b border-white/[0.06] flex justify-between items-center gap-4 bg-[#0A0F1C]/80 backdrop-blur-xl shrink-0">
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
                        aria-label="إغلاق مخزن الأضابير"
                        className="shrink-0 w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all touch-manipulation"
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
                hasLawsuitLifecycle={hasLawsuitLifecycle}
                lawsuitViewMode={lawsuitViewMode}
                setLawsuitViewMode={setLawsuitViewMode}
                unifiedArchivedCount={unifiedArchivedCount}
                lawsuitTrashedCount={lawsuitTrashedCount}
            />

            {showDossierToolbar ? (
                <ArchiveDossierToolbar
                    showJurisdictionTabs={type === 'lawsuits'}
                    jurisdictionTab={lawsuitJurisdictionTab}
                    onJurisdictionTabChange={setLawsuitJurisdictionTab}
                    searchOpen={dossierSearchOpen}
                    onToggleSearch={() => setDossierSearchOpen((v) => !v)}
                    searchQuery={dossierSearchQuery}
                    onSearchQueryChange={setDossierSearchQuery}
                    searchPlaceholder={
                        viewingCriminal
                            ? 'ابحث برقم الإضبارة، المشتكي، المتهم، أو المادة…'
                            : 'ابحث برقم القضية، الموكل، المحكمة…'
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
                    jurisdictionCounts={executionJurisdictionCountsForView}
                />
            ) : null}

            {type === 'lawsuits' && lawsuitViewMode === 'trash' && enrichedFiles.length > 0 && onPermanentlyDeleteLawsuits && (
                <ArchivePortalTrashBulkBar
                    animated
                    selectedCount={selectedTrashIds.size}
                    onSelectAll={selectAllTrashedInView}
                    onClearSelection={() => setSelectedTrashIds(new Set())}
                    onBeginPermanentDelete={beginPermanentDeleteFlow}
                />
            )}

            {type === 'executions' && executionViewMode === 'trash' && enrichedFiles.length > 0 && onPermanentlyDeleteExecutions && (
                <ArchivePortalTrashBulkBar
                    selectedCount={selectedTrashIds.size}
                    onSelectAll={selectAllTrashedInView}
                    onClearSelection={() => setSelectedTrashIds(new Set())}
                    onBeginPermanentDelete={beginPermanentDeleteFlow}
                />
            )}

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-8 pb-[max(2rem,calc(5.5rem+env(safe-area-inset-bottom)))]">
            <ArchivePortalFileGrid
                type={type}
                enrichedFiles={enrichedFiles}
                searchQuery={searchQuery}
                filterType={filterType}
                perspectiveFilter={perspectiveFilter}
                executionViewMode={executionViewMode}
                setExecutionViewMode={setExecutionViewMode}
                lawsuitFilesForCluster={lawsuitFilesForCluster}
                onFileClick={onFileClick}
                setExecutionPreviewFile={setExecutionPreviewFile}
                onMoveExecutionToTrash={onMoveExecutionToTrash}
                onArchiveExecution={onArchiveExecution}
                onRestoreExecutionFromTrash={onRestoreExecutionFromTrash}
                onRestoreArchivedExecution={onRestoreArchivedExecution}
                onPermanentlyDeleteExecutions={onPermanentlyDeleteExecutions}
                executionTrashDaysRemaining={executionTrashDaysRemaining}
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
            />
            </div>

            {type === 'executions' && executionPreviewFile && (
                <ArchivePortalExecutionPreviewModal
                    file={executionPreviewFile}
                    previewTimelineEvents={previewTimelineEvents}
                    onClose={() => setExecutionPreviewFile(null)}
                    onOpenFull={(file) => {
                        onFileClick(file);
                        setExecutionPreviewFile(null);
                    }}
                />
            )}

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

            {/* ⭐ Floating Action Button — يظهر في كل تبويبات الإضابير (مدني/شخصي/جزائي/تنفيذ) ولا يأخذ مساحة من القائمة. */}
            {!hideTopActionBar &&
                lawsuitViewMode === 'active' &&
                !(type === 'executions' && executionViewMode !== 'active') &&
                (type === 'lawsuits' || type === 'executions') && (
                    <button
                        type="button"
                        data-testid={type === 'lawsuits' ? 'lawsuits-add-new' : 'executions-add-new'}
                        onClick={onAddAction}
                        onPointerEnter={() => {
                            if (type === 'executions') {
                                prefetchExecutionCreationView();
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
                        className={`absolute z-40 group flex items-center gap-2.5 h-14 rounded-full pl-5 pr-4 shadow-2xl border-2 font-bold transition-all duration-200 hover:scale-[1.04] active:scale-95 touch-manipulation bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-[max(1.5rem,env(safe-area-inset-left))] ${
                            lawsuitJurisdictionTab === 'criminal' && type === 'lawsuits'
                                ? 'bg-gradient-to-r from-rose-700 to-red-600 hover:from-red-600 hover:to-rose-600 text-white border-rose-400/40 shadow-rose-900/50'
                                : 'bg-gradient-to-r from-[#E6C673] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#E6C673] text-[#0B1021] border-[#E6C673]/60 shadow-[#E6C673]/30'
                        }`}
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
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
                )}
        </div>
    );

    if (embedded) return layer;
    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
};
