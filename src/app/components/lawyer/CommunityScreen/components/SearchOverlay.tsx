import React from 'react';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { ArrowRight } from '@/app/components/ui/icons/ArrowRight';
import { Search } from '@/app/components/ui/icons/Search';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import type { CommunityPost, RepositoryDocument } from '@/app/services/lawyer-cloud';
import { SearchOverlayFilters } from './SearchOverlayFilters';
import { SearchOverlayResults } from './SearchOverlayResults';
import {
    FORUM_ICON_BTN,
    FORUM_LAYER,
    FORUM_REPO_SEARCH_BAR,
    FORUM_SEARCH_HEADER,
    FORUM_SEARCH_SHELL,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';

interface SearchOverlayProps {
    isOpen: boolean;
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    filterHasPdf: boolean;
    onFilterHasPdfChange: (value: boolean) => void;
    filterHasImage: boolean;
    onFilterHasImageChange: (value: boolean) => void;
    selectedTag: string | null;
    onSelectedTagChange: (tag: string | null) => void;
    allTags: string[];
    filteredPosts: CommunityPost[];
    filteredDocuments: RepositoryDocument[];
    onClose: () => void;
    onOpenPost?: (postId: string) => void;
    onOpenDocument?: (doc: RepositoryDocument) => void;
}

export const SearchOverlay = ({
    isOpen,
    searchQuery,
    onSearchQueryChange,
    filterHasPdf,
    onFilterHasPdfChange,
    filterHasImage,
    onFilterHasImageChange,
    selectedTag,
    onSelectedTagChange,
    allTags,
    filteredPosts,
    filteredDocuments,
    onClose,
    onOpenPost,
    onOpenDocument,
}: SearchOverlayProps) => {
    const reduceMotion = useReduceMotion();
    const hasActiveFilters = searchQuery !== '' || filterHasPdf || filterHasImage || selectedTag !== null;
    const totalResults = filteredPosts.length + filteredDocuments.length;

    return (
        <AnimatePresence>
            {isOpen ? (
                <motion.div
                    key="search-overlay"
                    data-testid="forum-search-overlay"
                    initial={reduceMotion ? false : { x: '100%' }}
                    animate={{ x: 0 }}
                    exit={reduceMotion ? undefined : { x: '100%' }}
                    transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
                    className={`${FORUM_LAYER} z-[98] ${FORUM_SEARCH_SHELL}`}
                    data-forum-silk="1"
                >
                    <div className={FORUM_SEARCH_HEADER}>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="إغلاق البحث"
                            className={`${FORUM_ICON_BTN} active:scale-95 transition-transform shrink-0`}
                        >
                            <ArrowRight size={24} />
                        </button>
                        <div className={`flex-1 min-w-0 ${FORUM_REPO_SEARCH_BAR}`}>
                            <div className="flex flex-1 items-center gap-2 px-3 min-w-0">
                                <Search size={17} className={`${FORUM_TEXT_MUTED} shrink-0`} />
                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={(e) => onSearchQueryChange(e.target.value)}
                                    placeholder="ابحث في المنتدى والمستودع معاً..."
                                    aria-label="بحث في المنتدى والمستودع"
                                    className={`w-full min-w-0 bg-transparent text-[16px] outline-none ${FORUM_TEXT_PRIMARY} placeholder:text-[#9AA3B2]/55`}
                                    autoFocus
                                    enterKeyHint="search"
                                    autoComplete="off"
                                    inputMode="search"
                                />
                            </div>
                        </div>
                    </div>

                    <SearchOverlayFilters
                        filterHasPdf={filterHasPdf}
                        onFilterHasPdfChange={onFilterHasPdfChange}
                        filterHasImage={filterHasImage}
                        onFilterHasImageChange={onFilterHasImageChange}
                        selectedTag={selectedTag}
                        onSelectedTagChange={onSelectedTagChange}
                        allTags={allTags}
                    />

                    <SearchOverlayResults
                        hasActiveFilters={hasActiveFilters}
                        totalResults={totalResults}
                        filteredPosts={filteredPosts}
                        filteredDocuments={filteredDocuments}
                        onOpenPost={onOpenPost}
                        onOpenDocument={onOpenDocument}
                    />
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
};
