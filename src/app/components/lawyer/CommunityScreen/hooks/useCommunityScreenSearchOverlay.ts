import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CommunityPost, RepositoryDocument } from '@/app/services/lawyer-cloud';
import { ForumApiService } from '@/app/services/forumApiService';
import { resolveRepositoryDocTags } from '../repositoryTagUtils';
import {
    filterLocalForumPostsForSearch,
    filterLocalRepositoryDocsForSearch,
    hasForumCommunitySearchFilters,
    mergeSearchHitsById,
} from '../forumCommunitySearchFilter';

const SEARCH_DEBOUNCE_MS = 300;

export function useCommunityScreenSearchOverlay(posts: CommunityPost[], allTags: string[]) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [repositoryDocs, setRepositoryDocs] = useState<RepositoryDocument[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterHasPdf, setFilterHasPdf] = useState(false);
    const [filterHasImage, setFilterHasImage] = useState(false);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [serverPosts, setServerPosts] = useState<CommunityPost[] | null>(null);
    const [serverDocs, setServerDocs] = useState<RepositoryDocument[] | null>(null);
    const searchSeqRef = useRef(0);

    const filters = useMemo(
        () => ({
            q: searchQuery,
            hasPdf: filterHasPdf,
            hasImage: filterHasImage,
            tag: selectedTag,
        }),
        [filterHasImage, filterHasPdf, searchQuery, selectedTag],
    );

    useEffect(() => {
        if (!isSearchOpen) return;
        let cancelled = false;
        void import('@/app/services/cloud/lawyerRepositoryCloud').then(({ RepositoryDB }) => {
            if (cancelled) return;
            return RepositoryDB.listDocuments().then((docs) => {
                if (cancelled) return;
                setRepositoryDocs(
                    docs.map((doc) => ({
                        ...doc,
                        tags: resolveRepositoryDocTags(doc.title, doc.description, doc.tags),
                    })),
                );
            });
        });
        return () => {
            cancelled = true;
        };
    }, [isSearchOpen]);

    useEffect(() => {
        if (!isSearchOpen || !hasForumCommunitySearchFilters(filters)) {
            setServerPosts(null);
            setServerDocs(null);
            return;
        }
        const seq = ++searchSeqRef.current;
        const timer = window.setTimeout(() => {
            void ForumApiService.searchCommunity(filters)
                .then((res) => {
                    if (seq !== searchSeqRef.current) return;
                    setServerPosts(res.posts);
                    setServerDocs(res.documents);
                })
                .catch(() => {
                    if (seq !== searchSeqRef.current) return;
                    setServerPosts(null);
                    setServerDocs(null);
                });
        }, SEARCH_DEBOUNCE_MS);
        return () => {
            window.clearTimeout(timer);
            searchSeqRef.current += 1;
        };
    }, [filters, isSearchOpen]);

    const allSearchTags = useMemo(() => {
        const fromRepo = repositoryDocs.flatMap((d) => d.tags ?? []);
        return Array.from(new Set([...allTags, ...fromRepo])).slice(0, 40);
    }, [allTags, repositoryDocs]);

    const filteredPosts = useMemo(() => {
        if (!isSearchOpen) return [];
        const local = filterLocalForumPostsForSearch(posts, filters);
        return serverPosts ? mergeSearchHitsById(serverPosts, local) : local;
    }, [filters, isSearchOpen, posts, serverPosts]);

    const filteredRepositoryDocs = useMemo(() => {
        if (!isSearchOpen) return [];
        const local = filterLocalRepositoryDocsForSearch(repositoryDocs, filters);
        return serverDocs ? mergeSearchHitsById(serverDocs, local) : local;
    }, [filters, isSearchOpen, repositoryDocs, serverDocs]);

    const openSearchOverlay = useCallback(() => {
        setSearchQuery('');
        setFilterHasPdf(false);
        setFilterHasImage(false);
        setSelectedTag(null);
        setServerPosts(null);
        setServerDocs(null);
        setIsSearchOpen(true);
    }, []);

    const closeSearchOverlay = useCallback(() => {
        searchSeqRef.current += 1;
        setIsSearchOpen(false);
        setSearchQuery('');
        setFilterHasPdf(false);
        setFilterHasImage(false);
        setSelectedTag(null);
        setServerPosts(null);
        setServerDocs(null);
    }, []);

    return {
        isSearchOpen,
        setIsSearchOpen,
        openSearchOverlay,
        closeSearchOverlay,
        searchQuery,
        setSearchQuery,
        filterHasPdf,
        setFilterHasPdf,
        filterHasImage,
        setFilterHasImage,
        selectedTag,
        setSelectedTag,
        allSearchTags,
        filteredPosts,
        filteredRepositoryDocs,
    };
}
