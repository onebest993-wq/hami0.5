import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Search, Paperclip, ImageIcon, FolderOpen, User, EyeOff, BookOpen, FileText, Zap } from 'lucide-react';
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
    FORUM_TEXT_APRICOT,
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
                    className={`${FORUM_LAYER} z-[98] flex flex-col bg-[#0E0812] isolate`}
                >
                    <div className="px-4 py-3 flex items-center gap-3 border-b border-[#4A3D52]/40 bg-[#140A18] shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="إغلاق البحث"
                            className={`${FORUM_ICON_BTN} ${FORUM_TEXT_MUTED} hover:text-[#F0B896] active:scale-95 transition-transform shrink-0`}
                        >
                            <ArrowRight size={24} />
                        </button>
                        <div className={`flex-1 min-w-0 ${FORUM_REPO_SEARCH_BAR}`}>
                            <div className="flex flex-1 items-center gap-2 px-3 min-w-0">
                                <Search size={17} className="text-[#9A9098] shrink-0" />
                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={(e) => onSearchQueryChange(e.target.value)}
                                    placeholder="ابحث في المنتدى والمستودع معاً..."
                                    aria-label="بحث في المنتدى والمستودع"
                                    className={`w-full min-w-0 bg-transparent text-sm outline-none ${FORUM_TEXT_PRIMARY} placeholder:text-[#9A9098]/55`}
                                    autoFocus
                                />
                            </div>
                        </div>
                    </div>

                    <div className="px-4 py-4 space-y-4 border-b border-[#4A3D52]/40 bg-[#140A18] shrink-0">
                        <div className="flex gap-2">
                            <button type="button"
                                onClick={() => onFilterHasPdfChange(!filterHasPdf)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border transition-all ${filterHasPdf ? FORUM_ACCENT_CHIP : FORUM_GHOST_BTN}`}
                            >
                                <Paperclip size={14} />
                                يحتوي على PDF
                            </button>
                            <button type="button"
                                onClick={() => onFilterHasImageChange(!filterHasImage)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border transition-all ${filterHasImage ? FORUM_ACCENT_CHIP : FORUM_GHOST_BTN}`}
                            >
                                <ImageIcon size={14} />
                                يحتوي على صور
                            </button>
                        </div>

                        {allTags.length > 0 ? (
                            <div className="w-full overflow-x-auto scrollbar-hide">
                                <div className="flex gap-2 min-w-max">
                                    {allTags.map((tag) => (
                                        <button type="button"
                                            key={tag}
                                            onClick={() => onSelectedTagChange(selectedTag === tag ? null : tag)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedTag === tag ? FORUM_ACCENT_CHIP : FORUM_GHOST_BTN}`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-4 bg-[#0E0812]">
                        {!hasActiveFilters ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 pb-20">
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    <FolderOpen size={40} className="text-white/30" />
                                </div>
                                <h3 className="text-white font-bold text-lg mb-2">بحث موحّد</h3>
                                <p className="text-gray-500 text-sm max-w-[280px]">
                                    ابحث في استشارات المنتدى ومستندات المستودع القانوني من مكان واحد.
                                </p>
                            </div>
                        ) : totalResults === 0 ? (
                            <div className="text-center py-10 text-gray-500 text-sm">
                                لا توجد نتائج في المنتدى أو المستودع تطابق بحثك.
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
                                                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-gray-400">
                                                                {q.isAnonymous ? <EyeOff size={12} /> : <User size={12} />}
                                                            </div>
                                                            <span className="text-white/70 text-xs font-bold">{q.isAnonymous ? 'زميل مجهول' : q.authorName}</span>
                                                            <span className="text-gray-600 text-[10px]">• {formatRelativeTime(q.createdAt)}</span>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            {isActiveUrgentConsultation(q) && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-950/45 text-amber-100 border border-amber-400/25 font-bold">
                                                                    <Zap size={10} fill="currentColor" />
                                                                    {URGENT_CONSULTATION_BADGE}
                                                                </span>
                                                            )}
                                                            {q.attachment?.type === 'document' && <Paperclip size={12} className={FORUM_TEXT_APRICOT} />}
                                                            {q.attachment?.type === 'image' && <ImageIcon size={12} className={FORUM_TEXT_APRICOT} />}
                                                        </div>
                                                    </div>
                                                    <p className="text-white/90 text-sm line-clamp-2 mb-2 font-medium">
                                                        {q.content}
                                                    </p>
                                                    <div className="flex gap-2">
                                                        {(q.tags || []).slice(0, 3).map((t, i) => (
                                                            <span key={`${q.id}-t-${i}`} className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">{t}</span>
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
                                            <FolderOpen size={14} className="text-sky-300" />
                                            <p className="text-sky-300 text-xs font-bold">
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
                                                                <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-300 shrink-0">
                                                                    <FileText size={14} />
                                                                </div>
                                                                <span className="text-white font-bold text-sm truncate">{doc.title}</span>
                                                            </div>
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50 shrink-0">
                                                                {doc.type}
                                                            </span>
                                                        </div>
                                                        <p className="text-white/70 text-xs line-clamp-2 mb-2">{doc.description}</p>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-[10px] text-white/40">{doc.authorName}</span>
                                                            {mediaKind === 'pdf' && <Paperclip size={11} className={FORUM_TEXT_APRICOT} />}
                                                            {mediaKind === 'image' && <ImageIcon size={11} className="text-sky-300" />}
                                                            {(doc.tags ?? []).slice(0, 4).map((t) => (
                                                                <span key={`${doc.id}-${t}`} className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">{t}</span>
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
