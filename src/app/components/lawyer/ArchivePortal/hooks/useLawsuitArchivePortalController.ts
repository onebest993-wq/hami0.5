/**
 * مسار الدعاوى فقط — بلا stubs تنفيذ / SecureStore.
 */
import { useCallback, useDeferredValue, useMemo, type MutableRefObject } from 'react';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import type { ArchivePortalProps } from '@/app/types/common';
import { computeLawsuitArchiveEnrichedFiles } from '../lawsuitArchiveEnrichment';
import type { LawsuitLifecycleCounts } from '@/app/domain/lawsuit/lawsuitLifecycleIndex';
import { useLawsuitArchivePortalDossierState } from './useLawsuitArchivePortalDossierState';
import { useLawsuitArchivePortalTrashState } from './useLawsuitArchivePortalTrashState';
import {
    countCriminalArchivedCases,
    filterLawsuitArchiveFiles,
    filterLawsuitCriminalCases,
    resolveLawsuitLifecycleSourceFiles,
} from './lawsuitArchivePortalFiltering';
import type { LooseArchiveFile, ArchiveEnrichedRow } from '../types';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import type { LawsuitViewMode } from './lawsuitLifecycleTypes';
import type { ArchiveDossierViewMode } from '../components/ArchiveDossierToolbar';

type UseLawsuitArchivePortalControllerParams = Pick<
    ArchivePortalProps,
    | 'files'
    | 'criminalCases'
    | 'initialLawsuitJurisdictionTab'
    | 'onPermanentlyDeleteLawsuits'
    | 'onMoveLawsuitToTrash'
    | 'onArchiveLawsuit'
    | 'onRestoreLawsuitFromTrash'
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

/** سطح العرض لمسار الدعاوى فقط — بلا حقول تنفيذ وهمية. */
export type LawsuitArchivePortalViewModel = {
    dossierSearchQuery: string;
    setDossierSearchQuery: (q: string) => void;
    lawsuitJurisdictionTab: LawsuitJurisdictionTab;
    setLawsuitJurisdictionTab: (v: LawsuitJurisdictionTab) => void;
    viewingCriminal: boolean;
    dossierViewMode: ArchiveDossierViewMode;
    setDossierViewMode: (m: ArchiveDossierViewMode) => void;
    criminalDeleteTarget: { id: string; title: string } | null;
    setCriminalDeleteTarget: (t: { id: string; title: string } | null) => void;
    lawsuitViewMode: LawsuitViewMode;
    setLawsuitViewMode: (m: LawsuitViewMode) => void;
    lawsuitTrashConfirmTarget: LooseArchiveFile | null;
    setLawsuitTrashConfirmTarget: (f: LooseArchiveFile | null) => void;
    selectedTrashIds: Set<string>;
    setSelectedTrashIds: (s: Set<string>) => void;
    permanentDeleteOpen: boolean;
    setPermanentDeleteOpen: (o: boolean) => void;
    confirmPermanentDelete: () => void;
    permanentIdsRef: MutableRefObject<Array<string | number>>;
    lawsuitTrashedCount: number;
    unifiedArchivedCount: number;
    toggleTrashSelect: (id: string | number) => void;
    getTitle: () => string;
    filteredCriminalCases: Array<Record<string, unknown> & { id?: string | number }>;
    showLawsuitCardsInGrid: boolean;
    showCriminalCardsInGrid: boolean;
    enrichedFiles: ArchiveEnrichedRow[];
    selectAllTrashedInView: () => void;
    beginPermanentDeleteFlow: () => void;
    hasLawsuitLifecycle: boolean;
};

export function useLawsuitArchivePortalController({
    files,
    criminalCases,
    initialLawsuitJurisdictionTab,
    onPermanentlyDeleteLawsuits,
    onMoveLawsuitToTrash,
    onArchiveLawsuit,
    onRestoreLawsuitFromTrash,
    dossierSearchQuery: dossierSearchQueryProp,
    onDossierSearchQueryChange,
    dossierViewMode: dossierViewModeProp,
    onDossierViewModeChange,
    lawsuitLifecycleCounts,
    lawsuitArchivedFiles,
    lawsuitTrashFiles,
    onEnsureLawsuitArchivedLoaded,
    onEnsureLawsuitTrashLoaded,
}: UseLawsuitArchivePortalControllerParams): LawsuitArchivePortalViewModel {
    const dossier = useLawsuitArchivePortalDossierState({
        initialLawsuitJurisdictionTab,
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
        dossierSearchQuery: dossier.dossierSearchQuery,
        setDossierSearchQuery: dossier.setDossierSearchQuery,
        lawsuitJurisdictionTab: dossier.lawsuitJurisdictionTab,
        setLawsuitJurisdictionTab: dossier.setLawsuitJurisdictionTab,
        viewingCriminal: dossier.viewingCriminal,
        dossierViewMode: dossier.dossierViewMode,
        setDossierViewMode: dossier.setDossierViewMode,
        criminalDeleteTarget: trash.criminalDeleteTarget,
        setCriminalDeleteTarget: trash.setCriminalDeleteTarget,
        lawsuitViewMode: trash.lawsuitViewMode,
        setLawsuitViewMode: trash.setLawsuitViewMode,
        lawsuitTrashConfirmTarget: trash.lawsuitTrashConfirmTarget,
        setLawsuitTrashConfirmTarget: trash.setLawsuitTrashConfirmTarget,
        selectedTrashIds: trash.selectedTrashIds,
        setSelectedTrashIds: trash.setSelectedTrashIds,
        permanentDeleteOpen: trash.permanentDeleteOpen,
        setPermanentDeleteOpen: trash.setPermanentDeleteOpen,
        confirmPermanentDelete: trash.confirmPermanentDelete,
        permanentIdsRef: trash.permanentIdsRef,
        lawsuitTrashedCount: trash.lawsuitTrashedCount,
        unifiedArchivedCount,
        toggleTrashSelect: trash.toggleTrashSelect,
        getTitle: trash.getTitle,
        filteredCriminalCases,
        showLawsuitCardsInGrid,
        showCriminalCardsInGrid,
        enrichedFiles,
        selectAllTrashedInView,
        beginPermanentDeleteFlow,
        hasLawsuitLifecycle: trash.hasLawsuitLifecycle,
    };
}
