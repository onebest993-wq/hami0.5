/**
 * مسار التنفيذ فقط — بلا منطق دعاوى/جزائي (يُدار في useLawsuitArchivePortalController).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ArchivePortalProps } from '@/app/types/common';
import type { ExecutionArchiveFilter } from '../components/ExecutionArchiveToolbar';
import {
    EXECUTION_DOSSIER_STATUS_LABELS,
    EXECUTION_JURISDICTION_LABELS,
    EXECUTION_PERSPECTIVE_LABELS,
    buildExecutionJurisdictionCounts,
    filterExecutionArchiveFiles,
    getExecutionArchiveBasePool,
    type ExecutionDossierStatusFilter,
    type ExecutionPerspectiveFilter,
    type ExecutionViewMode,
} from '../executionArchiveFilterUtils';
import type { LawsuitViewMode } from './lawsuitLifecycleTypes';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import type { LooseArchiveFile } from '../types';
import { computeExecutionArchiveEnrichedFiles } from '../executionArchiveEnrichment';
import { mergedPreviewTimelineEvents } from '../utils';

export type { LawsuitViewMode } from './lawsuitLifecycleTypes';

export type UseArchivePortalControllerParams = Pick<
    ArchivePortalProps,
    | 'files'
    | 'onPermanentlyDeleteExecutions'
    | 'onMoveExecutionToTrash'
    | 'onRestoreExecutionFromTrash'
    | 'onArchiveExecution'
    | 'onRestoreArchivedExecution'
>;

const LAWSUIT_PORTAL_STUB = {
    dossierSearchOpen: false,
    setDossierSearchOpen: (_open: boolean | ((prev: boolean) => boolean)) => undefined,
    dossierSearchQuery: '',
    setDossierSearchQuery: (_query: string) => undefined,
    lawsuitJurisdictionTab: 'all' as const,
    setLawsuitJurisdictionTab: (_value: LawsuitJurisdictionTab) => undefined,
    viewingCriminal: false,
    dossierViewMode: 'grid' as const,
    setDossierViewMode: (_mode: 'grid' | 'list') => undefined,
    criminalDeleteTarget: null as { id: string; title: string } | null,
    setCriminalDeleteTarget: (_target: { id: string; title: string } | null) => undefined,
    lawsuitViewMode: 'active' as LawsuitViewMode,
    setLawsuitViewMode: (_mode: LawsuitViewMode) => undefined,
    lawsuitTrashConfirmTarget: null as LooseArchiveFile | null,
    setLawsuitTrashConfirmTarget: (_file: LooseArchiveFile | null) => undefined,
    lawsuitTrashedCount: 0,
    unifiedArchivedCount: 0,
    filteredLawsuitFiles: [] as unknown[],
    filteredCriminalCases: [] as Record<string, unknown>[],
    showLawsuitCardsInGrid: false,
    showCriminalCardsInGrid: false,
    showDossierToolbar: false,
    hasLawsuitLifecycle: false,
};

export function useArchivePortalController({
    files: filesProp,
    onPermanentlyDeleteExecutions,
    onMoveExecutionToTrash,
    onRestoreExecutionFromTrash,
    onArchiveExecution,
    onRestoreArchivedExecution,
}: UseArchivePortalControllerParams) {
    const files = Array.isArray(filesProp) ? filesProp : [];
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<ExecutionArchiveFilter>('all');
    const [perspectiveFilter, setPerspectiveFilter] = useState<ExecutionPerspectiveFilter>('all');
    const [dossierStatusFilter, setDossierStatusFilter] =
        useState<ExecutionDossierStatusFilter>('all');
    const [executionPreviewFile, setExecutionPreviewFile] = useState<LooseArchiveFile | null>(null);
    const [executionViewMode, setExecutionViewMode] = useState<ExecutionViewMode>('active');

    const [trashConfirmTarget, setTrashConfirmTarget] = useState<LooseArchiveFile | null>(null);
    const [archiveConfirmTarget, setArchiveConfirmTarget] = useState<LooseArchiveFile | null>(null);
    const [selectedTrashIds, setSelectedTrashIds] = useState<Set<string>>(new Set());
    const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false);
    const permanentIdsRef = useRef<Array<string | number>>([]);

    const previewTimelineEvents = useMemo(
        () => mergedPreviewTimelineEvents(executionPreviewFile),
        [executionPreviewFile],
    );

    const executionActivePool = useMemo(
        () => getExecutionArchiveBasePool(files as LooseArchiveFile[], 'active'),
        [files],
    );

    const executionTrashPool = useMemo(
        () => getExecutionArchiveBasePool(files as LooseArchiveFile[], 'trash'),
        [files],
    );

    const executionActiveCountByJurisdiction = useMemo(
        () => buildExecutionJurisdictionCounts(executionActivePool),
        [executionActivePool],
    );

    const executionTrashCountByJurisdiction = useMemo(
        () => buildExecutionJurisdictionCounts(executionTrashPool),
        [executionTrashPool],
    );

    const executionArchivedPool = useMemo(
        () => getExecutionArchiveBasePool(files as LooseArchiveFile[], 'archived'),
        [files],
    );

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
        if (executionViewMode === 'trash') return 'سلة مهملات الإضابير التنفيذية';
        if (executionViewMode === 'archived') return 'مخزن أرشيف الإضابير التنفيذية';
        return 'مخزن الأضابير التنفيذية';
    };

    const filteredExecutionFiles = useMemo(
        () =>
            filterExecutionArchiveFiles(files as LooseArchiveFile[], {
                mode: executionViewMode,
                jurisdiction: filterType,
                perspective: perspectiveFilter,
                dossierStatus: dossierStatusFilter,
                searchQuery,
            }),
        [files, filterType, perspectiveFilter, dossierStatusFilter, searchQuery, executionViewMode],
    );

    const enrichedFiles = useMemo(
        () => computeExecutionArchiveEnrichedFiles(files, filteredExecutionFiles),
        [files, filteredExecutionFiles],
    );

    const selectAllTrashedInView = useCallback(() => {
        const ids = new Set(
            filteredExecutionFiles.map((f) => String((f as LooseArchiveFile).id)),
        );
        setSelectedTrashIds(ids);
    }, [filteredExecutionFiles]);

    const beginPermanentDeleteFlow = useCallback(() => {
        if (selectedTrashIds.size === 0 || !onPermanentlyDeleteExecutions) return;
        permanentIdsRef.current = Array.from(selectedTrashIds).map((k) => {
            const hit = files.find((x) => String((x as LooseArchiveFile).id) === k);
            return (hit as LooseArchiveFile | undefined)?.id ?? k;
        });
        setPermanentDeleteOpen(true);
    }, [selectedTrashIds, files, onPermanentlyDeleteExecutions]);

    const beginPermanentDeleteForIds = useCallback(
        (ids: Array<string | number>) => {
            if (ids.length === 0 || !onPermanentlyDeleteExecutions) return;
            permanentIdsRef.current = ids;
            setPermanentDeleteOpen(true);
        },
        [onPermanentlyDeleteExecutions],
    );

    const confirmPermanentDelete = useCallback(() => {
        const ids = permanentIdsRef.current;
        if (ids.length === 0) {
            setPermanentDeleteOpen(false);
            return;
        }
        onPermanentlyDeleteExecutions?.(ids);
        setPermanentDeleteOpen(false);
        setSelectedTrashIds(new Set());
        permanentIdsRef.current = [];
    }, [onPermanentlyDeleteExecutions]);

    const hasExecutionLifecycle = Boolean(
        onMoveExecutionToTrash ||
            onArchiveExecution ||
            onRestoreExecutionFromTrash ||
            onRestoreArchivedExecution ||
            onPermanentlyDeleteExecutions,
    );

    const executionFilterSummary = useMemo(() => {
        const parts: string[] = [];
        if (dossierStatusFilter !== 'all') {
            parts.push(EXECUTION_DOSSIER_STATUS_LABELS[dossierStatusFilter]);
        }
        if (filterType !== 'all') parts.push(EXECUTION_JURISDICTION_LABELS[filterType]);
        if (perspectiveFilter !== 'all') parts.push(EXECUTION_PERSPECTIVE_LABELS[perspectiveFilter]);
        return parts.join(' · ');
    }, [dossierStatusFilter, filterType, perspectiveFilter]);

    return {
        ...LAWSUIT_PORTAL_STUB,
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
        previewTimelineEvents,
        executionTrashedCountForFilter,
        executionTrashedCountTotal,
        executionJurisdictionCountsForView,
        toggleTrashSelect,
        getTitle,
        filteredExecutionFiles,
        enrichedFiles,
        selectAllTrashedInView,
        beginPermanentDeleteFlow,
        hasExecutionLifecycle,
        executionFilterSummary,
    };
}
