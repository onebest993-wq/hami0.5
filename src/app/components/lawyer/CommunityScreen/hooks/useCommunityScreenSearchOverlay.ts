import { useCallback, useEffect, useMemo, useState } from 'react';
import { RepositoryDB, type CommunityPost, type RepositoryDocument } from '@/app/services/lawyer-cloud';
import { compareCommunityPostsForFeed } from '@/app/services/forum/forumUrgentConsultation';
import {
    communityTagMatchesFilter,
    resolveCommunityPostTags,
    resolveRepositoryDocTags,
    repositoryDocMatchesSearch,
    repositoryDocMatchesTag,
} from '../repositoryTagUtils';
import { getRepositoryMediaKind } from '../components/repositoryMedia';
import { archiveTextMatchesQuery } from '@/app/services/search/normalizeArabicSearch';
import { clampGlobalSearchQuery } from '@/app/services/search/globalSearchQuerySecurity';

export function useCommunityScreenSearchOverlay(posts: CommunityPost[], allTags: string[]) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [repositoryDocs, setRepositoryDocs] = useState<RepositoryDocument[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterHasPdf, setFilterHasPdf] = useState(false);
    const [filterHasImage, setFilterHasImage] = useState(false);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    useEffect(() => {
        if (!isSearchOpen) return;
        let cancelled = false;
        void RepositoryDB.listDocuments().then((docs) => {
            if (!cancelled) {
                setRepositoryDocs(
                    docs.map((doc) => ({
                        ...doc,
                        tags: resolveRepositoryDocTags(doc.title, doc.description, doc.tags),
                    })),
                );
            }
        });
        return () => {
            cancelled = true;
        };
    }, [isSearchOpen]);

    const allSearchTags = useMemo(() => {
        const fromRepo = repositoryDocs.flatMap((d) => d.tags ?? []);
        return Array.from(new Set([...allTags, ...fromRepo])).slice(0, 40);
    }, [allTags, repositoryDocs]);

    const filteredPosts = useMemo(() => {
        if (!isSearchOpen) return [];
        const q = clampGlobalSearchQuery(searchQuery);
        return posts
            .filter((p) => {
                const hay = [p.content, p.authorName, ...(p.tags ?? [])].join(' ');
                const matchesSearch = !q.trim() || archiveTextMatchesQuery(hay, q);
                const matchesPdf = !filterHasPdf || p.attachment?.type === 'document';
                const matchesImage = !filterHasImage || p.attachment?.type === 'image';
                const matchesTag = communityTagMatchesFilter(
                    resolveCommunityPostTags(p.content, p.tags),
                    selectedTag,
                );
                return matchesSearch && matchesPdf && matchesImage && matchesTag;
            })
            .sort((a, b) => compareCommunityPostsForFeed(a, b));
    }, [isSearchOpen, posts, searchQuery, filterHasPdf, filterHasImage, selectedTag]);

    const filteredRepositoryDocs = useMemo(() => {
        if (!isSearchOpen) return [];
        return repositoryDocs.filter((doc) => {
            const matchesSearch = repositoryDocMatchesSearch(doc, searchQuery);
            const docTags = resolveRepositoryDocTags(doc.title, doc.description, doc.tags);
            const matchesTag = repositoryDocMatchesTag(docTags, selectedTag);
            const mediaKind = getRepositoryMediaKind(doc.mimeType, doc.fileName);
            const matchesPdf = !filterHasPdf || mediaKind === 'pdf';
            const matchesImage = !filterHasImage || mediaKind === 'image';
            return matchesSearch && matchesTag && matchesPdf && matchesImage;
        });
    }, [isSearchOpen, repositoryDocs, searchQuery, selectedTag, filterHasPdf, filterHasImage]);

    const openSearchOverlay = useCallback(() => {
        setSearchQuery('');
        setFilterHasPdf(false);
        setFilterHasImage(false);
        setSelectedTag(null);
        setIsSearchOpen(true);
    }, []);

    const closeSearchOverlay = useCallback(() => {
        setIsSearchOpen(false);
        setSearchQuery('');
        setFilterHasPdf(false);
        setFilterHasImage(false);
        setSelectedTag(null);
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
