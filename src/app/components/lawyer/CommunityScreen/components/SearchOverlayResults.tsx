import { BookOpen } from '@/app/components/ui/icons/BookOpen';
import { FileText } from '@/app/components/ui/icons/FileText';
import type { CommunityPost, RepositoryDocument } from '@/app/services/lawyer-cloud';
import { FORUM_TEXT_APRICOT, FORUM_TEXT_MUTED } from '../forumPlumTheme';
import { SearchOverlayPostHit } from './SearchOverlayPostHit';
import { SearchOverlayDocumentHit } from './SearchOverlayDocumentHit';

type SearchOverlayResultsProps = {
    hasActiveFilters: boolean;
    totalResults: number;
    filteredPosts: CommunityPost[];
    filteredDocuments: RepositoryDocument[];
    onOpenPost?: (postId: string) => void;
    onOpenDocument?: (doc: RepositoryDocument) => void;
};

export function SearchOverlayResults({
    hasActiveFilters,
    totalResults,
    filteredPosts,
    filteredDocuments,
    onOpenPost,
    onOpenDocument,
}: SearchOverlayResultsProps) {
    return (
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-4 bg-transparent">
            {!hasActiveFilters ? (
                <div className="min-h-[40vh] flex flex-col items-center justify-end text-center pb-10">
                    <p className={`${FORUM_TEXT_MUTED} text-sm max-w-xs`}>
                        اكتب للبحث في الاستشارات والمستندات معاً.
                    </p>
                </div>
            ) : totalResults === 0 ? (
                <div className={`text-center py-10 text-sm ${FORUM_TEXT_MUTED}`}>لا نتائج تطابق بحثك.</div>
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
                                    <SearchOverlayPostHit key={`search-post-${q.id}`} post={q} onOpen={onOpenPost} />
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
                                {filteredDocuments.map((doc) => (
                                    <SearchOverlayDocumentHit
                                        key={`search-doc-${doc.id}`}
                                        doc={doc}
                                        onOpen={onOpenDocument}
                                    />
                                ))}
                            </div>
                        </section>
                    ) : null}
                </div>
            )}
        </div>
    );
}
