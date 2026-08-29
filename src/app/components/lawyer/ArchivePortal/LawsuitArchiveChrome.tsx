import React, { Suspense, lazy, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { X } from '@/app/components/ui/icons/X';
import { Plus } from '@/app/components/ui/icons/Plus';
import type { ArchivePortalProps } from '@/app/types/common';
import { LAWSUIT_VAULT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/lawsuitVaultTestIds';
import { ArchiveDossierToolbar } from './components/ArchiveDossierToolbar';
import { LawsuitArchiveLifecycleBars } from './components/LawsuitArchiveLifecycleBars';
import { lawsuitArchiveScrollRegionClass } from './lawsuitArchiveInstantLayout';
import { ArchivePortalTrashBulkBar } from './components/ArchivePortalTrashBulkBar';
import { ARCHIVE_ROYAL_GLASS_FAB } from './archiveToolbarStyles';
import { LawsuitArchiveFileGrid } from './components/LawsuitArchiveFileGrid';
import type { LawsuitArchivePortalViewModel } from './hooks/useLawsuitArchivePortalController';

const LazyLawsuitArchiveTrashDialogs = lazy(() =>
    import('./components/LawsuitArchiveTrashDialogs').then((m) => ({
        default: m.LawsuitArchiveTrashDialogs,
    })),
);

export function LawsuitArchiveChrome({
    onClose,
    onFileClick,
    onAddAction,
    embedded,
    hideHeader,
    hideTopActionBar,
    escapeEnabled = true,
    onMoveLawsuitToTrash,
    onRestoreLawsuitFromTrash,
    onArchiveLawsuit,
    onRestoreArchivedLawsuit,
    onPermanentlyDeleteLawsuits,
    onOpenCriminalCase,
    onDeleteCriminalCase,
    gridOnly = false,
    archiveScrollParent = null,
    lawsuitFilesHydrating = false,
    lawsuitLifecycleCounts,
    lawsuitArchivedFiles,
    lawsuitTrashFiles,
    portal,
}: ArchivePortalProps & { portal: LawsuitArchivePortalViewModel }) {
    const {
        dossierSearchQuery,
        setDossierSearchQuery,
        lawsuitJurisdictionTab,
        setLawsuitJurisdictionTab,
        viewingCriminal,
        dossierViewMode,
        setDossierViewMode,
        criminalDeleteTarget,
        setCriminalDeleteTarget,
        lawsuitViewMode,
        setLawsuitViewMode,
        lawsuitTrashConfirmTarget,
        setLawsuitTrashConfirmTarget,
        selectedTrashIds,
        setSelectedTrashIds,
        permanentDeleteOpen,
        setPermanentDeleteOpen,
        confirmPermanentDelete,
        permanentIdsRef,
        lawsuitTrashedCount,
        unifiedArchivedCount,
        getTitle,
        filteredCriminalCases,
        showLawsuitCardsInGrid,
        showCriminalCardsInGrid,
        enrichedFiles,
        selectAllTrashedInView,
        beginPermanentDeleteFlow,
        hasLawsuitLifecycle,
        toggleTrashSelect,
    } = portal;

    useBodyScrollLock(!embedded && !gridOnly);

    useEffect(() => {
        if (embedded || gridOnly) return;
        const warmArchiveIntent = () => {
            void import('@/app/utils/lazyComponentsIntent')
                .then((m) => m.warmLawsuitWorkspace({ includeSecondary: false }))
                .catch(() => undefined);
        };
        if (typeof requestIdleCallback !== 'undefined') {
            const idleId = requestIdleCallback(warmArchiveIntent, { timeout: 1_400 });
            return () => cancelIdleCallback(idleId);
        }
        const timeoutId = window.setTimeout(warmArchiveIntent, 320);
        return () => window.clearTimeout(timeoutId);
    }, [embedded, gridOnly]);

    useEffect(() => {
        if (embedded || gridOnly || !escapeEnabled) return;
        const hasConfirmDialog = () =>
            Boolean(
                document.querySelector(`[data-testid="${LAWSUIT_VAULT_TEST_IDS.trashConfirmDialog}"]`) ||
                    document.querySelector(
                        `[data-testid="${LAWSUIT_VAULT_TEST_IDS.criminalDeleteDialog}"]`,
                    ) ||
                    document.querySelector(
                        `[data-testid="${LAWSUIT_VAULT_TEST_IDS.permanentDeleteDialog}"]`,
                    ),
            );
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (hasConfirmDialog()) return;
            event.preventDefault();
            onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [embedded, gridOnly, escapeEnabled, onClose]);

    const lawsuitTrashBulkBar =
            lawsuitViewMode === 'trash' && enrichedFiles.length > 0 && onPermanentlyDeleteLawsuits ? (
            <ArchivePortalTrashBulkBar
                selectedCount={selectedTrashIds.size}
                onSelectAll={selectAllTrashedInView}
                onClearSelection={() => setSelectedTrashIds(new Set())}
                onBeginPermanentDelete={beginPermanentDeleteFlow}
                selectAllTestId={LAWSUIT_VAULT_TEST_IDS.trashSelectAll}
                permanentDeleteTestId={LAWSUIT_VAULT_TEST_IDS.trashPermanentDelete}
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

    const lawsuitSegmentHydrating =
        (lawsuitViewMode === 'archived' &&
            lawsuitArchivedFiles === null &&
            (lawsuitLifecycleCounts?.archived ?? 0) > 0) ||
        (lawsuitViewMode === 'trash' &&
            lawsuitTrashFiles === null &&
            (lawsuitLifecycleCounts?.trash ?? 0) > 0);

    const lawsuitFileGrid = (
        <LawsuitArchiveFileGrid
            enrichedFiles={enrichedFiles}
            hasLawsuitLifecycle={hasLawsuitLifecycle}
            dossierViewMode={dossierViewMode}
            showCriminalCardsInGrid={showCriminalCardsInGrid}
            filteredCriminalCases={filteredCriminalCases}
            showLawsuitCardsInGrid={showLawsuitCardsInGrid}
            onOpenCriminalCase={onOpenCriminalCase}
            lawsuitViewMode={lawsuitViewMode}
            onFileClick={onFileClick}
            onMoveLawsuitToTrash={onMoveLawsuitToTrash}
            onArchiveLawsuit={onArchiveLawsuit}
            onRestoreLawsuitFromTrash={onRestoreLawsuitFromTrash}
            onRestoreArchivedLawsuit={onRestoreArchivedLawsuit}
            onPermanentlyDeleteLawsuits={onPermanentlyDeleteLawsuits}
            setLawsuitTrashConfirmTarget={setLawsuitTrashConfirmTarget}
            setCriminalDeleteTarget={setCriminalDeleteTarget}
            onDeleteCriminalCase={onDeleteCriminalCase}
            dossierSearchQuery={dossierSearchQuery}
            selectedTrashIds={selectedTrashIds}
            toggleTrashSelect={toggleTrashSelect}
            getArchiveScrollElement={gridOnly ? getArchiveScrollElement : getChromeScrollElement}
            lawsuitFilesHydrating={lawsuitFilesHydrating}
            lawsuitSegmentHydrating={lawsuitSegmentHydrating}
        />
    );

    const showTrashLayer =
        Boolean(lawsuitTrashConfirmTarget && onMoveLawsuitToTrash) ||
        Boolean(criminalDeleteTarget && onDeleteCriminalCase) ||
        permanentDeleteOpen;

    const trashDialogs = showTrashLayer ? (
        <Suspense fallback={null}>
            <LazyLawsuitArchiveTrashDialogs
                lawsuitTrashConfirmTarget={lawsuitTrashConfirmTarget}
                setLawsuitTrashConfirmTarget={setLawsuitTrashConfirmTarget}
                criminalDeleteTarget={criminalDeleteTarget}
                setCriminalDeleteTarget={setCriminalDeleteTarget}
                permanentDeleteOpen={permanentDeleteOpen}
                setPermanentDeleteOpen={setPermanentDeleteOpen}
                confirmPermanentDelete={confirmPermanentDelete}
                permanentIdsRef={permanentIdsRef}
                onMoveLawsuitToTrash={onMoveLawsuitToTrash}
                onDeleteCriminalCase={onDeleteCriminalCase}
            />
        </Suspense>
    ) : null;

    if (gridOnly) {
        return (
            <div className="relative flex min-h-0 flex-1 flex-col">
                {lawsuitTrashBulkBar}
                {lawsuitFileGrid}
                {trashDialogs}
            </div>
        );
    }

    const shellClass = embedded
        ? "relative flex h-full min-h-0 flex-col bg-[#0B1021] font-['Tajawal']"
        : "fixed inset-0 z-[220] bg-[#0B1021] flex flex-col font-['Tajawal']";

    const layer = (
        <div className={shellClass}>
            {!hideHeader && (
                <div className="px-4 sm:px-5 hami-overlay-header-safe-pad pb-2.5 border-b border-white/[0.06] flex justify-between items-center gap-2.5 bg-[#0A0F1C]/92 shrink-0">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg sm:text-xl font-bold text-white truncate">{getTitle()}</h2>
                        <p className="text-white/40 text-xs mt-0.5 leading-relaxed">
                            {enrichedFiles.length}{' '}
                            ملف
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

            <LawsuitArchiveLifecycleBars
                lawsuitViewMode={lawsuitViewMode}
                setLawsuitViewMode={setLawsuitViewMode}
                unifiedArchivedCount={unifiedArchivedCount}
                lawsuitTrashedCount={lawsuitTrashedCount}
                showLawsuitTrashToggle
                selectedLawsuitCount={selectedTrashIds.size}
            />

            <ArchiveDossierToolbar
                showJurisdictionTabs
                jurisdictionTab={lawsuitJurisdictionTab}
                onJurisdictionTabChange={setLawsuitJurisdictionTab}
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

            {lawsuitTrashBulkBar}

            <div ref={chromeScrollRef} className={lawsuitArchiveScrollRegionClass(embedded)}>
                {lawsuitFileGrid}
            </div>

            {trashDialogs}

            {!hideTopActionBar && lawsuitViewMode === 'active' && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-[max(1rem,env(safe-area-inset-left))] pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.75rem))]">
                    <div className="pointer-events-auto flex justify-start px-1">
                        <button
                            type="button"
                            data-testid="lawsuits-add-new"
                            onClick={onAddAction}
                            title={
                                lawsuitJurisdictionTab === 'criminal'
                                    ? 'إنشاء إضبارة جزائية جديدة'
                                    : 'إضافة ملف قضائي جديد'
                            }
                            aria-label={
                                lawsuitJurisdictionTab === 'criminal'
                                    ? 'إنشاء إضبارة جزائية جديدة'
                                    : 'إضافة ملف قضائي جديد'
                            }
                            className={
                                lawsuitJurisdictionTab === 'criminal'
                                    ? 'group flex min-h-[3.5rem] items-center gap-2.5 rounded-full border-2 pl-5 pr-4 font-bold shadow-lg ring-1 ring-white/10 transition-colors duration-150 active:scale-95 touch-manipulation bg-gradient-to-r from-rose-700 to-red-600 hover:from-red-600 hover:to-rose-600 text-white border-rose-400/40 shadow-rose-900/50'
                                    : ARCHIVE_ROYAL_GLASS_FAB
                            }
                        >
                            <Plus size={22} strokeWidth={3} className="drop-shadow" />
                            <span className="text-sm tracking-wide whitespace-nowrap">
                                {lawsuitJurisdictionTab === 'criminal'
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
