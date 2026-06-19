import React from 'react';
import { X, Plus, Scale } from 'lucide-react';
import { executionTrashDaysRemaining } from '@/app/utils/executionTrash';
import type { ArchivePortalProps } from '@/app/types/common';
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
        executionTrashView,
        setExecutionTrashView,
        lawsuitViewMode,
        setLawsuitViewMode,
        trashConfirmTarget,
        setTrashConfirmTarget,
        lawsuitTrashConfirmTarget,
        setLawsuitTrashConfirmTarget,
        selectedTrashIds,
        setSelectedTrashIds,
        permanentDeleteOpen,
        setPermanentDeleteOpen,
        permanentCountdown,
        permanentIdsRef,
        previewTimelineEvents,
        executionTrashedCountForFilter,
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

    return (
        <div
            className={
                embedded
                    ? 'h-full bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in duration-300 font-[\'Tajawal\']'
                    : 'fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in duration-300 font-[\'Tajawal\']'
            }
        >
            {!hideHeader && (
                <div className="px-8 py-5 border-b border-white/10 flex justify-between items-center bg-[#0A0F1C]/75 backdrop-blur-xl shrink-0">
                    <div className="flex items-center gap-4 min-w-0">
                        {type === 'executions' ? (
                            <div className="shrink-0 w-12 h-12 rounded-2xl border border-[#E6C673]/35 bg-[#E6C673]/10 flex items-center justify-center text-[#E6C673]">
                                <Scale size={22} />
                            </div>
                        ) : null}
                        <div className="min-w-0">
                            <h2 className="text-2xl font-bold text-white truncate">{getTitle()}</h2>
                            <p className="text-white/40 text-sm">
                                {type === 'executions' ? (
                                    <>
                                        {executionTrashView ? (
                                            <>
                                                {enrichedFiles.length}{' '}
                                                {enrichedFiles.length === 1 ? 'إضبارة' : 'إضبارات'} في
                                                سلة المهملات
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
                                        {executionTrashView ? (
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
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}

            <ArchivePortalLifecycleBars
                hasExecutionLifecycle={hasExecutionLifecycle}
                executionTrashView={executionTrashView}
                setExecutionTrashView={setExecutionTrashView}
                executionTrashedCountForFilter={executionTrashedCountForFilter}
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
                    lifecycleMode={executionTrashView ? 'trash' : 'active'}
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

            {type === 'executions' && executionTrashView && enrichedFiles.length > 0 && onPermanentlyDeleteExecutions && (
                <ArchivePortalTrashBulkBar
                    selectedCount={selectedTrashIds.size}
                    onSelectAll={selectAllTrashedInView}
                    onClearSelection={() => setSelectedTrashIds(new Set())}
                    onBeginPermanentDelete={beginPermanentDeleteFlow}
                />
            )}

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-8">
            <ArchivePortalFileGrid
                type={type}
                enrichedFiles={enrichedFiles}
                searchQuery={searchQuery}
                filterType={filterType}
                perspectiveFilter={perspectiveFilter}
                executionTrashView={executionTrashView}
                setExecutionTrashView={setExecutionTrashView}
                lawsuitFilesForCluster={lawsuitFilesForCluster}
                onFileClick={onFileClick}
                setExecutionPreviewFile={setExecutionPreviewFile}
                onMoveExecutionToTrash={onMoveExecutionToTrash}
                onRestoreExecutionFromTrash={onRestoreExecutionFromTrash}
                onPermanentlyDeleteExecutions={onPermanentlyDeleteExecutions}
                executionTrashDaysRemaining={executionTrashDaysRemaining}
                selectedTrashIds={selectedTrashIds}
                toggleTrashSelect={toggleTrashSelect}
                setTrashConfirmTarget={setTrashConfirmTarget}
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
                lawsuitTrashConfirmTarget={lawsuitTrashConfirmTarget}
                setLawsuitTrashConfirmTarget={setLawsuitTrashConfirmTarget}
                criminalDeleteTarget={criminalDeleteTarget}
                setCriminalDeleteTarget={setCriminalDeleteTarget}
                permanentDeleteOpen={permanentDeleteOpen}
                setPermanentDeleteOpen={setPermanentDeleteOpen}
                permanentCountdown={permanentCountdown}
                permanentIdsRef={permanentIdsRef}
                onMoveExecutionToTrash={onMoveExecutionToTrash}
                onMoveLawsuitToTrash={onMoveLawsuitToTrash}
                onDeleteCriminalCase={onDeleteCriminalCase}
            />

            {/* ⭐ Floating Action Button — يظهر في كل تبويبات الإضابير (مدني/شخصي/جزائي/تنفيذ) ولا يأخذ مساحة من القائمة. */}
            {!hideTopActionBar &&
                lawsuitViewMode === 'active' &&
                !(type === 'executions' && executionTrashView) &&
                (type === 'lawsuits' || type === 'executions') && (
                    <button
                        type="button"
                        data-testid={type === 'lawsuits' ? 'lawsuits-add-new' : undefined}
                        onClick={onAddAction}
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
                        className={`absolute bottom-6 left-6 z-40 group flex items-center gap-2.5 h-14 rounded-full pl-5 pr-4 shadow-2xl border-2 font-bold transition-all duration-200 hover:scale-[1.04] active:scale-95 ${
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
};
