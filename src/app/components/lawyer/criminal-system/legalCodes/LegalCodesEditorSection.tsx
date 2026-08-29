import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { formatLegalArticleTitle, type LegalCodeArticle } from './legalCodesConstants';
import { LegalSearchHighlightedText } from './legalCodesSearchHighlight';

export type LegalCodesEditorSectionProps = {
    isOpen: boolean;
    onToggleOpen: () => void;
    unpinnedTotalCount: number;
    pinnedCount: number;
    visibleArticles: LegalCodeArticle[];
    searchHighlightQuery: string;
    onLoadMore: () => void;
};

export function LegalCodesEditorSection({
    isOpen,
    onToggleOpen,
    unpinnedTotalCount,
    pinnedCount,
    visibleArticles,
    searchHighlightQuery,
    onLoadMore,
}: LegalCodesEditorSectionProps) {
    return (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
            <button
                type="button"
                onClick={onToggleOpen}
                className="flex w-full items-center justify-between gap-2 border-b border-white/10 bg-white/[0.02] px-4 py-3 text-right transition hover:bg-white/[0.04]"
            >
                <span className="text-sm font-bold text-white/85">
                    جميع المواد
                    <span className="mr-2 text-xs font-medium text-white/45">
                        ({unpinnedTotalCount})
                    </span>
                </span>
                <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[#E6C673] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            {isOpen ? (
                <div className="space-y-2 p-3">
                    {visibleArticles.length === 0 ? (
                        <p className="py-4 text-center text-xs font-bold text-white/50">
                            {unpinnedTotalCount === 0 && pinnedCount > 0
                                ? 'كل المواد الحالية مثبتة في الأعلى.'
                                : 'لا توجد مواد لعرضها.'}
                        </p>
                    ) : (
                        visibleArticles.map((a) => (
                            <div
                                key={a.id}
                                className="rounded-xl border border-white/10 bg-black/20 p-3"
                            >
                                <div className="mb-2 text-xs font-black text-[#E6C673]">
                                    <LegalSearchHighlightedText
                                        text={formatLegalArticleTitle(a.articleNumber)}
                                        query={searchHighlightQuery}
                                    />
                                </div>
                                <div className="text-sm leading-relaxed text-white/88 whitespace-pre-wrap">
                                    <LegalSearchHighlightedText
                                        text={a.text}
                                        query={searchHighlightQuery}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                    {unpinnedTotalCount > visibleArticles.length ? (
                        <div className="flex justify-center pt-1">
                            <button
                                type="button"
                                onClick={onLoadMore}
                                className="rounded-lg border border-[#E6C673]/30 px-4 py-2 text-xs font-bold text-[#E6C673] hover:bg-[#E6C673]/10"
                            >
                                تحميل المزيد
                            </button>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
