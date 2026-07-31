/**
 * مسار الدعاوى فقط — بلا executionArchiveFilterUtils / utils / SecureStore.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue } from 'react';
import { isLawsuitArchived, isLawsuitInTrash } from '@/app/utils/lawsuitTrash';
import { prefetchCriminalDashboard } from '@/app/utils/lazyComponentsIntent';
import type { ArchivePortalProps } from '@/app/types/common';
import type { ArchiveDossierViewMode } from '../components/ArchiveDossierToolbar';
import {
    filterByLawsuitJurisdictionTab,
    type LawsuitJurisdictionTab,
} from '@/app/domain/lawsuit/lawsuitJurisdiction';
import { criminalSearchHaystack } from '../criminalArchiveUtils';
import type { LooseArchiveFile } from '../types';
import { computeLawsuitArchiveEnrichedFiles } from '../lawsuitArchiveEnrichment';

export type LawsuitViewMode = 'active' | 'trash' | 'archived';

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
>;

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
}: UseLawsuitArchivePortalControllerParams) {
    const [internalSearchOpen, setInternalSearchOpen] = useState(false);
    const [internalSearchQuery, setInternalSearchQuery] = useState('');
    const [lawsuitJurisdictionTab, setLawsuitJurisdictionTab] = useState<LawsuitJurisdictionTab>(
        initialLawsuitJurisdictionTab ?? 'all',
    );
    const viewingCriminal = lawsuitJurisdictionTab === 'criminal';
    const [internalViewMode, setInternalViewMode] = useState<ArchiveDossierViewMode>('grid');

    const dossierSearchOpen = dossierSearchOpenProp ?? internalSearchOpen;
    const setDossierSearchOpen = useCallback(
        (open: boolean | ((prev: boolean) => boolean)) => {
            const next = typeof open === 'function' ? open(dossierSearchOpen) : open;
            if (dossierSearchOpenProp === undefined) setInternalSearchOpen(next);
            onDossierSearchOpenChange?.(next);
        },
        [dossierSearchOpen, dossierSearchOpenProp, onDossierSearchOpenChange],
    );
    const dossierSearchQuery = dossierSearchQueryProp ?? internalSearchQuery;
    const deferredDossierSearchQuery = useDeferredValue(dossierSearchQuery);
    const setDossierSearchQuery = useCallback(
        (query: string) => {
            if (dossierSearchQueryProp === undefined) setInternalSearchQuery(query);
            onDossierSearchQueryChange?.(query);
        },
        [dossierSearchQueryProp, onDossierSearchQueryChange],
    );
    const dossierViewMode = dossierViewModeProp ?? internalViewMode;
    const setDossierViewMode = useCallback(
        (mode: ArchiveDossierViewMode) => {
            if (dossierViewModeProp === undefined) setInternalViewMode(mode);
            onDossierViewModeChange?.(mode);
        },
        [dossierViewModeProp, onDossierViewModeChange],
    );
    const [criminalCardsReady, setCriminalCardsReady] = useState(
        () => (initialLawsuitJurisdictionTab ?? 'all') === 'criminal',
    );

    useEffect(() => {
        if (initialLawsuitJurisdictionTab) {
            setLawsuitJurisdictionTab(initialLawsuitJurisdictionTab);
        }
    }, [initialLawsuitJurisdictionTab]);

    const setLawsuitJurisdictionTabWithPrefetch = useCallback((value: LawsuitJurisdictionTab) => {
        if (value === 'criminal') prefetchCriminalDashboard();
        setLawsuitJurisdictionTab(value);
        if (value === 'criminal' || value === 'all') {
            setCriminalCardsReady(true);
        }
    }, []);

    useEffect(() => {
        if (lawsuitJurisdictionTab === 'criminal') {
            prefetchCriminalDashboard();
            setCriminalCardsReady(true);
            return;
        }
        if (lawsuitJurisdictionTab !== 'all') {
            setCriminalCardsReady(false);
            return;
        }
        // تاب «الكل»: مدني أولاً ثم جزائي بعد إطار — يقلل أول commit
        setCriminalCardsReady(false);
        let cancelled = false;
        const id = window.requestAnimationFrame(() => {
            if (!cancelled) setCriminalCardsReady(true);
        });
        return () => {
            cancelled = true;
            window.cancelAnimationFrame(id);
        };
    }, [lawsuitJurisdictionTab]);

    const [criminalDeleteTarget, setCriminalDeleteTarget] = useState<{
        id: string;
        title: string;
    } | null>(null);
    const [lawsuitViewMode, setLawsuitViewMode] = useState<LawsuitViewMode>('active');
    const [lawsuitTrashConfirmTarget, setLawsuitTrashConfirmTarget] = useState<LooseArchiveFile | null>(
        null,
    );
    const [selectedTrashIds, setSelectedTrashIds] = useState<Set<string>>(new Set());
    const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false);
    const permanentIdsRef = useRef<Array<string | number>>([]);

    const lawsuitTrashedCount = useMemo(
        () => files.filter((f) => isLawsuitInTrash(f as LooseArchiveFile)).length,
        [files],
    );

    const lawsuitArchivedCount = useMemo(
        () => files.filter((f) => isLawsuitArchived(f as LooseArchiveFile)).length,
        [files],
    );

    const criminalArchivedCount = useMemo(() => {
        if (!criminalCardsReady && lawsuitJurisdictionTab !== 'criminal') return 0;
        return (Array.isArray(criminalCases) ? criminalCases : []).filter((raw) => {
            if (!raw || typeof raw !== 'object') return false;
            const c = raw as Record<string, unknown>;
            const mergedInto = String(c.mergedIntoCaseId ?? '').trim();
            return Boolean(c.isArchived) || Boolean(mergedInto);
        }).length;
    }, [criminalCases, criminalCardsReady, lawsuitJurisdictionTab]);

    const unifiedArchivedCount = lawsuitArchivedCount + criminalArchivedCount;

    useEffect(() => {
        if (lawsuitViewMode !== 'trash') setSelectedTrashIds(new Set());
    }, [lawsuitViewMode]);

    const toggleTrashSelect = useCallback((id: string | number) => {
        const k = String(id);
        setSelectedTrashIds((prev) => {
            const next = new Set(prev);
            if (next.has(k)) next.delete(k);
            else next.add(k);
            return next;
        });
    }, []);

    const getTitle = () => {
        if (lawsuitViewMode === 'trash') return 'سلة مهملات الإضابير';
        if (lawsuitViewMode === 'archived') return 'مخزن أرشيف الإضابير';
        return 'إدارة الدعاوى القضائية (الشاملة) ⚖️';
    };

    const filteredLawsuitFiles = useMemo(() => {
        let filtered: typeof files;
        if (lawsuitViewMode === 'trash') {
            filtered = files.filter((f) => isLawsuitInTrash(f as LooseArchiveFile));
        } else if (lawsuitViewMode === 'archived') {
            filtered = files.filter((f) => isLawsuitArchived(f as LooseArchiveFile));
        } else {
            filtered = files.filter((f) => {
                const s = (f as LooseArchiveFile).status;
                return s !== 'deleted' && s !== 'archived';
            });
        }
        if (lawsuitJurisdictionTab === 'criminal') {
            filtered = [] as typeof filtered;
        } else if (lawsuitJurisdictionTab !== 'all') {
            filtered = filterByLawsuitJurisdictionTab(
                filtered as LooseArchiveFile[],
                lawsuitJurisdictionTab,
            ) as typeof filtered;
        }
        const q = deferredDossierSearchQuery.trim().toLowerCase();
        if (q) {
            filtered = filtered.filter((f) => {
                const row = f as LooseArchiveFile;
                const parties = Array.isArray(row.parties) ? row.parties : [];
                const partyNames = parties
                    .map((p) =>
                        p && typeof p === 'object' && 'name' in p
                            ? String((p as { name?: string }).name)
                            : '',
                    )
                    .join(' ');
                const hay = [row.caseNo, row.caseNumber, row.title, row.docType, row.court, partyNames]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return hay.includes(q);
            });
        }
        return filtered;
    }, [files, lawsuitViewMode, lawsuitJurisdictionTab, deferredDossierSearchQuery]);

    const filteredCriminalCases = useMemo(() => {
        if (!criminalCardsReady && lawsuitJurisdictionTab !== 'criminal') return [];
        if (
            lawsuitViewMode === 'active' &&
            lawsuitJurisdictionTab !== 'criminal' &&
            lawsuitJurisdictionTab !== 'all'
        ) {
            return [];
        }
        if (lawsuitViewMode === 'trash') return [];

        let list = (Array.isArray(criminalCases) ? criminalCases : []).filter((raw) => {
            if (!raw || typeof raw !== 'object') return false;
            const c = raw as Record<string, unknown>;
            const mergedInto = String(c.mergedIntoCaseId ?? '').trim();
            const archived = Boolean(c.isArchived) || Boolean(mergedInto);
            if (lawsuitViewMode === 'archived') return archived;
            return !archived;
        }) as Record<string, unknown>[];
        const q = deferredDossierSearchQuery.trim().toLowerCase();
        if (q) {
            list = list.filter((c) => criminalSearchHaystack(c).includes(q));
        }
        list.sort((a, b) => {
            const at = typeof a.createdAt === 'string' ? Date.parse(a.createdAt) : 0;
            const bt = typeof b.createdAt === 'string' ? Date.parse(b.createdAt) : 0;
            return bt - at;
        });
        return list;
    }, [
        lawsuitViewMode,
        lawsuitJurisdictionTab,
        criminalCases,
        deferredDossierSearchQuery,
        criminalCardsReady,
    ]);

    const isUnifiedLifecycleView = lawsuitViewMode !== 'active';
    const showLawsuitCardsInGrid = isUnifiedLifecycleView || !viewingCriminal;
    const showCriminalCardsInGrid =
        lawsuitViewMode !== 'trash' &&
        (isUnifiedLifecycleView ||
            viewingCriminal ||
            (lawsuitViewMode === 'active' &&
                lawsuitJurisdictionTab === 'all' &&
                criminalCardsReady));

    const enrichedFiles = useMemo(
        () => computeLawsuitArchiveEnrichedFiles(filteredLawsuitFiles),
        [filteredLawsuitFiles],
    );

    const selectAllTrashedInView = useCallback(() => {
        const ids = new Set(filteredLawsuitFiles.map((f) => String((f as LooseArchiveFile).id)));
        setSelectedTrashIds(ids);
    }, [filteredLawsuitFiles]);

    const beginPermanentDeleteFlow = useCallback(() => {
        if (selectedTrashIds.size === 0) return;
        if (!onPermanentlyDeleteLawsuits) return;
        permanentIdsRef.current = Array.from(selectedTrashIds).map((k) => {
            const hit = files.find((x) => String((x as LooseArchiveFile).id) === k);
            return (hit as LooseArchiveFile | undefined)?.id ?? k;
        });
        setPermanentDeleteOpen(true);
    }, [selectedTrashIds, files, onPermanentlyDeleteLawsuits]);

    const beginPermanentDeleteForIds = useCallback(
        (ids: Array<string | number>) => {
            if (ids.length === 0) return;
            if (!onPermanentlyDeleteLawsuits) return;
            permanentIdsRef.current = ids;
            setPermanentDeleteOpen(true);
        },
        [onPermanentlyDeleteLawsuits],
    );

    const confirmPermanentDelete = useCallback(() => {
        const ids = permanentIdsRef.current;
        if (ids.length === 0) {
            setPermanentDeleteOpen(false);
            return;
        }
        onPermanentlyDeleteLawsuits?.(ids);
        setPermanentDeleteOpen(false);
        setSelectedTrashIds(new Set());
        permanentIdsRef.current = [];
    }, [onPermanentlyDeleteLawsuits]);

    const hasLawsuitLifecycle = Boolean(
        onMoveLawsuitToTrash ||
            onArchiveLawsuit ||
            onRestoreLawsuitFromTrash ||
            onPermanentlyDeleteLawsuits,
    );

    return {
        dossierSearchOpen,
        setDossierSearchOpen,
        dossierSearchQuery,
        setDossierSearchQuery,
        lawsuitJurisdictionTab,
        setLawsuitJurisdictionTab: setLawsuitJurisdictionTabWithPrefetch,
        viewingCriminal,
        dossierViewMode,
        setDossierViewMode,
        criminalDeleteTarget,
        setCriminalDeleteTarget,
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
        lawsuitViewMode,
        setLawsuitViewMode,
        trashConfirmTarget: null,
        setTrashConfirmTarget: () => undefined,
        archiveConfirmTarget: null,
        setArchiveConfirmTarget: () => undefined,
        lawsuitTrashConfirmTarget,
        setLawsuitTrashConfirmTarget,
        selectedTrashIds,
        setSelectedTrashIds,
        permanentDeleteOpen,
        setPermanentDeleteOpen,
        confirmPermanentDelete,
        beginPermanentDeleteForIds,
        permanentIdsRef,
        previewTimelineEvents: [],
        executionTrashedCountForFilter: 0,
        executionTrashedCountTotal: 0,
        executionJurisdictionCountsForView: {},
        lawsuitTrashedCount,
        unifiedArchivedCount,
        toggleTrashSelect,
        getTitle,
        filteredExecutionFiles: [] as typeof files,
        filteredLawsuitFiles,
        filteredCriminalCases,
        showLawsuitCardsInGrid,
        showCriminalCardsInGrid,
        showDossierToolbar: true,
        enrichedFiles,
        selectAllTrashedInView,
        beginPermanentDeleteFlow,
        hasLawsuitLifecycle,
        hasExecutionLifecycle: false,
        executionFilterSummary: '',
    };
}
