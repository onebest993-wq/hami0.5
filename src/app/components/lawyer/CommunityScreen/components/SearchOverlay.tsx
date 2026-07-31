import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Search, Paperclip, ImageIcon, User, EyeOff, BookOpen, FileText, Zap } from 'lucide-react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import type { CommunityPost, RepositoryDocument } from '@/app/services/lawyer-cloud';
import { formatRelativeTime } from '../utils';
import { getRepositoryMediaKind } from './repositoryMedia';
import {
    isActiveUrgentConsultation,
    URGENT_CONSULTATION_BADGE,
} from '@/app/services/forum/forumUrgentConsultation';
import {
    FORUM_ACCENT_CHIP,
    FORUM_FEED_CARD,
    FORUM_GHOST_BTN,
    FORUM_ICON_BTN,
    FORUM_LAYER,
    FORUM_REPO_SEARCH_BAR,
    FORUM_SEARCH_FILTERS,
    FORUM_SEARCH_HEADER,
    FORUM_SEARCH_SHELL,
    FORUM_TEXT_APRICOT,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';
import '../forumPlumChrome.css';

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
    isOpen, searchQuery, onSearchQueryChange,
    filterHasPdf, onFilterHasPdfChange,
    filterHasImage, onFilterHasImageChange,
    selectedTag, onSelectedTagChange,
    allTags, filteredPosts, filteredDocuments, onClose,
    onOpenPost, onOpenDocument,
}: SearchOverlayProps) => {
    const reduceMotion = useReduceMotion();
    const hasActiveFilters = searchQuery !== '' || filterHasPdf || filterHasImage || selectedTag !== null;
    const totalResults = filteredPosts.length + filteredDocuments.length;

    return (
        <AnimatePresence>
            {isOpen && (
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
                                    className={`w-full min-w-0 bg-transparent text-sm outline-none ${FORUM_TEXT_PRIMARY} placeholder:text-[#9AA3B2]/55`}
                                    autoFocus
                                />
                            </div>
                        </div>
                    </div>

                    <div className={FORUM_SEARCH_FILTERS}>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={() => onFilterHasPdfChange(!filterHasPdf)}
                                className={`min-h-[40px] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border transition-all touch-manipulation ${
                                    filterHasPdf ? FORUM_ACCENT_CHIP : FORUM_GHOST_BTN
                                }`}
                            >
                                <Paperclip size={14} />
                                يحتوي على PDF
                            </button>
                            <button
                                type="button"
                                onClick={() => onFilterHasImageChange(!filterHasImage)}
                                className={`min-h-[40px] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border transition-all touch-manipulation ${
                                    filterHasImage ? FORUM_ACCENT_CHIP : FORUM_GHOST_BTN
                                }`}
                            >
                                <ImageIcon size={14} />
                                يحتوي على صور
                            </button>
                        </div>

                        {allTags.length > 0 ? (
                            <div className="w-full overflow-x-auto scrollbar-hide">
                                <div className="flex gap-2 min-w-max">
                                    {allTags.map((tag) => (
                                        <button
                                            type="button"
                                            key={tag}
                                            onClick={() => onSelectedTagChange(selectedTag === tag ? null : tag)}
                                            className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold border transition-all touch-manipulation ${
                                                selectedTag === tag ? FORUM_ACCENT_CHIP : FORUM_GHOST_BTN
                                            }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-4 bg-transparent">
                        {!hasActiveFilters ? (
                            <div className="min-h-[40vh] flex flex-col items-center justify-end text-center pb-10">
                                <p className={`${FORUM_TEXT_MUTED} text-sm max-w-xs`}>
                                    اكتب للبحث في الاستشارات والمستندات معاً.
                                </p>
                            </div>
                        ) : totalResults === 0 ? (
                            <div className={`text-center py-10 text-sm ${FORUM_TEXT_MUTED}`}>
                                لا نتائج تطابق بحثك.
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {filteredPosts.length > 0 ? (
                                    <section>
                                        <div className="flex items-center gap-2 mb-3">
                                            <BookOpen size={14} className={FORUM_TEXT_APRICOT} />
                                            <p className={`${FORUM_TEXT_APRICOT} text-xs font-bold`}>
                                                المنتدى ({filteredPosts.length})
                                            </p>
                                        </div>
                                        <div className="space-y-3">
                                            {filteredPosts.map((q) => (
                                                <button
                                                    type="button"
                                                    key={`search-post-${q.id}`}
                                                    onClick={() => onOpenPost?.(q.id)}
                                                    className={`w-full text-right ${FORUM_FEED_CARD} p-4`}
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-[#C9A86C]/10 flex items-center justify-center text-[#9AA3B2]">
                                                                {q.isAnonymous ? <EyeOff size={12} /> : <User size={12} />}
                                                            </div>
                                                            <span className={`${FORUM_TEXT_MUTED} text-xs font-bold`}>
                                                                {q.isAnonymous ? 'زميل مجهول' : q.authorName}
                                                            </span>
                                                            <span className="text-[#9AA3B2]/50 text-[10px]">
                                                                • {formatRelativeTime(q.createdAt)}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            {isActiveUrgentConsultation(q) && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#E2B07A]/12 text-[#E2B07A] border border-[#E2B07A]/25 font-bold">
                                                                    <Zap size={10} fill="currentColor" />
                                                                    {URGENT_CONSULTATION_BADGE}
                                                                </span>
                                                            )}
                                                            {q.attachment?.type === 'document' && (
                                                                <Paperclip size={12} className={FORUM_TEXT_APRICOT} />
                                                            )}
                                                            {q.attachment?.type === 'image' && (
                                                                <ImageIcon size={12} className={FORUM_TEXT_APRICOT} />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className={`${FORUM_TEXT_PRIMARY} text-sm line-clamp-2 mb-2 font-medium`}>
                                                        {q.content}
                                                    </p>
                                                    <div className="flex gap-2">
                                                        {(q.tags || []).slice(0, 3).map((t, i) => (
                                                            <span
                                                                key={`${q.id}-t-${i}`}
                                                                className="text-[10px] text-[#9AA3B2] bg-white/[0.04] px-1.5 py-0.5 rounded"
                                                            >
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                ) : null}

                                {filteredDocuments.length > 0 ? (
                                    <section>
                                        <div className="flex items-center gap-2 mb-3">
                                            <FileText size={14} className="text-[#E2B07A]" />
                                            <p className="text-[#E2B07A] text-xs font-bold">
                                                المستودع ({filteredDocuments.length})
                                            </p>
                                        </div>
                                        <div className="space-y-3">
                                            {filteredDocuments.map((doc) => {
                                                const mediaKind = getRepositoryMediaKind(doc.mimeType, doc.fileName);
                                                return (
                                                    <button
                                                        type="button"
                                                        key={`search-doc-${doc.id}`}
                                                        onClick={() => onOpenDocument?.(doc)}
                                                        className={`w-full text-right ${FORUM_FEED_CARD} p-4`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2 mb-2">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <div className="w-7 h-7 rounded-lg bg-[#E2B07A]/10 flex items-center justify-center text-[#E2B07A] shrink-0">
                                                                    <FileText size={14} />
                                                                </div>
                                                                <span className={`${FORUM_TEXT_PRIMARY} font-bold text-sm truncate`}>
                                                                    {doc.title}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-[#9AA3B2] shrink-0">
                                                                {doc.type}
                                                            </span>
                                                        </div>
                                                        <p className={`${FORUM_TEXT_MUTED} text-xs line-clamp-2 mb-2`}>
                                                            {doc.description}
                                                        </p>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-[10px] text-[#9AA3B2]/70">{doc.authorName}</span>
                                                            {mediaKind === 'pdf' && (
                                                                <Paperclip size={11} className={FORUM_TEXT_APRICOT} />
                                                            )}
                                                            {mediaKind === 'image' && (
                                                                <ImageIcon size={11} className="text-[#E2B07A]" />
                                                            )}
                                                            {(doc.tags ?? []).slice(0, 4).map((t) => (
                                                                <span
                                                                    key={`${doc.id}-${t}`}
                                                                    className="text-[10px] text-[#9AA3B2] bg-white/[0.04] px-1.5 py-0.5 rounded"
                                                                >
                                                                    {t}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>
                                ) : null}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
