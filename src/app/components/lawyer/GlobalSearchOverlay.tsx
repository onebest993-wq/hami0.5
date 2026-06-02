import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
    Search,
    X,
    FileText,
    User,
    Scale,
    Clock,
    ArrowUpLeft,
    StickyNote,
    Paperclip,
    Hammer,
    Gavel,
    Loader2,
    Landmark,
    UserCircle,
    Mic,
    Calendar,
    AlertTriangle,
    ListTodo,
    Wallet,
    BookOpen,
    MessagesSquare,
    Sparkles,
    Bell,
} from 'lucide-react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { HighlightedText } from '@/app/components/lawyer/LawyerShared';
import {
    useGlobalSearch,
    type GlobalSearchNavigate,
} from '@/app/components/lawyer/GlobalSearchOverlay/useGlobalSearch';
import {
    SEARCH_CATEGORY_LABELS,
    type GlobalSearchCategory,
    type GlobalSearchEntry,
    type GroupedSearchResults,
} from '@/app/services/globalSearchIndex';
import { SEARCH_LIFECYCLE_LABELS } from '@/app/services/searchLifecycle';
import { useRagStore } from '@/app/stores/ragStore';
import { PERFORMANCE } from '@/app/utils/constants';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import {
    buildPinFromSearchEntry,
    canPinSearchEntry,
    type WorkspacePinLookupContext,
} from '@/app/workspace/buildPinFromSearchEntry';
import { buildClusterScanIndex } from '@/app/workspace/buildClusterScanIndex';
import { findCrossSectionLinks } from '@/app/workspace/clusterMatchRules';

export interface GlobalSearchOverlayProps {
    onClose: () => void;
    onNavigate: (navigate: GlobalSearchNavigate) => void;
    files: FileData[];
    executionFiles?: (FileData & { executionTrashDeletedAt?: string | null })[];
    globalNotes: { id: number | string; title?: string; body?: string; type?: string }[];
    notifications?: { id: string; title: string; message: string; type: string }[];
    userId: string | null;
    initialQuery?: string;
    indexVersion?: number;
}

const CATEGORY_META: Record<
    GlobalSearchCategory,
    { icon: React.ElementType; color: string }
> = {
    lawsuit: { icon: Scale, color: '#E6C673' },
    transaction: { icon: FileText, color: '#38BDF8' },
    execution: { icon: Hammer, color: '#EF4444' },
    criminal: { icon: Gavel, color: '#F97316' },
    note: { icon: StickyNote, color: '#34D399' },
    voice: { icon: Mic, color: '#F472B6' },
    vault: { icon: Paperclip, color: '#C084FC' },
    repository: { icon: BookOpen, color: '#A78BFA' },
    case: { icon: Scale, color: '#94A3B8' },
    party: { icon: User, color: '#60A5FA' },
    profile: { icon: UserCircle, color: '#FBBF24' },
    task: { icon: ListTodo, color: '#2DD4BF' },
    calendar: { icon: Calendar, color: '#38BDF8' },
    urgent: { icon: AlertTriangle, color: '#FB923C' },
    threading: { icon: FileText, color: '#818CF8' },
    finance: { icon: Wallet, color: '#4ADE80' },
    community: { icon: MessagesSquare, color: '#F472B6' },
    notification: { icon: Bell, color: '#F59E0B' },
};

const SECTION_ORDER: GlobalSearchCategory[] = [
    'lawsuit',
    'execution',
    'criminal',
    'transaction',
    'urgent',
    'case',
    'party',
    'task',
    'calendar',
    'note',
    'voice',
    'vault',
    'repository',
    'community',
    'threading',
    'finance',
    'notification',
    'profile',
];

function ResultRow({
    entry,
    query,
    icon: Icon,
    accent,
    onClick,
    pinItem,
    resultIndex,
    active,
    onActivate,
}: {
    entry: GlobalSearchEntry;
    query: string;
    icon: React.ElementType;
    accent: string;
    onClick: () => void;
    pinItem: ReturnType<typeof buildPinFromSearchEntry>;
    relatedLinkCount: number;
    resultIndex: number;
    active: boolean;
    onActivate: (index: number) => void;
}) {
    return (
        <div
            className={`w-full flex items-start gap-2 p-2 rounded-xl bg-[#0A192F] border transition-all ${
                active ? 'border-[#E6C673]/60 ring-2 ring-[#E6C673]/20' : 'border-white/5 hover:border-[#E6C673]/40'
            }`}
        >
            {pinItem ? (
                <div className="shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
                    <WorkspacePinButton
                        item={pinItem}
                        relatedLinkCount={relatedLinkCount}
                        className="!w-8 !h-8"
                        size={14}
                    />
                </div>
            ) : null}
            <button
                type="button"
                onClick={onClick}
                onMouseEnter={() => onActivate(resultIndex)}
                data-search-result-index={resultIndex}
                tabIndex={active ? 0 : -1}
                aria-selected={active}
                className="flex-1 flex items-start gap-3 text-right group outline-none min-w-0"
            >
            <motion.div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${accent}18`, color: accent }}
            >
                <Icon size={18} />
            </motion.div>
            <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center gap-2 justify-end min-w-0">
                    {entry.lifecycle !== 'active' ? (
                        <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                entry.lifecycle === 'archived'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-rose-500/20 text-rose-300'
                            }`}
                        >
                            {SEARCH_LIFECYCLE_LABELS[entry.lifecycle]}
                        </span>
                    ) : null}
                    <p className="text-sm font-bold text-white group-hover:text-[#E6C673] transition-colors truncate min-w-0">
                        <HighlightedText text={entry.title} query={query} />
                    </p>
                </div>
                <p className="text-[10px] text-white/45 mt-0.5 truncate">
                    <HighlightedText text={entry.subtitle} query={query} />
                </p>
                {entry.snippet ? (
                    <p className="text-xs text-white/55 mt-1.5 line-clamp-2">
                        <HighlightedText text={entry.snippet} query={query} />
                    </p>
                ) : null}
            </div>
            </button>
        </div>
    );
}

function ResultsBody({
    grouped,
    query,
    onPick,
    pinLookup,
    scanIndex,
    activeIndex,
    onActiveIndexChange,
}: {
    grouped: GroupedSearchResults;
    query: string;
    onPick: (e: GlobalSearchEntry) => void;
    pinLookup: WorkspacePinLookupContext;
    scanIndex: import('@/app/workspace/types').ClusterScanRecord[];
    activeIndex: number;
    onActiveIndexChange: (index: number) => void;
}) {
    const flat = useMemo(() => {
        const out: GlobalSearchEntry[] = [];
        for (const cat of SECTION_ORDER) {
            const entries = grouped[cat];
            if (entries?.length) out.push(...entries);
        }
        return out;
    }, [grouped]);

    const idToIndex = useMemo(() => {
        const map = new Map<string, number>();
        flat.forEach((e, i) => map.set(e.id, i));
        return map;
    }, [flat]);

    // Pre-compute pin + related-link count لكل نتيجة مرة واحدة (memoized).
    // قبلَ الإصلاح: كان يُحسب لكل render → O(R × N) كل scroll/hover.
    // بعدَ الإصلاح: O(R × N) مرة واحدة فقط لكل تغيير في النتائج أو الـ scanIndex.
    const enriched = useMemo(() => {
        const map = new Map<
            string,
            { pinItem: ReturnType<typeof buildPinFromSearchEntry>; relatedLinkCount: number }
        >();
        for (const e of flat) {
            const pinItem = canPinSearchEntry(e) ? buildPinFromSearchEntry(e, pinLookup) : null;
            const relatedLinkCount = pinItem ? findCrossSectionLinks(pinItem, scanIndex).length : 0;
            map.set(e.id, { pinItem, relatedLinkCount });
        }
        return map;
    }, [flat, pinLookup, scanIndex]);

    return (
        <div className="space-y-8 pb-8">
            {SECTION_ORDER.map((cat) => {
                const entries = grouped[cat];
                if (!entries?.length) return null;
                const meta = CATEGORY_META[cat];
                const Icon = meta.icon;
                return (
                    <section key={cat}>
                        <h3
                            className="font-bold text-sm mb-3 flex items-center gap-2"
                            style={{ color: meta.color }}
                        >
                            <Icon size={18} />
                            <span>{SEARCH_CATEGORY_LABELS[cat]}</span>
                            <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
                            >
                                {entries.length}
                            </span>
                        </h3>
                        <div className="space-y-2">
                            {entries.map((e) => {
                                const enrich = enriched.get(e.id);
                                const pinItem = enrich?.pinItem ?? null;
                                const relatedLinkCount = enrich?.relatedLinkCount ?? 0;
                                return (
                                <ResultRow
                                    key={e.id}
                                    entry={e}
                                    query={query}
                                    icon={Icon}
                                    accent={meta.color}
                                    onClick={() => onPick(e)}
                                    pinItem={pinItem}
                                    relatedLinkCount={relatedLinkCount}
                                    resultIndex={idToIndex.get(e.id) ?? -1}
                                    active={(idToIndex.get(e.id) ?? -1) === activeIndex}
                                    onActivate={onActiveIndexChange}
                                />
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

function RagSection({ query }: { query: string }) {
    const ragResults = useRagStore((s) => s.results);
    const searchLegalMemory = useRagStore((s) => s.searchLegalMemory);
    const isRagSearching = useRagStore((s) => s.isSearching);

    useEffect(() => {
        if (query.trim().length >= PERFORMANCE.MIN_SEARCH_LENGTH) {
            searchLegalMemory(query);
        }
    }, [query, searchLegalMemory]);

    if (!query.trim() || query.trim().length < PERFORMANCE.MIN_SEARCH_LENGTH) return null;
    if (!isRagSearching && (!ragResults || ragResults.length === 0)) return null;

    return (
        <section className="mt-8 pt-6 border-t border-white/10">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-emerald-400">
                <Sparkles size={18} />
                الذاكرة القانونية العميقة
            </h3>
            {isRagSearching ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 animate-pulse">
                    <Loader2 size={20} className="text-emerald-400 animate-spin" />
                    <span className="text-white/40 text-sm">جاري البحث في الذاكرة القانونية...</span>
                </div>
            ) : (
                <div className="space-y-2">
                    {ragResults.map((item) => (
                        <div
                            key={item.id}
                            className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-sm text-emerald-100/90 line-clamp-3"
                        >
                            <HighlightedText
                                text={String(item.metadata?.text ?? '')}
                                query={query}
                            />
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

export const GlobalSearchOverlay = ({
    onClose,
    onNavigate,
    files,
    executionFiles,
    globalNotes,
    notifications,
    userId,
    initialQuery = '',
    indexVersion = 0,
}: GlobalSearchOverlayProps) => {
    const {
        query,
        setQuery,
        debouncedQuery,
        isSearching,
        isLoadingIndex,
        results,
        recentSearches,
        handleResultClick,
        clearRecent,
        pinLookup,
        criminalCases,
    } = useGlobalSearch(onClose, onNavigate, {
        files,
        executionFiles,
        globalNotes,
        notifications,
        userId,
        initialQuery,
        indexVersion,
        overlayOpen: true,
    });

    const overlayRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [activeIndex, setActiveIndex] = useState<number>(-1);

    const flatResults = useMemo(() => {
        if (!results?.hasResults) return [];
        const out: GlobalSearchEntry[] = [];
        for (const cat of SECTION_ORDER) {
            const entries = results[cat];
            if (entries?.length) out.push(...entries);
        }
        return out;
    }, [results]);

    const scanIndexForPreview = useMemo(
        () =>
            buildClusterScanIndex({
                lawsuitFiles: files,
                executionFiles: executionFiles ?? [],
                criminalCases,
                urgentCases: pinLookup.urgentCases,
                threadingTransactions: pinLookup.threadingTransactions ?? [],
                notes: pinLookup.notes,
                fieldTasks: pinLookup.tasks,
            }),
        [files, executionFiles, criminalCases, pinLookup],
    );

    useEffect(() => {
        if (!flatResults.length) {
            setActiveIndex(-1);
            return;
        }
        setActiveIndex((prev) => {
            if (prev >= 0 && prev < flatResults.length) return prev;
            return 0;
        });
    }, [flatResults.length]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const pick = (entry: GlobalSearchEntry) => handleResultClick(entry.navigate, entry.title);

    const focusResultAt = (index: number) => {
        const root = overlayRef.current;
        if (!root) return;
        const el = root.querySelector<HTMLButtonElement>(`button[data-search-result-index="${index}"]`);
        if (!el) return;
        el.focus();
        el.scrollIntoView({ block: 'nearest' });
    };

    const onKeyDownCapture = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') return;

        if (e.key === 'Tab') {
            const root = overlayRef.current;
            if (!root) return;
            const focusables = Array.from(
                root.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ),
            ).filter((el) => el.offsetParent !== null);
            if (focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement as HTMLElement | null;
            if (e.shiftKey) {
                if (active === first || !root.contains(active)) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (active === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
            return;
        }

        const isInput = (e.target as HTMLElement | null)?.tagName === 'INPUT';
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            if (!flatResults.length) return;
            if (isInput || (overlayRef.current?.contains(document.activeElement) ?? false)) {
                e.preventDefault();
                setActiveIndex((prev) => {
                    const next =
                        e.key === 'ArrowDown'
                            ? Math.min(flatResults.length - 1, Math.max(0, prev + 1))
                            : Math.max(0, prev - 1);
                    queueMicrotask(() => focusResultAt(next));
                    return next;
                });
            }
            return;
        }

        if (e.key === 'Enter') {
            if (activeIndex >= 0 && activeIndex < flatResults.length) {
                e.preventDefault();
                pick(flatResults[activeIndex]);
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed inset-0 z-[100] bg-[#050C17]/95 backdrop-blur-xl flex flex-col"
            role="dialog"
            aria-label="بحث شامل"
            aria-modal="true"
            ref={overlayRef}
            onKeyDownCapture={onKeyDownCapture}
        >
            <div className="h-24 px-6 flex items-center gap-4 border-b border-white/10 bg-[#0A192F]/50 shrink-0">
                <Search className="text-[#E6C673] shrink-0" size={28} />
                <input
                    autoFocus
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ابحث في كل التطبيق: ملفات، مهام، معاملات، صوت، مخزن..."
                    className="flex-1 bg-transparent text-xl sm:text-2xl font-bold text-white placeholder-white/25 outline-none border-none h-full"
                />
                {isSearching || isLoadingIndex ? (
                    <Loader2 size={22} className="text-[#E6C673] animate-spin shrink-0" />
                ) : null}
                <button
                    type="button"
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 transition-colors shrink-0"
                    aria-label="إغلاق البحث"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide p-6 max-w-5xl mx-auto w-full">
                {!query.trim() ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-white/40 flex items-center gap-2">
                                <Clock size={16} />
                                آخر عمليات البحث
                            </h3>
                            {recentSearches.length > 0 ? (
                                <button type="button" onClick={clearRecent} className="text-xs text-[#E6C673] hover:underline">
                                    مسح الكل
                                </button>
                            ) : null}
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {recentSearches.length > 0 ? (
                                recentSearches.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setQuery(s)}
                                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:border-[#E6C673]/30 text-white hover:text-[#E6C673] transition-all flex items-center gap-2 group"
                                    >
                                        <span>{s}</span>
                                        <ArrowUpLeft size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))
                            ) : (
                                <p className="text-white/25 text-sm">
                                    {isLoadingIndex ? 'جاري تحميل فهرس التطبيق...' : 'ابدأ بالكتابة للبحث في كل أقسام التطبيق.'}
                                </p>
                            )}
                        </div>
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/5 text-white/40 text-xs leading-relaxed">
                            <Landmark size={16} className="shrink-0 mt-0.5 text-[#E6C673]" />
                            <p>
                                يبحث في: الدعاوى والتنفيذ والمعاملات، الملاحظات والتسجيلات الصوتية، المهام والتقويم،
                                الطلبات المستعجلة، نظام المعاملات الإدارية، مخزن الملفات الذكي، سجل التنفيذ ومستندات
                                الإضابير، المكتبة القانونية، مجتمع المحامين، والملف الشخصي.
                            </p>
                        </div>
                    </div>
                ) : isSearching || !results ? (
                    <div className="flex flex-col items-center justify-center py-24 text-white/30 gap-3">
                        <Loader2 size={36} className="animate-spin text-[#E6C673]/60" />
                        <p>{isLoadingIndex ? 'جاري فهرسة بيانات التطبيق...' : 'جاري البحث...'}</p>
                    </div>
                ) : !results.hasResults ? (
                    <div className="text-center py-20">
                        <Search size={48} className="mx-auto text-white/10 mb-4" />
                        <p className="text-white/30">لا توجد نتائج مطابقة لـ «{query}»</p>
                        <RagSection query={debouncedQuery} />
                    </div>
                ) : (
                    <>
                        <ResultsBody
                            grouped={results}
                            query={query}
                            onPick={pick}
                            pinLookup={pinLookup}
                            scanIndex={scanIndexForPreview}
                            activeIndex={activeIndex}
                            onActiveIndexChange={(i) => {
                                if (i < 0) return;
                                setActiveIndex(i);
                            }}
                        />
                        <RagSection query={debouncedQuery} />
                    </>
                )}
            </div>
        </motion.div>
    );
};
