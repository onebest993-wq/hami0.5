import React, { Suspense, lazy, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { X, Plus } from '@/app/components/ui/lucideIcons';
import type { ArchivePortalProps } from '@/app/types/common';
import { warmLawsuitWorkspace } from '@/app/utils/lazyComponentsIntent';
import { ArchiveDossierToolbar } from './components/ArchiveDossierToolbar';
import { LawsuitArchiveTrashDialogs } from './components/LawsuitArchiveTrashDialogs';
import { LawsuitArchiveLifecycleBars } from './components/LawsuitArchiveLifecycleBars';
import { lawsuitArchiveScrollRegionClass } from './lawsuitArchiveInstantLayout';
import { SparkLawsuitArchiveInsight } from '@/app/spark/ui/SparkLawsuitArchiveInsight';
import { ArchivePortalTrashBulkBar } from './components/ArchivePortalTrashBulkBar';
import { ARCHIVE_ROYAL_GLASS_FAB } from './archiveToolbarStyles';
import type { LooseArchiveFile } from './types';

const LazyLawsuitArchiveFileGrid = lazy(() =>
    import('./components/LawsuitArchiveFileGrid').then((m) => ({
        default: m.LawsuitArchiveFileGrid,
    })),
);

const LawsuitArchiveGridFallback = (
    <div
        className="flex flex-col items-center justify-center h-full text-center py-20"
        aria-busy="true"
        data-testid="lawsuit-archive-grid-fallback"
    >
        <h3 className="text-white/40 text-2xl font-bold mb-2">لا توجد ملفات</h3>
    </div>
);

export function LawsuitArchiveChrome({
    files,
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
    criminalCases: _criminalCases = [],
    onOpenCriminalCase,
    onDeleteCriminalCase,
    gridOnly = false,
    archiveScrollParent = null,
    portal,
}: ArchivePortalProps & { portal: Record<string, unknown> }) {
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
        showDossierToolbar,
        enrichedFiles,
        selectAllTrashedInView,
        beginPermanentDeleteFlow,
        hasLawsuitLifecycle,
        toggleTrashSelect,
    } = portal as {
        dossierSearchOpen: boolean;
        setDossierSearchOpen: (v: boolean | ((p: boolean) => boolean)) => void;
        dossierSearchQuery: string;
        setDossierSearchQuery: (q: string) => void;
        lawsuitJurisdictionTab: 'all' | 'civil' | 'personal' | 'criminal';
        setLawsuitJurisdictionTab: (v: 'all' | 'civil' | 'personal' | 'criminal') => void;
        viewingCriminal: boolean;
        dossierViewMode: 'grid' | 'compact';
        setDossierViewMode: (m: 'grid' | 'compact') => void;
        criminalDeleteTarget: { id: string; title: string } | null;
        setCriminalDeleteTarget: (t: { id: string; title: string } | null) => void;
        lawsuitViewMode: 'active' | 'archived' | 'trash';
        setLawsuitViewMode: (m: 'active' | 'archived' | 'trash') => void;
        lawsuitTrashConfirmTarget: LooseArchiveFile | null;
        setLawsuitTrashConfirmTarget: (f: LooseArchiveFile | null) => void;
        selectedTrashIds: Set<string>;
        setSelectedTrashIds: (s: Set<string>) => void;
        permanentDeleteOpen: boolean;
        setPermanentDeleteOpen: (o: boolean) => void;
        confirmPermanentDelete: () => void;
        permanentIdsRef: React.MutableRefObject<Array<string | number>>;
        lawsuitTrashedCount: number;
        unifiedArchivedCount: number;
        getTitle: () => string;
        filteredCriminalCases: Array<Record<string, unknown> & { id?: string | number }>;
        showLawsuitCardsInGrid: boolean;
        showCriminalCardsInGrid: boolean;
        showDossierToolbar: boolean;
        enrichedFiles: unknown[];
        selectAllTrashedInView: () => void;
        beginPermanentDeleteFlow: () => void;
        hasLawsuitLifecycle: boolean;
        toggleTrashSelect: (id: string | number) => void;
    };

    useBodyScrollLock(!embedded && !gridOnly);

    useEffect(() => {
        if (embedded || gridOnly) return;
        const warmArchiveIntent = () => {
            warmLawsuitWorkspace({ includeSecondary: false });
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
        lawsuitViewMode === 'trash' && enrichedFiles.length > 0 && onPermanentlyDeleteLawsuits ? (
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
            <LazyLawsuitArchiveFileGrid
                enrichedFiles={enrichedFiles as import('./types').ArchiveEnrichedRow[]}
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
                lawsuitJurisdictionTab={lawsuitJurisdictionTab}
                selectedTrashIds={selectedTrashIds}
                toggleTrashSelect={toggleTrashSelect}
                getArchiveScrollElement={gridOnly ? getArchiveScrollElement : getChromeScrollElement}
            />
        </Suspense>
    );

    const trashDialogs = (
        <LawsuitArchiveTrashDialogs
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
    );

    const sparkArchiveInsight = (
        <SparkLawsuitArchiveInsight
            files={enrichedFiles as Array<Record<string, unknown>>}
            criminalCases={filteredCriminalCases as Array<Record<string, unknown>>}
            jurisdictionTab={lawsuitJurisdictionTab}
            lawsuitViewMode={lawsuitViewMode}
            onOpenFile={(file) => onFileClick(file)}
            onOpenCriminalCase={(criminalId) => onOpenCriminalCase?.(criminalId)}
        />
    );

    if (gridOnly) {
        return (
            <div className="relative flex min-h-0 flex-1 flex-col">
                {lawsuitTrashBulkBar}
                {sparkArchiveInsight}
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
                <div className="px-5 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-4 border-b border-white/[0.06] flex justify-between items-center gap-4 bg-[#0A0F1C]/80 backdrop-blur-xl shrink-0">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{getTitle()}</h2>
                        <p className="text-white/40 text-sm mt-0.5 leading-relaxed">
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
                showLawsuitTrashToggle={
                    lawsuitViewMode === 'trash' ||
                    selectedTrashIds.size > 0 ||
                    lawsuitTrashedCount > 0
                }
                selectedLawsuitCount={selectedTrashIds.size}
            />

            {showDossierToolbar ? (
                <ArchiveDossierToolbar
                    showJurisdictionTabs
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

            {lawsuitTrashBulkBar}

            <div ref={chromeScrollRef} className={lawsuitArchiveScrollRegionClass(embedded)}>
                {sparkArchiveInsight}
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
                                    ? 'group flex min-h-[3.5rem] items-center gap-2.5 rounded-full border-2 pl-5 pr-4 font-bold shadow-2xl ring-1 ring-white/10 backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 touch-manipulation bg-gradient-to-r from-rose-700 to-red-600 hover:from-red-600 hover:to-rose-600 text-white border-rose-400/40 shadow-rose-900/50'
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
