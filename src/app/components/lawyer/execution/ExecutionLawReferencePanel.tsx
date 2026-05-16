import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Loader2, Search, Scale } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import {
    executionLawData,
    EXECUTION_LAW_CATEGORY_LABELS,
    filterExecutionLaws,
    normalizeLawSearchText,
    type ExecutionLawArticle,
    type ExecutionLawCategory,
    type ExecutionLawTabFilter,
} from '@/data/executionLaws';

type SseChunk = {
    choices?: Array<{ delta?: { content?: string } }>;
};

function extractDeltaContent(jsonLine: string): string | null {
    try {
        const j = JSON.parse(jsonLine) as SseChunk;
        const c = j.choices?.[0]?.delta?.content;
        return typeof c === 'string' && c.length > 0 ? c : null;
    } catch {
        return null;
    }
}

function processSseLine(line: string, onDelta: (piece: string) => void): void {
    const t = line.trim();
    if (!t.startsWith('data:')) return;
    const data = t.slice(5).trim();
    if (!data || data === '[DONE]') return;
    const piece = extractDeltaContent(data);
    if (piece) onDelta(piece);
}

/** تصيير Markdown للتحليل القانوني — محاذاة يمين ووضوح في RTL */
const LEGAL_ANALYSIS_MD_COMPONENTS: Partial<Components> = {
    h1: ({ children }) => (
        <h3 className="mb-2 mt-3 text-right text-base font-bold text-gray-100 first:mt-0">{children}</h3>
    ),
    h2: ({ children }) => (
        <h3 className="mb-2 mt-3 text-right text-base font-bold text-gray-100 first:mt-0">{children}</h3>
    ),
    h3: ({ children }) => (
        <h4 className="mb-2 mt-2 text-right text-sm font-bold text-gray-100">{children}</h4>
    ),
    h4: ({ children }) => (
        <h4 className="mb-1.5 mt-2 text-right text-sm font-semibold text-gray-200">{children}</h4>
    ),
    h5: ({ children }) => (
        <h5 className="mb-1 mt-2 text-right text-sm font-semibold text-gray-300">{children}</h5>
    ),
    h6: ({ children }) => (
        <h6 className="mb-1 mt-2 text-right text-xs font-semibold text-gray-400">{children}</h6>
    ),
    p: ({ children }) => (
        <p className="mb-2 text-right text-sm leading-relaxed text-gray-200 last:mb-0">{children}</p>
    ),
    strong: ({ children }) => <strong className="font-semibold text-gray-100">{children}</strong>,
    em: ({ children }) => <em className="text-gray-300">{children}</em>,
    ul: ({ children }) => (
        <ul className="mr-5 mb-2 list-disc space-y-1 text-right text-sm leading-relaxed text-gray-200">{children}</ul>
    ),
    ol: ({ children }) => (
        <ol className="mr-5 mb-2 list-decimal space-y-1 text-right text-sm leading-relaxed text-gray-200">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    blockquote: ({ children }) => (
        <blockquote className="my-2 border-r-2 border-amber-500/35 pr-3 text-right text-sm leading-relaxed text-gray-300">
            {children}
        </blockquote>
    ),
    hr: () => <hr className="my-3 border-gray-700/80" />,
    a: ({ href, children }) => (
        <a
            href={href}
            className="text-amber-400 underline decoration-amber-500/40 underline-offset-2 hover:text-amber-300"
            target="_blank"
            rel="noopener noreferrer"
        >
            {children}
        </a>
    ),
    pre: ({ children }) => (
        <pre className="mb-2 overflow-x-auto rounded-lg bg-slate-950/90 p-3 text-left" dir="ltr">
            {children}
        </pre>
    ),
    code: ({ className, children, ...props }) => {
        const inline = !className;
        if (inline) {
            return (
                <code
                    className="rounded bg-slate-800/90 px-1 py-0.5 font-mono text-[0.85em] text-amber-200/95"
                    {...props}
                >
                    {children}
                </code>
            );
        }
        return (
            <code className={`block font-mono text-xs leading-relaxed text-gray-200 ${className ?? ''}`} {...props}>
                {children}
            </code>
        );
    },
};

type AnalysisDepth = 'standard' | 'deep';

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
}> = ({ art, searchQuery }) => {
    const [showSimplifiedExplanation, setShowSimplifiedExplanation] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState('');
    const [preStreamSpinner, setPreStreamSpinner] = useState(false);
    const [analysisDepth, setAnalysisDepth] = useState<AnalysisDepth>('standard');
    const analysisAbortRef = useRef<AbortController | null>(null);
    const analysisRunIdRef = useRef(0);

    useEffect(() => {
        return () => {
            analysisAbortRef.current?.abort();
            analysisAbortRef.current = null;
        };
    }, []);

    const runLegalAnalysis = useCallback(
        async (isDeepSearch: boolean) => {
            analysisAbortRef.current?.abort();
            const controller = new AbortController();
            analysisAbortRef.current = controller;
            const runId = analysisRunIdRef.current + 1;
            analysisRunIdRef.current = runId;

            setAnalysisResult('');
            setAnalysisDepth(isDeepSearch ? 'deep' : 'standard');
            setIsAnalyzing(true);
            setPreStreamSpinner(true);
            let sawFirstChar = false;

            const onDelta = (piece: string) => {
                if (!sawFirstChar) {
                    sawFirstChar = true;
                    setPreStreamSpinner(false);
                }
                setAnalysisResult((prev) => prev + piece);
            };

            try {
                const response = await fetch('/api/legal-analysis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal,
                    body: JSON.stringify({
                        articleTitle: art.title,
                        articleContent: art.content,
                        isDeepSearch,
                    }),
                });

            if (!response.ok) {
                if (analysisRunIdRef.current !== runId) return;
                setPreStreamSpinner(false);
                const raw = await response.text();
                let msg = `تعذر التحليل (${response.status})`;
                try {
                    const j = JSON.parse(raw) as { error?: string };
                    if (typeof j.error === 'string' && j.error) msg = j.error;
                    else if (raw) msg = raw.slice(0, 500);
                } catch {
                    if (raw) msg = raw.slice(0, 500);
                }
                setAnalysisResult(msg);
                return;
            }

            const reader = response.body?.getReader();
            if (!reader) {
                if (analysisRunIdRef.current !== runId) return;
                setPreStreamSpinner(false);
                setAnalysisResult('المتصفح لا يدعم قراءة البث من الخادم.');
                return;
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (analysisRunIdRef.current !== runId) {
                    await reader.cancel();
                    break;
                }
                if (value) {
                    buffer += decoder.decode(value, { stream: true });
                }
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';
                for (const line of lines) {
                    processSseLine(line, onDelta);
                }
                if (done) {
                    if (buffer.trim()) {
                        for (const line of buffer.split('\n')) {
                            processSseLine(line, onDelta);
                        }
                    }
                    break;
                }
            }
            } catch (e) {
                if (e instanceof Error && e.name === 'AbortError') {
                    return;
                }
                if (analysisRunIdRef.current !== runId) return;
                setPreStreamSpinner(false);
                const message = e instanceof Error ? e.message : 'خطأ غير معروف';
                setAnalysisResult(`فشل الاتصال بالتحليل: ${message}`);
            } finally {
                if (analysisRunIdRef.current !== runId) return;
                setIsAnalyzing(false);
                setPreStreamSpinner(false);
                analysisAbortRef.current = null;
            }
        },
        [art.content, art.title]
    );

    const handleStandardAnalysis = useCallback(() => runLegalAnalysis(false), [runLegalAnalysis]);
    const handleDeeperSearch = useCallback(() => runLegalAnalysis(true), [runLegalAnalysis]);

    const showAnalysisPanel = isAnalyzing || analysisResult.length > 0;
    const analysisPanelTitle =
        analysisDepth === 'deep' ? 'التحليل الفائق — بحث أعمق (تمييز 2015+)' : 'التحليل القانوني';
    const showDeeperSearchButton =
        analysisDepth === 'standard' && analysisResult.trim().length > 0 && !isAnalyzing;
    const simplifiedText = String(art.aiExplanation ?? '').trim();

    return (
        <li className="rounded-2xl border border-slate-700/40 bg-slate-900/35 p-4 text-right backdrop-blur-sm">
            <div className="flex items-start justify-between gap-2">
                <span className="rounded-md border border-slate-600/50 bg-slate-950/50 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                    {EXECUTION_LAW_CATEGORY_LABELS[art.category]}
                </span>
                <Scale className="h-4 w-4 shrink-0 text-[#E6C673]/75" aria-hidden />
            </div>

            <h3 className="mt-3 text-lg font-black leading-snug text-slate-100">
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

            <div className="mt-4 flex flex-row-reverse items-stretch gap-2" dir="rtl">
                <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                    onClick={handleStandardAnalysis}
                    disabled={isAnalyzing}
                    aria-busy={isAnalyzing}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-[#D4AF37]/70 bg-gradient-to-r from-[#D4AF37]/12 to-transparent px-3 py-2 text-[11px] font-bold leading-tight text-[#D4AF37] shadow-sm transition-colors hover:from-[#D4AF37]/18 hover:to-[#D4AF37]/04 disabled:pointer-events-none disabled:opacity-55"
                >
                    <span>تحليل قانوني</span>
                    {preStreamSpinner && analysisDepth === 'standard' ? (
                        <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[#D4AF37]" aria-hidden />
                    ) : null}
                </motion.button>
                <button
                    type="button"
                    onClick={() => setShowSimplifiedExplanation((v) => !v)}
                    aria-expanded={showSimplifiedExplanation}
                    aria-controls={`simplified-explanation-${art.number}`}
                    id={`simplified-toggle-${art.number}`}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/07 px-3 py-2 text-[11px] font-bold leading-tight text-[#E6C673]/95 transition-colors hover:bg-[#E6C673]/12"
                >
                    <BookOpen className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                    <span>{showSimplifiedExplanation ? 'إخفاء' : 'الشرح المبسط'}</span>
                </button>
            </div>

            <AnimatePresence initial={false}>
                {showSimplifiedExplanation ? (
                    <motion.div
                        key={`simple-${art.number}`}
                        id={`simplified-explanation-${art.number}`}
                        role="region"
                        aria-labelledby={`simplified-toggle-${art.number}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3 rounded-xl border border-[#E6C673]/20 bg-[#E6C673]/05 px-3 py-2.5">
                            <p className="mb-1 text-[10px] font-bold text-[#E6C673]/90">الشرح المبسط</p>
                            <p className="text-[11px] leading-relaxed text-slate-300/95">
                                {simplifiedText || 'لا يوجد شرح مبسط لهذه المادة حالياً.'}
                            </p>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            <AnimatePresence initial={false}>
                {showAnalysisPanel ? (
                    <motion.div
                        key={`deep-${art.number}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 rounded-xl border border-[#D4AF37]/30 bg-[#1A1E2E]/80 p-6 backdrop-blur-sm">
                            <div className="mb-3 flex flex-row-reverse flex-wrap items-center justify-between gap-2">
                                <p className="text-[10px] font-bold text-[#D4AF37]/90">{analysisPanelTitle}</p>
                                <div className="flex shrink-0 items-center gap-2">
                                    {showDeeperSearchButton ? (
                                        <button
                                            type="button"
                                            onClick={handleDeeperSearch}
                                            disabled={isAnalyzing}
                                            className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-900/40 px-3 py-1.5 text-xs font-semibold text-amber-400 transition-all hover:bg-amber-900/60 disabled:pointer-events-none disabled:opacity-50"
                                        >
                                            ⚡ بحث أعمق
                                        </button>
                                    ) : null}
                                    {isAnalyzing && analysisDepth === 'deep' ? (
                                        <Loader2
                                            className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-400"
                                            aria-hidden
                                        />
                                    ) : null}
                                </div>
                            </div>
                            <div
                                className="text-right text-sm leading-relaxed text-gray-200"
                                dir="rtl"
                            >
                                {analysisResult.length === 0 && isAnalyzing ? (
                                    <span
                                        className="inline-block h-4 w-0.5 animate-pulse rounded-sm bg-[#D4AF37]/90 align-middle"
                                        aria-hidden
                                    />
                                ) : (
                                    <>
                                        <div className="legal-analysis-markdown">
                                            <ReactMarkdown components={LEGAL_ANALYSIS_MD_COMPONENTS}>
                                                {analysisResult}
                                            </ReactMarkdown>
                                        </div>
                                        {isAnalyzing && analysisResult.length > 0 ? (
                                            <span
                                                className="mr-1 inline-block h-4 w-0.5 animate-pulse rounded-sm bg-[#D4AF37]/90 align-middle"
                                                aria-hidden
                                            />
                                        ) : null}
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </li>
    );
};

/**
 * لوحة مرجع قانون التنفيذ — بحث، تبويبات، عرض المادة، الشرح المبسط، وتحليل معمق (بث OpenRouter).
 * `executionType`: اختياري؛ إن وُجد يُكمّل/يُغلّب على `executionType` المخزّن في ملف التنفيذ الحالي (Zustand).
 */
function isTakhlyaExecutionContext(executionTypeRaw: string): boolean {
    const t = executionTypeRaw.trim();
    if (!t) return false;
    if (t === 'تخلية') return true;
    return t.includes('تخلية');
}

/**
 * `executionType` من الإضبارة (يفضّل تمريره من الـ Dashboard): عند التخلية يُفعّل تبويب أحكام التخلية.
 */
export const ExecutionLawReferencePanel: React.FC<{ executionType?: string }> = ({
    executionType: executionTypeProp,
}) => {
    const lawGuideFileId = useExecutionDashboardStore((s) => s.currentFile?.id ?? '');
    const executionTypeFromStore = useExecutionDashboardStore((s) => s.currentFile?.executionType);
    const resolvedExecutionType = String(executionTypeProp ?? executionTypeFromStore ?? '').trim();
    const isTakhlyaCtx = isTakhlyaExecutionContext(resolvedExecutionType);

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [tab, setTab] = useState<ExecutionLawTabFilter>(() => {
        const fromStore = useExecutionDashboardStore.getState().currentFile?.executionType;
        const initialResolved = String(executionTypeProp ?? fromStore ?? '').trim();
        return isTakhlyaExecutionContext(initialResolved) ? 'takhlya' : 'all';
    });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!lawGuideFileId) return;
        setSearchQuery('');
        scrollRef.current?.scrollTo({ top: 0 });
    }, [lawGuideFileId]);

    useEffect(() => {
        if (!lawGuideFileId) return;
        if (isTakhlyaCtx) {
            setTab('takhlya');
        } else {
            setTab((t) => (t === 'takhlya' ? 'all' : t));
        }
    }, [lawGuideFileId, isTakhlyaCtx]);

    const tabItems = useMemo(() => {
        const base: { id: ExecutionLawTabFilter; label: string }[] = [
            { id: 'all', label: 'الكل' },
            ...(Object.entries(EXECUTION_LAW_CATEGORY_LABELS) as [ExecutionLawCategory, string][]).map(
                ([id, label]) => ({ id, label })
            ),
        ];
        if (!isTakhlyaCtx) return base;
        return [{ id: 'takhlya' as const, label: '🎯 أحكام التخلية' }, ...base];
    }, [isTakhlyaCtx]);

    const filtered = useMemo(
        () => filterExecutionLaws(executionLawData, tab, searchQuery),
        [tab, searchQuery]
    );

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
            <div className="shrink-0 border-b border-slate-800/80 px-4 py-2">
                <div className="hide-scrollbar flex w-full flex-row-reverse flex-nowrap gap-2 overflow-x-auto pb-1">
                    {tabItems.map((t) => {
                        const active = tab === t.id;
                        const isTakhlyaTab = t.id === 'takhlya';
                        let activeClass: string;
                        if (active) {
                            activeClass = isTakhlyaTab
                                ? 'border border-amber-500/40 bg-amber-500/20 text-amber-400'
                                : 'border border-purple-500/35 bg-purple-900/40 text-purple-300';
                        } else {
                            activeClass =
                                'border border-white/10 bg-transparent text-slate-400 hover:border-white/20 hover:text-slate-200';
                        }
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTab(t.id)}
                                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors ${activeClass}`}
                            >
                                {t.label}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                {filtered.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                        لا نتائج مطابقة للبحث أو التبويب.
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
