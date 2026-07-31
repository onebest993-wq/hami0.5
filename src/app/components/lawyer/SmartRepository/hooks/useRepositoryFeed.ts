import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { listLinkableDossiers } from '@/app/services/repository/repositoryDossierRegistry';
import {
    buildRepositoryFeed,
    buildRepositoryVisibleFeedByMainFilter,
    countRepositoryFeedByFilter,
    filterRepositoryFeedByRoom,
    type RepositoryFeedFilter,
} from '@/app/services/repository/repositoryUnifiedFeed';
import type { RepositoryRoomFilter } from '@/app/services/repository/repositoryRooms';
import {
    buildRepositoryFeedCacheKey,
    peekRepositoryFeedCache,
    setRepositoryFeedCache,
    invalidateRepositoryFeedCache,
} from '@/app/services/repository/repositoryFeedWarmCache';
import {
    getRepositoryFeedContainerClass,
    getRepositoryFeedItemClass,
    loadRepositoryFeedLayout,
    persistRepositoryFeedLayout,
    type RepositoryFeedLayoutId,
} from '../repositoryFeedLayout';
import { DOSSIER_NOTES_CHANGED } from '@/app/services/dossier-notes/dossierNoteSyncEvents';

type UseRepositoryFeedParams = {
    notes: GlobalNote[];
    lawsuitFiles: FileData[];
    executionFiles: ExecutionFile[];
    vaultDocs: SmartVaultDoc[];
    vaultCategoryFilter: string;
    vaultSearchQuery: string;
    roomFilter?: RepositoryRoomFilter | null;
    notesBootSettled?: boolean;
    initialFilter: RepositoryFeedFilter;
    focusNoteId?: string;
    feedScrollRef: RefObject<HTMLDivElement | null>;
    vault: {
        setActiveFilter: React.Dispatch<React.SetStateAction<string>>;
    };
};

export function useRepositoryFeed({
    notes,
    lawsuitFiles,
    executionFiles,
    vaultDocs,
    vaultCategoryFilter,
    vaultSearchQuery,
    roomFilter = 'main',
    initialFilter,
    focusNoteId,
    feedScrollRef,
    vault,
}: UseRepositoryFeedParams) {
    const [activeFilter, setActiveFilter] = useState<RepositoryFeedFilter>(initialFilter);
    const [feedEpoch, setFeedEpoch] = useState(0);
    const [feedLayout, setFeedLayout] = useState<RepositoryFeedLayoutId>(() => loadRepositoryFeedLayout());

    const dossiers = useMemo(
        () => listLinkableDossiers(lawsuitFiles, executionFiles),
        [lawsuitFiles, executionFiles],
    );

    useEffect(() => {
        setActiveFilter(initialFilter);
    }, [initialFilter]);

    useEffect(() => {
        const refresh = () => setFeedEpoch((n) => n + 1);
        window.addEventListener(DOSSIER_NOTES_CHANGED, refresh);
        return () => window.removeEventListener(DOSSIER_NOTES_CHANGED, refresh);
    }, []);

    const feedLayoutClass = getRepositoryFeedContainerClass(feedLayout);
    const feedItemLayoutClass = getRepositoryFeedItemClass(feedLayout);

    const handleFeedLayoutChange = useCallback((next: RepositoryFeedLayoutId) => {
        setFeedLayout(next);
        persistRepositoryFeedLayout(next);
    }, []);

    useEffect(() => {
        invalidateRepositoryFeedCache();
        setFeedEpoch((n) => n + 1);
    }, [notes, vaultDocs]);

    const feedItems = useMemo(() => {
        const input = {
            globalNotes: notes,
            lawsuitFiles,
            executionFiles,
            vaultDocs,
        };
        const cacheKey = buildRepositoryFeedCacheKey(input);
        const cached = peekRepositoryFeedCache(cacheKey);
        if (cached) return cached;
        const built = buildRepositoryFeed(input);
        setRepositoryFeedCache(cacheKey, built);
        return built;
    }, [executionFiles, feedEpoch, lawsuitFiles, notes, vaultDocs]);

    const roomScopedFeed = useMemo(
        () => filterRepositoryFeedByRoom(feedItems, roomFilter ?? 'main'),
        [feedItems, roomFilter],
    );

    const visibleByFilter = useMemo(
        () =>
            buildRepositoryVisibleFeedByMainFilter(
                roomScopedFeed,
                vaultCategoryFilter,
                vaultSearchQuery,
                vaultDocs,
            ),
        [roomScopedFeed, vaultCategoryFilter, vaultSearchQuery, vaultDocs],
    );

    const filterCounts = useMemo(
        () => countRepositoryFeedByFilter(roomScopedFeed),
        [roomScopedFeed],
    );

    const vaultDocsById = useMemo(() => new Map(vaultDocs.map((d) => [d.id, d])), [vaultDocs]);

    const unboundVaultDocs = useMemo(
        () => vaultDocs.filter((d) => !d.boundDossierId),
        [vaultDocs],
    );

    useEffect(() => {
        if (!focusNoteId || visibleByFilter[activeFilter].length === 0) return;
        const t = window.setTimeout(() => {
            const el = feedScrollRef.current?.querySelector(`[data-note-id="${focusNoteId}"]`);
            el?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
        }, 80);
        return () => window.clearTimeout(t);
    }, [activeFilter, focusNoteId, feedScrollRef, visibleByFilter]);

    const selectMainFilter = useCallback(
        (filter: RepositoryFeedFilter) => {
            if (filter === activeFilter) {
                if (vaultCategoryFilter !== 'الكل') vault.setActiveFilter('الكل');
                return;
            }
            setActiveFilter(filter);
            if (vaultCategoryFilter !== 'الكل') vault.setActiveFilter('الكل');
        },
        [activeFilter, vault, vaultCategoryFilter],
    );

    return {
        activeFilter,
        feedLayout,
        feedLayoutClass,
        feedItemLayoutClass,
        visibleByFilter,
        filterCounts,
        vaultDocsById,
        unboundVaultDocs,
        dossiers,
        handleFeedLayoutChange,
        selectMainFilter,
    };
}
