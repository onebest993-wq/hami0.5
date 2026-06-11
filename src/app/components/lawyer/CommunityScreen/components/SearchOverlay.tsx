import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Search, Paperclip, ImageIcon, FolderOpen, User, EyeOff, BookOpen, FileText } from 'lucide-react';
import type { CommunityPost, RepositoryDocument } from '@/app/services/lawyer-cloud';
import { formatRelativeTime } from '../utils';
import { getRepositoryMediaKind } from './repositoryMedia';

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
    const hasActiveFilters = searchQuery !== '' || filterHasPdf || filterHasImage || selectedTag !== null;
    const totalResults = filteredPosts.length + filteredDocuments.length;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="search-overlay"
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed inset-0 z-[70] bg-[#151822] flex flex-col"
                >
                    <div className="px-4 py-4 flex items-center gap-3 border-b border-white/5">
                        <button type="button"
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white active:scale-95 transition-transform"
                        >
                            <ArrowRight size={24} />
                        </button>
                        <div className="flex-1 bg-[#25293C] h-12 rounded-xl flex items-center px-4 gap-2 border border-white/5 focus-within:border-[#E6C673]/50 transition-colors">
                            <Search size={18} className="text-white/30" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => onSearchQueryChange(e.target.value)}
                                placeholder="ابحث في المنتدى والمستودع معاً..."
                                className="bg-transparent flex-1 text-white text-sm placeholder-white/30 outline-none"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="px-4 py-4 space-y-4 border-b border-white/5 bg-[#151822]">
                        <div className="flex gap-2">
                            <button type="button"
                                onClick={() => onFilterHasPdfChange(!filterHasPdf)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border transition-all ${filterHasPdf ? 'bg-[#E6C673]/20 border-[#E6C673] text-[#E6C673]' : 'bg-[#25293C] border-white/5 text-gray-400'}`}
                            >
                                <Paperclip size={14} />
                                يحتوي على PDF
                            </button>
                            <button type="button"
                                onClick={() => onFilterHasImageChange(!filterHasImage)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border transition-all ${filterHasImage ? 'bg-[#E6C673]/20 border-[#E6C673] text-[#E6C673]' : 'bg-[#25293C] border-white/5 text-gray-400'}`}
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
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedTag === tag ? 'bg-white/10 border-white text-white' : 'bg-[#25293C] border-white/5 text-gray-500 hover:text-gray-300'}`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 bg-[#0F121E]">
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
                                            <BookOpen size={14} className="text-[#E6C673]" />
                                            <p className="text-[#E6C673] text-xs font-bold">
                                                المنتدى ({filteredPosts.length})
                                            </p>
                                        </div>
                                        <div className="space-y-3">
                                            {filteredPosts.map((q) => (
                                                <button
                                                    type="button"
                                                    key={`search-post-${q.id}`}
                                                    onClick={() => onOpenPost?.(q.id)}
                                                    className="w-full text-right bg-[#151822] rounded-xl p-4 border border-white/5 hover:border-[#E6C673]/25 transition-colors"
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
                                                            {q.isUrgent && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950/40 text-red-200 border border-red-500/20">🚨</span>}
                                                            {q.attachment?.type === 'document' && <Paperclip size={12} className="text-[#E6C673]" />}
                                                            {q.attachment?.type === 'image' && <ImageIcon size={12} className="text-[#E6C673]" />}
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
                                                        className="w-full text-right bg-[#151822] rounded-xl p-4 border border-white/5 hover:border-sky-400/25 transition-colors"
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
                                                            {mediaKind === 'pdf' && <Paperclip size={11} className="text-[#E6C673]" />}
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
