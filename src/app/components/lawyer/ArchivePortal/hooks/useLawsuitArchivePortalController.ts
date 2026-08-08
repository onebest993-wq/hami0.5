/**
 * مسار الدعاوى فقط — بلا executionArchiveFilterUtils / utils / SecureStore.
 */
import { useCallback, useDeferredValue, useMemo } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ArchivePortalProps } from '@/app/types/common';
import { computeLawsuitArchiveEnrichedFiles } from '../lawsuitArchiveEnrichment';
import type { LawsuitViewMode } from './lawsuitLifecycleTypes';
import type { LawsuitLifecycleCounts } from '@/app/domain/lawsuit/lawsuitLifecycleIndex';
import { useLawsuitArchivePortalDossierState } from './useLawsuitArchivePortalDossierState';
import { useLawsuitArchivePortalTrashState } from './useLawsuitArchivePortalTrashState';
import {
    countCriminalArchivedCases,
    filterLawsuitArchiveFiles,
    filterLawsuitCriminalCases,
    resolveLawsuitLifecycleSourceFiles,
} from './lawsuitArchivePortalFiltering';
import type { LooseArchiveFile } from '../types';

export type { LawsuitViewMode } from './lawsuitLifecycleTypes';

export type UseLawsuitArchivePortalControllerParams = Pick<
    ArchivePortalProps,
    | 'files'
    | 'criminalCases'
    | 'initialLawsuitJurisdictionTab'
    | 'onPermanentlyDeleteLawsuits'
    | 'onMoveLawsuitToTrash'
    | 'onArchiveLawsuit'
    | 'onRestoreLawsuitFromTrash'
    | 'dossierSearchOpen'
    | 'onDossierSearchOpenChange'
    | 'dossierSearchQuery'
    | 'onDossierSearchQueryChange'
    | 'dossierViewMode'
    | 'onDossierViewModeChange'
> & {
    lawsuitLifecycleCounts?: LawsuitLifecycleCounts;
    lawsuitArchivedFiles?: FileData[] | null;
    lawsuitTrashFiles?: FileData[] | null;
    onEnsureLawsuitArchivedLoaded?: () => void | Promise<void>;
    onEnsureLawsuitTrashLoaded?: () => void | Promise<void>;
};

export function useLawsuitArchivePortalController({
    files,
    criminalCases,
    initialLawsuitJurisdictionTab,
    onPermanentlyDeleteLawsuits,
    onMoveLawsuitToTrash,
    onArchiveLawsuit,
    onRestoreLawsuitFromTrash,
    dossierSearchOpen: dossierSearchOpenProp,
    onDossierSearchOpenChange,
    dossierSearchQuery: dossierSearchQueryProp,
    onDossierSearchQueryChange,
    dossierViewMode: dossierViewModeProp,
    onDossierViewModeChange,
    lawsuitLifecycleCounts,
    lawsuitArchivedFiles,
    lawsuitTrashFiles,
    onEnsureLawsuitArchivedLoaded,
    onEnsureLawsuitTrashLoaded,
}: UseLawsuitArchivePortalControllerParams) {
    const dossier = useLawsuitArchivePortalDossierState({
        initialLawsuitJurisdictionTab,
        dossierSearchOpen: dossierSearchOpenProp,
        onDossierSearchOpenChange,
        dossierSearchQuery: dossierSearchQueryProp,
        onDossierSearchQueryChange,
        dossierViewMode: dossierViewModeProp,
        onDossierViewModeChange,
    });

    const trash = useLawsuitArchivePortalTrashState({
        lawsuitLifecycleCounts,
        onEnsureLawsuitArchivedLoaded,
        onEnsureLawsuitTrashLoaded,
        onPermanentlyDeleteLawsuits,
        onMoveLawsuitToTrash,
        onArchiveLawsuit,
        onRestoreLawsuitFromTrash,
    });

    const deferredDossierSearchQuery = useDeferredValue(dossier.dossierSearchQuery);

    const lifecycleSourceFiles = useMemo(
        () =>
            resolveLawsuitLifecycleSourceFiles(
                trash.lawsuitViewMode,
                files,
                lawsuitArchivedFiles,
                lawsuitTrashFiles,
            ),
        [files, lawsuitArchivedFiles, lawsuitTrashFiles, trash.lawsuitViewMode],
    );

    const filteredLawsuitFiles = useMemo(
        () =>
            filterLawsuitArchiveFiles(
                lifecycleSourceFiles,
                dossier.lawsuitJurisdictionTab,
                deferredDossierSearchQuery,
            ),
        [lifecycleSourceFiles, dossier.lawsuitJurisdictionTab, deferredDossierSearchQuery],
    );

    const filteredCriminalCases = useMemo(
        () =>
            filterLawsuitCriminalCases(
                criminalCases,
                trash.lawsuitViewMode,
                dossier.lawsuitJurisdictionTab,
                deferredDossierSearchQuery,
                dossier.criminalCardsReady,
            ),
        [
            criminalCases,
            trash.lawsuitViewMode,
            dossier.lawsuitJurisdictionTab,
            deferredDossierSearchQuery,
            dossier.criminalCardsReady,
        ],
    );

    const criminalArchivedCount = useMemo(
        () =>
            countCriminalArchivedCases(
                criminalCases,
                dossier.criminalCardsReady,
                dossier.lawsuitJurisdictionTab,
            ),
        [criminalCases, dossier.criminalCardsReady, dossier.lawsuitJurisdictionTab],
    );

    const lawsuitArchivedCount = lawsuitLifecycleCounts?.archived ?? 0;
    const unifiedArchivedCount = lawsuitArchivedCount + criminalArchivedCount;

    const isUnifiedLifecycleView = trash.lawsuitViewMode !== 'active';
    const showLawsuitCardsInGrid = isUnifiedLifecycleView || !dossier.viewingCriminal;
    const showCriminalCardsInGrid =
        trash.lawsuitViewMode !== 'trash' &&
        (isUnifiedLifecycleView ||
            dossier.viewingCriminal ||
            (trash.lawsuitViewMode === 'active' &&
                dossier.lawsuitJurisdictionTab === 'all' &&
                dossier.criminalCardsReady));

    const enrichedFiles = useMemo(
        () => computeLawsuitArchiveEnrichedFiles(filteredLawsuitFiles),
        [filteredLawsuitFiles],
    );

    const selectAllTrashedInView = useCallback(() => {
        const ids = new Set(filteredLawsuitFiles.map((f) => String((f as LooseArchiveFile).id)));
        trash.setSelectedTrashIds(ids);
    }, [filteredLawsuitFiles, trash.setSelectedTrashIds]);

    const beginPermanentDeleteFlow = useCallback(() => {
        if (trash.selectedTrashIds.size === 0) return;
        if (!onPermanentlyDeleteLawsuits) return;
        trash.permanentIdsRef.current = Array.from(trash.selectedTrashIds).map((k) => {
            const hit =
                lifecycleSourceFiles.find((x) => String((x as LooseArchiveFile).id) === k) ??
                files.find((x) => String((x as LooseArchiveFile).id) === k);
            return (hit as LooseArchiveFile | undefined)?.id ?? k;
        });
        trash.setPermanentDeleteOpen(true);
    }, [
        trash.selectedTrashIds,
        trash.permanentIdsRef,
        trash.setPermanentDeleteOpen,
        lifecycleSourceFiles,
        files,
        onPermanentlyDeleteLawsuits,
    ]);

    return {
        dossierSearchOpen: dossier.dossierSearchOpen,
        setDossierSearchOpen: dossier.setDossierSearchOpen,
        dossierSearchQuery: dossier.dossierSearchQuery,
        setDossierSearchQuery: dossier.setDossierSearchQuery,
        lawsuitJurisdictionTab: dossier.lawsuitJurisdictionTab,
        setLawsuitJurisdictionTab: dossier.setLawsuitJurisdictionTab,
        viewingCriminal: dossier.viewingCriminal,
        dossierViewMode: dossier.dossierViewMode,
        setDossierViewMode: dossier.setDossierViewMode,
        criminalDeleteTarget: trash.criminalDeleteTarget,
        setCriminalDeleteTarget: trash.setCriminalDeleteTarget,
        searchQuery: '',
        setSearchQuery: () => undefined,
        filterType: 'all' as const,
        setFilterType: () => undefined,
        perspectiveFilter: 'all' as const,
        setPerspectiveFilter: () => undefined,
        executionPreviewFile: null,
        setExecutionPreviewFile: () => undefined,
        executionViewMode: 'active' as const,
        setExecutionViewMode: () => undefined,
        executionArchivedCount: 0,
        lawsuitViewMode: trash.lawsuitViewMode,
        setLawsuitViewMode: trash.setLawsuitViewMode,
        trashConfirmTarget: null,
        setTrashConfirmTarget: () => undefined,
        archiveConfirmTarget: null,
        setArchiveConfirmTarget: () => undefined,
        lawsuitTrashConfirmTarget: trash.lawsuitTrashConfirmTarget,
        setLawsuitTrashConfirmTarget: trash.setLawsuitTrashConfirmTarget,
        selectedTrashIds: trash.selectedTrashIds,
        setSelectedTrashIds: trash.setSelectedTrashIds,
        permanentDeleteOpen: trash.permanentDeleteOpen,
        setPermanentDeleteOpen: trash.setPermanentDeleteOpen,
        confirmPermanentDelete: trash.confirmPermanentDelete,
        beginPermanentDeleteForIds: trash.beginPermanentDeleteForIds,
        permanentIdsRef: trash.permanentIdsRef,
        previewTimelineEvents: [],
        executionTrashedCountForFilter: 0,
        executionTrashedCountTotal: 0,
        executionJurisdictionCountsForView: {},
        lawsuitTrashedCount: trash.lawsuitTrashedCount,
        unifiedArchivedCount,
        toggleTrashSelect: trash.toggleTrashSelect,
        getTitle: trash.getTitle,
        filteredExecutionFiles: [] as typeof files,
        filteredLawsuitFiles,
        filteredCriminalCases,
        showLawsuitCardsInGrid,
        showCriminalCardsInGrid,
        showDossierToolbar: true,
        enrichedFiles,
        selectAllTrashedInView,
        beginPermanentDeleteFlow,
        hasLawsuitLifecycle: trash.hasLawsuitLifecycle,
        hasExecutionLifecycle: false,
        executionFilterSummary: '',
    };
}
