// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isLawsuitArchived, isLawsuitInTrash } from '@/app/utils/lawsuitTrash';
import type { ArchivePortalProps } from '@/app/types/common';
import type { ExecutionArchiveFilter } from '../components/ExecutionArchiveToolbar';
import {
    EXECUTION_JURISDICTION_LABELS,
    EXECUTION_PERSPECTIVE_LABELS,
    buildExecutionJurisdictionCounts,
    filterExecutionArchiveFiles,
    getExecutionArchiveBasePool,
    isLegalEntityPerspectiveAllowed,
    type ExecutionPerspectiveFilter,
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

    const [criminalDeleteTarget, setCriminalDeleteTarget] = useState<{
        id: string;
        title: string;
    } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<ExecutionArchiveFilter>('all');
    const [perspectiveFilter, setPerspectiveFilter] = useState<ExecutionPerspectiveFilter>('all');
    const [executionPreviewFile, setExecutionPreviewFile] = useState<LooseArchiveFile | null>(null);
    const [executionTrashView, setExecutionTrashView] = useState(false);
    const [lawsuitViewMode, setLawsuitViewMode] = useState<LawsuitViewMode>('active');

    const [trashConfirmTarget, setTrashConfirmTarget] = useState<LooseArchiveFile | null>(null);
    const [lawsuitTrashConfirmTarget, setLawsuitTrashConfirmTarget] = useState<LooseArchiveFile | null>(null);
    const [selectedTrashIds, setSelectedTrashIds] = useState<Set<string>>(new Set());
    const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false);
    const [permanentCountdown, setPermanentCountdown] = useState(10);
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

    const executionTrashedCountForFilter = executionTrashCountByJurisdiction[filterType];

    const executionJurisdictionCountsForView = executionTrashView
        ? executionTrashCountByJurisdiction
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
        if (!executionTrashView) setSelectedTrashIds(new Set());
    }, [executionTrashView]);

    useEffect(() => {
        if (!isLegalEntityPerspectiveAllowed(filterType) && perspectiveFilter === 'legal_entity') {
            setPerspectiveFilter('all');
        }
    }, [filterType, perspectiveFilter]);

    useEffect(() => {
        if (lawsuitViewMode !== 'trash') setSelectedTrashIds(new Set());
    }, [lawsuitViewMode]);

    useEffect(() => {
        if (!permanentDeleteOpen) return;
        let n = 10;
        setPermanentCountdown(n);
        const intervalId = window.setInterval(() => {
            n -= 1;
            setPermanentCountdown(n);
            if (n <= 0) {
                window.clearInterval(intervalId);
                if (type === 'lawsuits') {
                    onPermanentlyDeleteLawsuits?.(permanentIdsRef.current);
                } else {
                    onPermanentlyDeleteExecutions?.(permanentIdsRef.current);
                }
                setPermanentDeleteOpen(false);
                setSelectedTrashIds(new Set());
            }
        }, 1000);
        return () => window.clearInterval(intervalId);
    }, [permanentDeleteOpen, onPermanentlyDeleteExecutions, onPermanentlyDeleteLawsuits, type]);

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
        if (type === 'executions' && executionTrashView) return 'سلة مهملات الإضابير التنفيذية';
        if (type === 'executions') return 'مخزن الأضابير التنفيذية';
        if (type === 'deleted') return 'سلة المحذوفات';
        return 'الأرشيف الشامل';
    };

    const filteredExecutionFiles = useMemo(() => {
        if (type !== 'executions') return files;
        return filterExecutionArchiveFiles(files as LooseArchiveFile[], {
            mode: executionTrashView ? 'trash' : 'active',
            jurisdiction: filterType,
            perspective: perspectiveFilter,
            searchQuery,
        });
    }, [files, type, filterType, perspectiveFilter, searchQuery, executionTrashView]);

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
        Boolean(onMoveExecutionToTrash || onRestoreExecutionFromTrash || onPermanentlyDeleteExecutions);

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
