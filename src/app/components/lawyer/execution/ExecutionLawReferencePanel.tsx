import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import {
    EXECUTION_LAW_HIERARCHY,
    filterExecutionLawsByHierarchy,
    searchExecutionLawsGlobal,
    normalizeLawSearchText,
    TAKHLYA_PARENT_ID,
    TAKHLYA_DEFAULT_LEAF_ID,
    type ExecutionLawArticle,
    type ExecutionLawLeafFilter,
    type ExecutionLawParentId,
} from '@/data/executionLaws';
import { loadExecutionLawArticlesRemote } from '@/app/utils/executionLawRemoteCache';

/** شرائح التصنيف العام — زجاج سائل */
const PARENT_CHIP_BASE =
    'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-bold backdrop-blur-md transition-[color,background-color,border-color] duration-150';
const PARENT_CHIP_ACTIVE =
    'border-[#E6C673]/35 bg-white/[0.08] text-[#E6C673] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-[#E6C673]/15';
const PARENT_CHIP_IDLE =
    'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/18 hover:bg-white/[0.07] hover:text-slate-100';

/** شرائح التصنيف الفرعي */
const LEAF_CHIP_BASE =
    'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-bold transition-[color,background-color,border-color] duration-150';
const LEAF_CHIP_ACTIVE = 'border-purple-500/35 bg-purple-900/40 text-purple-300';
const LEAF_CHIP_IDLE =
    'border-white/10 bg-transparent text-slate-400 hover:border-white/20 hover:text-slate-200';

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildArabicLooseSearchPattern(rawHighlight: string): string {
    const norm = normalizeLawSearchText(rawHighlight);
    const cleaned = norm.replace(/\s+/g, ' ').trim();
    if (!cleaned) return '';
    const tokenToPattern = (token: string): string => {
        const letters = [...token].filter((ch) => ch.trim().length > 0);
        if (!letters.length) return '';
        const charToPattern = (ch: string): string => {
            if (ch === 'ا') return '[اأإآٱ]';
            if (ch === 'ه') return '[هة]';
            if (ch === 'ي') return '[يى]';
            return escapeRegExp(ch);
        };
        return letters.map(charToPattern).join('[\\u064B-\\u0652]*');
    };
    const tokens = cleaned.split(' ').map(tokenToPattern).filter(Boolean);
    return tokens.join('\\s+');
}

function getHighlightedText(text: string, highlight: string): React.ReactNode {
    const raw = String(text ?? '');
    const pat = buildArabicLooseSearchPattern(highlight);
    if (!pat) return raw;
    const splitRe = new RegExp(`(${pat})`, 'gi');
    const testRe = new RegExp(pat, 'i');
    return raw.split(splitRe).map((part, index) =>
        part && testRe.test(part) ? (
            <mark key={index} className="bg-yellow-500/40 text-yellow-100 font-bold px-1 rounded-sm">
                {part}
            </mark>
        ) : (
            part
        )
    );
}

const ExecutionLawArticleCard: React.FC<{
    art: ExecutionLawArticle;
    searchQuery: string;
}> = ({ art, searchQuery }) => (
    <li className="rounded-2xl border border-slate-700/40 bg-slate-900/35 p-4 text-right backdrop-blur-sm">
        <h3 className="text-lg font-black leading-snug text-slate-100">
            <span className="text-[#E6C673]/90">المادة ({art.number})</span>
            {art.title.trim() ? (
                <>
                    {' '}
                    — <span>{getHighlightedText(art.title, searchQuery)}</span>
                </>
            ) : null}
        </h3>

        {art.content.trim() ? (
            <p className="mt-3 text-sm leading-relaxed text-slate-300 whitespace-pre-line">
                {getHighlightedText(art.content, searchQuery)}
            </p>
        ) : (
            <p className="mt-3 text-sm leading-relaxed text-slate-400 whitespace-pre-line">
                نص المادة غير متوفر حالياً.
            </p>
        )}
    </li>
);

function isTakhlyaExecutionContext(executionTypeRaw: string): boolean {
    const t = executionTypeRaw.trim();
    if (!t) return false;
    if (t === 'تخلية') return true;
    return t.includes('تخلية');
}

export const ExecutionLawReferencePanel: React.FC<{ executionType?: string }> = ({
    executionType: executionTypeProp,
}) => {
    const lawGuideFileId = useExecutionDashboardStore((s) => s.currentFile?.id ?? '');
    const executionTypeFromStore = useExecutionDashboardStore((s) => s.currentFile?.executionType);
    const resolvedExecutionType = String(executionTypeProp ?? executionTypeFromStore ?? '').trim();
    const isTakhlyaCtx = isTakhlyaExecutionContext(resolvedExecutionType);

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const parentChipsRef = useRef<HTMLDivElement | null>(null);
    const childChipsRef = useRef<HTMLDivElement | null>(null);
    const [parentId, setParentId] = useState<ExecutionLawParentId>(
        isTakhlyaExecutionContext(resolvedExecutionType) ? TAKHLYA_PARENT_ID : EXECUTION_LAW_HIERARCHY[0].id
    );
    const [leafFilter, setLeafFilter] = useState<ExecutionLawLeafFilter>(
        isTakhlyaExecutionContext(resolvedExecutionType) ? TAKHLYA_DEFAULT_LEAF_ID : 'all_in_parent'
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [articles, setArticles] = useState<ExecutionLawArticle[]>([]);
    const [articlesLoading, setArticlesLoading] = useState(true);
    const [articlesLoadError, setArticlesLoadError] = useState<string | null>(null);
    const [remoteCatalogEmpty, setRemoteCatalogEmpty] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setArticlesLoading(true);
        setArticlesLoadError(null);
        void loadExecutionLawArticlesRemote()
            .then((rows) => {
                if (cancelled) return;
                setArticles(rows);
                setRemoteCatalogEmpty(rows.length === 0);
            })
            .catch((e) => {
                if (cancelled) return;
                setArticles([]);
                setRemoteCatalogEmpty(false);
                setArticlesLoadError(
                    e instanceof Error ? e.message : 'تعذر تحميل مواد قانون التنفيذ من قاعدة البيانات.'
                );
            })
            .finally(() => {
                if (!cancelled) setArticlesLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [lawGuideFileId]);

    const activeParent = useMemo(
        () => EXECUTION_LAW_HIERARCHY.find((p) => p.id === parentId) ?? EXECUTION_LAW_HIERARCHY[0],
        [parentId]
    );

    const childChips = useMemo(() => activeParent.children, [activeParent]);

    const selectParent = (nextParentId: ExecutionLawParentId) => {
        if (nextParentId === parentId) return;
        setParentId(nextParentId);
        setLeafFilter('all_in_parent');
    };

    useEffect(() => {
        const row = parentChipsRef.current;
        if (!row) return;
        const activeBtn = row.querySelector<HTMLButtonElement>(`[data-parent-chip="${parentId}"]`);
        activeBtn?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
    }, [parentId]);

    useEffect(() => {
        if (leafFilter === 'all_in_parent') return;
        const row = childChipsRef.current;
        if (!row) return;
        const activeBtn = row.querySelector<HTMLButtonElement>(`[data-leaf-chip="${leafFilter}"]`);
        activeBtn?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
    }, [leafFilter, parentId]);

    useEffect(() => {
        if (!lawGuideFileId) return;
        setSearchQuery('');
        scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }, [lawGuideFileId]);

    useEffect(() => {
        if (!lawGuideFileId || !isTakhlyaCtx) return;
        setParentId(TAKHLYA_PARENT_ID);
        setLeafFilter(TAKHLYA_DEFAULT_LEAF_ID);
    }, [lawGuideFileId, isTakhlyaCtx]);

    const searchActive = Boolean(searchQuery.trim());

    const filtered = useMemo(() => {
        if (searchActive) {
            return searchExecutionLawsGlobal(articles, searchQuery);
        }
        return filterExecutionLawsByHierarchy(articles, parentId, leafFilter, '');
    }, [searchActive, searchQuery, parentId, leafFilter, articles]);

    return (
        <>
            <div className="shrink-0 border-b border-slate-800/80 px-4 py-3">
                <div className="relative">
                    <Search
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                        aria-hidden
                    />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ابحث برقم المادة أو كلمة…"
                        className="w-full rounded-xl border border-slate-600/40 bg-slate-900/60 py-2.5 pr-10 pl-3 text-right text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#E6C673]/45 focus:outline-none focus:ring-1 focus:ring-[#E6C673]/25"
                        aria-label="بحث في مواد قانون التنفيذ"
                    />
                </div>
            </div>

            {!searchActive ? (
                <div className="shrink-0 space-y-2 border-b border-slate-800/80 px-2 py-2">
                    <div
                        ref={parentChipsRef}
                        role="tablist"
                        aria-label="التصنيفات العامة لقانون التنفيذ"
                        className="hide-scrollbar flex w-full flex-row-reverse flex-nowrap gap-2 overflow-x-auto overscroll-x-contain px-2 pb-0.5 touch-pan-x"
                    >
                        {EXECUTION_LAW_HIERARCHY.map((parent) => {
                            const active = parent.id === parentId;
                            return (
                                <button
                                    key={parent.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    data-parent-chip={parent.id}
                                    onClick={() => selectParent(parent.id)}
                                    className={`${PARENT_CHIP_BASE} ${active ? PARENT_CHIP_ACTIVE : PARENT_CHIP_IDLE}`}
                                >
                                    {parent.label}
                                </button>
                            );
                        })}
                    </div>

                    {activeParent.taskHint ? (
                        <p className="px-3 text-center text-[10px] leading-relaxed text-slate-500">
                            {activeParent.taskHint}
                        </p>
                    ) : null}

                    <div
                        ref={childChipsRef}
                        role="tablist"
                        aria-label={`إجراءات ${activeParent.label}`}
                        className="hide-scrollbar flex w-full flex-row-reverse flex-nowrap gap-2 overflow-x-auto overscroll-x-contain px-2 pb-1 touch-pan-x"
                    >
                        <button
                            type="button"
                            onClick={() => setLeafFilter('all_in_parent')}
                            className={`${LEAF_CHIP_BASE} ${
                                leafFilter === 'all_in_parent' ? LEAF_CHIP_ACTIVE : LEAF_CHIP_IDLE
                            }`}
                        >
                            كل المواد
                        </button>
                        {childChips.map((child) => {
                            const active = leafFilter === child.id;
                            return (
                                <button
                                    key={child.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    data-leaf-chip={child.id}
                                    onClick={() => setLeafFilter(child.id)}
                                    className={`${LEAF_CHIP_BASE} ${active ? LEAF_CHIP_ACTIVE : LEAF_CHIP_IDLE}`}
                                >
                                    {child.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <p className="shrink-0 border-b border-slate-800/80 px-4 py-2 text-center text-[10px] text-slate-500">
                    نتائج البحث في جميع التصنيفات
                </p>
            )}

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                {articlesLoading ? (
                    <p className="py-8 text-center text-sm text-slate-500">جاري تحميل مواد القانون…</p>
                ) : articlesLoadError ? (
                    <p className="py-8 text-center text-sm text-rose-300/90">{articlesLoadError}</p>
                ) : remoteCatalogEmpty ? (
                    <p className="py-8 text-center text-sm leading-relaxed text-slate-400">
                        لا توجد مواد محقونة لقانون التنفيذ في قاعدة البيانات.
                        <br />
                        ارفع المتون الجديدة من لوحة الإدارة (قسم التنفيذ).
                    </p>
                ) : filtered.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                        لا نتائج مطابقة للبحث أو التصنيف.
                    </p>
                ) : (
                    <ul className="space-y-3 pb-6">
                        {filtered.map((art) => (
                            <ExecutionLawArticleCard
                                key={art.number}
                                art={art}
                                searchQuery={searchQuery}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
};
