// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isLawsuitArchived, isLawsuitInTrash } from '@/app/utils/lawsuitTrash';
import { prefetchCriminalDashboard } from '@/app/utils/lazyComponents';
import type { ArchivePortalProps } from '@/app/types/common';
import type { ExecutionArchiveFilter } from '../components/ExecutionArchiveToolbar';
import {
    EXECUTION_JURISDICTION_LABELS,
    EXECUTION_PERSPECTIVE_LABELS,
    buildExecutionJurisdictionCounts,
    filterExecutionArchiveFiles,
    getExecutionArchiveBasePool,
    type ExecutionPerspectiveFilter,
    type ExecutionViewMode,
} from '../executionArchiveFilterUtils';
import type { ArchiveDossierViewMode } from '../components/ArchiveDossierToolbar';
import {
    filterByLawsuitJurisdictionTab,
    type LawsuitJurisdictionTab,
} from '@/app/domain/lawsuit/lawsuitJurisdiction';
import { criminalSearchHaystack } from '../criminalArchiveUtils';
import type { LooseArchiveFile } from '../types';
import { computeArchiveEnrichedFiles } from '../archivePortalEnrichment';
import { mergedPreviewTimelineEvents } from '../utils';

export type LawsuitViewMode = 'active' | 'trash' | 'archived';

export type UseArchivePortalControllerParams = Pick<
    ArchivePortalProps,
    | 'type'
    | 'files'
    | 'criminalCases'
    | 'initialLawsuitJurisdictionTab'
    | 'onPermanentlyDeleteExecutions'
    | 'onPermanentlyDeleteLawsuits'
    | 'onMoveLawsuitToTrash'
    | 'onArchiveLawsuit'
    | 'onRestoreLawsuitFromTrash'
    | 'onMoveExecutionToTrash'
    | 'onRestoreExecutionFromTrash'
    | 'onArchiveExecution'
    | 'onRestoreArchivedExecution'
>;

export function useArchivePortalController({
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
}: UseArchivePortalControllerParams) {
    const [dossierSearchOpen, setDossierSearchOpen] = useState(false);
    const [dossierSearchQuery, setDossierSearchQuery] = useState('');
    const [lawsuitJurisdictionTab, setLawsuitJurisdictionTab] = useState<LawsuitJurisdictionTab>(
        initialLawsuitJurisdictionTab ?? 'all',
    );
    const viewingCriminal =
        type === 'criminal' || (type === 'lawsuits' && lawsuitJurisdictionTab === 'criminal');
    const [dossierViewMode, setDossierViewMode] = useState<ArchiveDossierViewMode>('grid');

    useEffect(() => {
        if (initialLawsuitJurisdictionTab) {
            setLawsuitJurisdictionTab(initialLawsuitJurisdictionTab);
        }
    }, [initialLawsuitJurisdictionTab]);

    const setLawsuitJurisdictionTabWithPrefetch = useCallback((value: LawsuitJurisdictionTab) => {
        if (value === 'criminal') prefetchCriminalDashboard();
        setLawsuitJurisdictionTab(value);
    }, []);

    useEffect(() => {
        if (type === 'lawsuits' && lawsuitJurisdictionTab === 'criminal') {
            prefetchCriminalDashboard();
        }
    }, [lawsuitJurisdictionTab, type]);

    const [criminalDeleteTarget, setCriminalDeleteTarget] = useState<{
        id: string;
        title: string;
    } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<ExecutionArchiveFilter>('all');
    const [perspectiveFilter, setPerspectiveFilter] = useState<ExecutionPerspectiveFilter>('all');
    const [executionPreviewFile, setExecutionPreviewFile] = useState<LooseArchiveFile | null>(null);
    const [executionViewMode, setExecutionViewMode] = useState<ExecutionViewMode>('active');
    const [lawsuitViewMode, setLawsuitViewMode] = useState<LawsuitViewMode>('active');

    const [trashConfirmTarget, setTrashConfirmTarget] = useState<LooseArchiveFile | null>(null);
    const [archiveConfirmTarget, setArchiveConfirmTarget] = useState<LooseArchiveFile | null>(null);
    const [lawsuitTrashConfirmTarget, setLawsuitTrashConfirmTarget] = useState<LooseArchiveFile | null>(null);
    const [selectedTrashIds, setSelectedTrashIds] = useState<Set<string>>(new Set());
    const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false);
    const permanentIdsRef = useRef<Array<string | number>>([]);

    const previewTimelineEvents = useMemo(
        () => mergedPreviewTimelineEvents(executionPreviewFile),
        [executionPreviewFile],
    );

    const executionActivePool = useMemo(() => {
        if (type !== 'executions') return [] as LooseArchiveFile[];
        return getExecutionArchiveBasePool(files as LooseArchiveFile[], 'active');
    }, [files, type]);

    const executionTrashPool = useMemo(() => {
        if (type !== 'executions') return [] as LooseArchiveFile[];
        return getExecutionArchiveBasePool(files as LooseArchiveFile[], 'trash');
    }, [files, type]);

    const executionActiveCountByJurisdiction = useMemo(
        () => buildExecutionJurisdictionCounts(executionActivePool),
        [executionActivePool],
    );

    const executionTrashCountByJurisdiction = useMemo(
        () => buildExecutionJurisdictionCounts(executionTrashPool),
        [executionTrashPool],
    );

    const executionArchivedPool = useMemo(() => {
        if (type !== 'executions') return [] as LooseArchiveFile[];
        return getExecutionArchiveBasePool(files as LooseArchiveFile[], 'archived');
    }, [files, type]);

    const executionArchivedCountByJurisdiction = useMemo(
        () => buildExecutionJurisdictionCounts(executionArchivedPool),
        [executionArchivedPool],
    );

    const executionArchivedCount = executionArchivedPool.length;

    const executionTrashedCountTotal = executionTrashPool.length;

    const executionTrashedCountForFilter = executionTrashCountByJurisdiction[filterType];

    const executionJurisdictionCountsForView =
        executionViewMode === 'trash'
            ? executionTrashCountByJurisdiction
            : executionViewMode === 'archived'
              ? executionArchivedCountByJurisdiction
              : executionActiveCountByJurisdiction;

    const lawsuitTrashedCount = useMemo(() => {
        if (type !== 'lawsuits') return 0;
        return files.filter((f) => isLawsuitInTrash(f as LooseArchiveFile)).length;
    }, [files, type]);

    const lawsuitArchivedCount = useMemo(() => {
        if (type !== 'lawsuits') return 0;
        return files.filter((f) => isLawsuitArchived(f as LooseArchiveFile)).length;
    }, [files, type]);

    const criminalArchivedCount = useMemo(() => {
        if (type !== 'lawsuits') return 0;
        return (Array.isArray(criminalCases) ? criminalCases : []).filter((raw) => {
            if (!raw || typeof raw !== 'object') return false;
            const c = raw as Record<string, unknown>;
            const mergedInto = String(c.mergedIntoCaseId ?? '').trim();
            return Boolean(c.isArchived) || Boolean(mergedInto);
        }).length;
    }, [type, criminalCases]);

    const unifiedArchivedCount = lawsuitArchivedCount + criminalArchivedCount;

    useEffect(() => {
        if (executionViewMode !== 'trash') setSelectedTrashIds(new Set());
    }, [executionViewMode]);

    useEffect(() => {
        setSearchQuery('');
        setFilterType('all');
        setPerspectiveFilter('all');
    }, [executionViewMode]);

    useEffect(() => {
        if (perspectiveFilter === 'legal_entity') {
            setPerspectiveFilter('all');
        }
    }, [perspectiveFilter]);

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
        if (type === 'lawsuits' && lawsuitViewMode === 'trash') return 'سلة مهملات الإضابير';
        if (type === 'lawsuits' && lawsuitViewMode === 'archived') return 'مخزن أرشيف الإضابير';
        if (type === 'lawsuits') return 'إدارة الدعاوى القضائية (الشاملة) ⚖️';
        if (type === 'transaction') return 'سجل المعاملات';
        if (type === 'executions' && executionViewMode === 'trash') return 'سلة مهملات الإضابير التنفيذية';
        if (type === 'executions' && executionViewMode === 'archived') return 'مخزن أرشيف الإضابير التنفيذية';
        if (type === 'executions') return 'مخزن الأضابير التنفيذية';
        if (type === 'deleted') return 'سلة المحذوفات';
        return 'الأرشيف الشامل';
    };

    const filteredExecutionFiles = useMemo(() => {
        if (type !== 'executions') return files;
        return filterExecutionArchiveFiles(files as LooseArchiveFile[], {
            mode: executionViewMode,
            jurisdiction: filterType,
            perspective: perspectiveFilter,
            searchQuery,
        });
    }, [files, type, filterType, perspectiveFilter, searchQuery, executionViewMode]);

    const filteredLawsuitFiles = useMemo(() => {
        if (type !== 'lawsuits') return files;
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
        const q = dossierSearchQuery.trim().toLowerCase();
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
    }, [files, type, lawsuitViewMode, lawsuitJurisdictionTab, dossierSearchQuery]);

    const filteredCriminalCases = useMemo(() => {
        if (type !== 'lawsuits') return [];
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
        const q = dossierSearchQuery.trim().toLowerCase();
        if (q) {
            list = list.filter((c) => criminalSearchHaystack(c).includes(q));
        }
        list.sort((a, b) => {
            const at = typeof a.createdAt === 'string' ? Date.parse(a.createdAt) : 0;
            const bt = typeof b.createdAt === 'string' ? Date.parse(b.createdAt) : 0;
            return bt - at;
        });
        return list;
    }, [type, lawsuitViewMode, lawsuitJurisdictionTab, criminalCases, dossierSearchQuery]);

    const isUnifiedLifecycleView = type === 'lawsuits' && lawsuitViewMode !== 'active';
    const showLawsuitCardsInGrid =
        type === 'lawsuits' && (isUnifiedLifecycleView || !viewingCriminal);
    const showCriminalCardsInGrid =
        type === 'lawsuits' &&
        lawsuitViewMode !== 'trash' &&
        (isUnifiedLifecycleView ||
            viewingCriminal ||
            (lawsuitViewMode === 'active' && lawsuitJurisdictionTab === 'all'));

    const showDossierToolbar = type === 'lawsuits' || type === 'criminal';

    const enrichedFiles = useMemo(
        () => computeArchiveEnrichedFiles(type, files, filteredExecutionFiles, filteredLawsuitFiles),
        [files, filteredExecutionFiles, filteredLawsuitFiles, type],
    );

    const trashedFilesInView = type === 'lawsuits' ? filteredLawsuitFiles : filteredExecutionFiles;

    const selectAllTrashedInView = useCallback(() => {
        const ids = new Set(trashedFilesInView.map((f) => String((f as LooseArchiveFile).id)));
        setSelectedTrashIds(ids);
    }, [trashedFilesInView]);

    const beginPermanentDeleteFlow = useCallback(() => {
        if (selectedTrashIds.size === 0) return;
        if (type === 'lawsuits' && !onPermanentlyDeleteLawsuits) return;
        if (type !== 'lawsuits' && !onPermanentlyDeleteExecutions) return;
        permanentIdsRef.current = Array.from(selectedTrashIds).map((k) => {
            const hit = files.find((x) => String((x as LooseArchiveFile).id) === k);
            return (hit as LooseArchiveFile | undefined)?.id ?? k;
        });
        setPermanentDeleteOpen(true);
    }, [selectedTrashIds, files, onPermanentlyDeleteExecutions, onPermanentlyDeleteLawsuits, type]);

    const beginPermanentDeleteForIds = useCallback(
        (ids: Array<string | number>) => {
            if (ids.length === 0) return;
            if (type === 'lawsuits' && !onPermanentlyDeleteLawsuits) return;
            if (type !== 'lawsuits' && !onPermanentlyDeleteExecutions) return;
            permanentIdsRef.current = ids;
            setPermanentDeleteOpen(true);
        },
        [onPermanentlyDeleteExecutions, onPermanentlyDeleteLawsuits, type],
    );

    const confirmPermanentDelete = useCallback(() => {
        const ids = permanentIdsRef.current;
        if (ids.length === 0) {
            setPermanentDeleteOpen(false);
            return;
        }
        if (type === 'lawsuits') {
            onPermanentlyDeleteLawsuits?.(ids);
        } else {
            onPermanentlyDeleteExecutions?.(ids);
        }
        setPermanentDeleteOpen(false);
        setSelectedTrashIds(new Set());
        permanentIdsRef.current = [];
    }, [onPermanentlyDeleteExecutions, onPermanentlyDeleteLawsuits, type]);

    const hasLawsuitLifecycle =
        type === 'lawsuits' &&
        Boolean(
            onMoveLawsuitToTrash ||
                onArchiveLawsuit ||
                onRestoreLawsuitFromTrash ||
                onPermanentlyDeleteLawsuits,
        );

    const hasExecutionLifecycle =
        type === 'executions' &&
        Boolean(
            onMoveExecutionToTrash ||
                onArchiveExecution ||
                onRestoreExecutionFromTrash ||
                onRestoreArchivedExecution ||
                onPermanentlyDeleteExecutions,
        );

    const executionFilterSummary = useMemo(() => {
        const parts: string[] = [];
        if (filterType !== 'all') parts.push(EXECUTION_JURISDICTION_LABELS[filterType]);
        if (perspectiveFilter !== 'all') parts.push(EXECUTION_PERSPECTIVE_LABELS[perspectiveFilter]);
        return parts.join(' · ');
    }, [filterType, perspectiveFilter]);

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
        executionTrashedCountForFilter,
        executionTrashedCountTotal,
        executionJurisdictionCountsForView,
        lawsuitTrashedCount,
        unifiedArchivedCount,
        toggleTrashSelect,
        getTitle,
        filteredExecutionFiles,
        filteredLawsuitFiles,
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
    };
}
