import { Pin } from '@/app/components/ui/icons/Pin';
import { X } from '@/app/components/ui/icons/X';
import { formatLegalArticleTitle, type LegalCodeArticle } from './legalCodesConstants';
import { LegalSearchHighlightedText } from './legalCodesSearchHighlight';

export type LegalCodesListSectionProps = {
    articles: LegalCodeArticle[];
    searchHighlightQuery: string;
    onTogglePin: (articleId: string) => void;
};

export function LegalCodesListSection({
    articles,
    searchHighlightQuery,
    onTogglePin,
}: LegalCodesListSectionProps) {
    if (articles.length === 0) return null;

    return (
        <div className="overflow-hidden rounded-2xl border border-[#E6C673]/25 bg-gradient-to-l from-[#E6C673]/10 to-white/[0.03] p-3 backdrop-blur-sm shadow-[0_8px_28px_rgba(230,198,115,0.08)]">
            <div className="mb-3 flex items-center gap-2">
                <Pin className="h-4 w-4 fill-[#E6C673] text-[#E6C673]" />
                <span className="text-sm font-black text-[#E6C673]">المواد المثبتة</span>
            </div>
            <div className="space-y-3">
                {articles.map((a) => (
                    <div
                        key={`pinned-${a.id}`}
                        className="rounded-xl border border-[#E6C673]/30 bg-black/25 p-4 backdrop-blur-sm"
                    >
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <span className="text-sm font-black text-[#E6C673]">
                                <LegalSearchHighlightedText
                                    text={formatLegalArticleTitle(a.articleNumber)}
                                    query={searchHighlightQuery}
                                />
                            </span>
                            <button
                                type="button"
                                onClick={() => onTogglePin(a.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/60 hover:border-red-400/40 hover:text-red-300"
                                title="إلغاء التثبيت"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="max-h-56 overflow-y-auto text-sm leading-relaxed text-white/90 whitespace-pre-wrap">
                            <LegalSearchHighlightedText
                                text={a.text}
                                query={searchHighlightQuery}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
