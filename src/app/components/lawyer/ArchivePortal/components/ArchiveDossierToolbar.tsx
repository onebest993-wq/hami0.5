import React, { useEffect, useId, useRef, useState } from 'react';
import { Archive } from '@/app/components/ui/icons/Archive';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { LayoutGrid } from '@/app/components/ui/icons/LayoutGrid';
import { List } from '@/app/components/ui/icons/List';
import { Search } from '@/app/components/ui/icons/Search';
import { SlidersHorizontal } from '@/app/components/ui/icons/SlidersHorizontal';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import {
    ARCHIVE_GLASS_ACTIVE_COMPACT,
    ARCHIVE_SEGMENT_BTN_ACTIVE,
    ARCHIVE_SEGMENT_BTN_CRIMINAL_ACTIVE,
    ARCHIVE_SEGMENT_BTN_INACTIVE,
} from '../archiveToolbarStyles';

export type ArchiveDossierViewMode = 'grid' | 'compact';

function prefetchCriminalListPath(): void {
    void import('@/app/utils/lazyComponentsIntent')
        .then((m) => m.prefetchCriminalListPath())
        .catch(() => undefined);
}

type LawsuitLifecycleViewMode = 'active' | 'archived' | 'trash';

const JURISDICTION_TABS: { id: LawsuitJurisdictionTab; label: string; full: string }[] = [
    { id: 'all', label: 'الكل', full: 'كل الاختصاصات' },
    { id: 'civil', label: 'مدني', full: 'القضاء المدني' },
    { id: 'personal', label: 'أحوال', full: 'الأحوال الشخصية' },
    { id: 'criminal', label: 'جزائي', full: 'جزائي' },
];

const LIFECYCLE_LABEL: Record<LawsuitLifecycleViewMode, string> = {
    active: 'نشطة',
    archived: 'أرشيف',
    trash: 'سلة',
};

export type ArchiveDossierToolbarProps = {
    showJurisdictionTabs: boolean;
    jurisdictionTab: LawsuitJurisdictionTab;
    onJurisdictionTabChange: (value: LawsuitJurisdictionTab) => void;
    searchQuery: string;
    onSearchQueryChange: (value: string) => void;
    searchPlaceholder?: string;
    viewMode: ArchiveDossierViewMode;
    onViewModeChange: (mode: ArchiveDossierViewMode) => void;
    /** دمج النشطة/الأرشيف داخل لوحة الفلتر بجانب البحث */
    lifecycleViewMode?: LawsuitLifecycleViewMode;
    onLifecycleViewModeChange?: (mode: LawsuitLifecycleViewMode) => void;
    archivedCount?: number;
    trashedCount?: number;
};

/**
 * شريط واحد فاخر: [فلاتر ▾] بحث [عرض]
 * الفلاتر (حالة + اختصاص) تُفتح من زر واحد لتقليص الارتفاع.
 */
export const ArchiveDossierToolbar: React.FC<ArchiveDossierToolbarProps> = ({
    showJurisdictionTabs,
    jurisdictionTab,
    onJurisdictionTabChange,
    searchQuery,
    onSearchQueryChange,
    searchPlaceholder = 'ابحث برقم أو اسم…',
    viewMode,
    onViewModeChange,
    lifecycleViewMode,
    onLifecycleViewModeChange,
    archivedCount = 0,
    trashedCount = 0,
}) => {
    const [filtersOpen, setFiltersOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelId = useId();
    const hasLifecycle = Boolean(lifecycleViewMode && onLifecycleViewModeChange);
    const showFilterButton = hasLifecycle || showJurisdictionTabs;

    const jurisdictionLabel =
        JURISDICTION_TABS.find((t) => t.id === jurisdictionTab)?.label ?? 'الكل';
    const filterSummary = hasLifecycle
        ? `${LIFECYCLE_LABEL[lifecycleViewMode!]} · ${jurisdictionLabel}`
        : jurisdictionLabel;

    useEffect(() => {
        if (!filtersOpen) return;
        const onPointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setFiltersOpen(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setFiltersOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [filtersOpen]);

    return (
        <div dir="rtl" ref={rootRef} className="relative w-full px-4 sm:px-5 py-1.5 border-b border-white/[0.06]">
            <div
                className="flex h-11 w-full items-stretch overflow-hidden rounded-xl border border-white/12 bg-[#0B1021]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                role="search"
            >
                {showFilterButton ? (
                    <button
                        type="button"
                        data-testid="archive-jurisdiction-filters-toggle"
                        aria-expanded={filtersOpen}
                        aria-controls={panelId}
                        onClick={() => setFiltersOpen((open) => !open)}
                        className={`flex shrink-0 items-center gap-1.5 border-l border-white/10 px-2.5 text-[11px] font-bold transition-colors touch-manipulation ${
                            filtersOpen
                                ? ARCHIVE_SEGMENT_BTN_ACTIVE
                                : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                        }`}
                    >
                        <SlidersHorizontal size={14} aria-hidden />
                        <span className="max-w-[7.5rem] truncate">{filterSummary}</span>
                        <ChevronDown
                            size={14}
                            className={`opacity-70 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
                            aria-hidden
                        />
                    </button>
                ) : null}

                <label className="relative flex min-w-0 flex-1 items-center">
                    <span className="sr-only">بحث في الإضابير</span>
                    <Search
                        className="pointer-events-none absolute start-3 text-white/40"
                        size={15}
                        aria-hidden
                    />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => onSearchQueryChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        autoComplete="off"
                        enterKeyHint="search"
                        className="h-full w-full bg-transparent ps-9 pe-3 text-sm text-white placeholder:text-white/35 outline-none focus:bg-white/[0.03] appearance-none [&::-webkit-search-decoration]:hidden [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-results-button]:hidden [&::-webkit-search-results-decoration]:hidden"
                    />
                </label>

                <div
                    className="flex shrink-0 items-center gap-0.5 border-r border-white/10 px-1"
                    role="group"
                    aria-label="نمط العرض"
                >
                    <button
                        type="button"
                        title="عرض شبكي"
                        aria-pressed={viewMode === 'grid'}
                        onClick={() => onViewModeChange('grid')}
                        className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-colors touch-manipulation ${
                            viewMode === 'grid'
                                ? ARCHIVE_GLASS_ACTIVE_COMPACT
                                : 'text-white/45 hover:bg-white/[0.06] hover:text-white'
                        }`}
                    >
                        <LayoutGrid size={15} />
                    </button>
                    <button
                        type="button"
                        title="عرض مضغوط"
                        aria-pressed={viewMode === 'compact'}
                        onClick={() => onViewModeChange('compact')}
                        className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-colors touch-manipulation ${
                            viewMode === 'compact'
                                ? ARCHIVE_GLASS_ACTIVE_COMPACT
                                : 'text-white/45 hover:bg-white/[0.06] hover:text-white'
                        }`}
                    >
                        <List size={15} />
                    </button>
                </div>
            </div>

            {filtersOpen ? (
                <div
                    id={panelId}
                    className="absolute inset-x-4 sm:inset-x-5 top-[calc(100%-0.25rem)] z-40 rounded-2xl border border-white/12 bg-[#0B1021] p-2.5 shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
                    role="dialog"
                    aria-label="فلاتر المخزن"
                >
                    {hasLifecycle ? (
                        <div className="mb-3">
                            <p className="mb-1.5 px-0.5 text-[10px] font-bold tracking-wide text-white/40">
                                الحالة
                            </p>
                            <div
                                className="flex flex-wrap gap-1.5"
                                role="tablist"
                                aria-label="حالة الإضابير"
                            >
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={lifecycleViewMode === 'active'}
                                    data-testid="lawsuits-view-active"
                                    onClick={() => onLifecycleViewModeChange?.('active')}
                                    className={`min-h-[44px] rounded-xl px-3 text-[11px] font-bold touch-manipulation ${
                                        lifecycleViewMode === 'active'
                                            ? ARCHIVE_SEGMENT_BTN_ACTIVE
                                            : ARCHIVE_SEGMENT_BTN_INACTIVE
                                    }`}
                                >
                                    الإضابير النشطة
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={lifecycleViewMode === 'archived'}
                                    data-testid="lawsuits-view-archived"
                                    onClick={() => onLifecycleViewModeChange?.('archived')}
                                    className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-[11px] font-bold touch-manipulation ${
                                        lifecycleViewMode === 'archived'
                                            ? 'bg-amber-950/45 text-amber-100 border border-amber-500/30'
                                            : ARCHIVE_SEGMENT_BTN_INACTIVE
                                    }`}
                                >
                                    <Archive size={13} aria-hidden />
                                    الأرشيف
                                    {lifecycleViewMode !== 'archived' && archivedCount > 0 ? (
                                        <span className="min-w-[1.1rem] h-4 rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white inline-flex items-center justify-center">
                                            {archivedCount > 9 ? '9+' : archivedCount}
                                        </span>
                                    ) : null}
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={lifecycleViewMode === 'trash'}
                                    data-testid="lawsuits-trash-toggle"
                                    onClick={() => onLifecycleViewModeChange?.('trash')}
                                    className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-[11px] font-bold touch-manipulation ${
                                        lifecycleViewMode === 'trash'
                                            ? 'bg-rose-950/50 text-rose-100 border border-rose-500/30'
                                            : ARCHIVE_SEGMENT_BTN_INACTIVE
                                    }`}
                                >
                                    <Trash2 size={13} aria-hidden />
                                    السلة
                                    {lifecycleViewMode !== 'trash' && trashedCount > 0 ? (
                                        <span className="min-w-[1.1rem] h-4 rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white inline-flex items-center justify-center">
                                            {trashedCount > 9 ? '9+' : trashedCount}
                                        </span>
                                    ) : null}
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {showJurisdictionTabs ? (
                        <div>
                            <p className="mb-1.5 px-0.5 text-[10px] font-bold tracking-wide text-white/40">
                                الاختصاص
                            </p>
                            <div
                                className="flex flex-wrap gap-1.5"
                                role="tablist"
                                aria-label="فلترة اختصاص الدعوى"
                            >
                                {JURISDICTION_TABS.map((tab) => {
                                    const isActive = jurisdictionTab === tab.id;
                                    const isCriminal = tab.id === 'criminal';
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            role="tab"
                                            aria-selected={isActive}
                                            title={tab.full}
                                            data-testid={
                                                isCriminal
                                                    ? 'archive-tab-criminal'
                                                    : `archive-jurisdiction-${tab.id}`
                                            }
                                            onClick={() => onJurisdictionTabChange(tab.id)}
                                            onPointerEnter={() => {
                                                if (isCriminal) prefetchCriminalListPath();
                                            }}
                                            onFocus={() => {
                                                if (isCriminal) prefetchCriminalListPath();
                                            }}
                                            className={`min-h-[44px] rounded-xl px-3 text-[11px] font-bold touch-manipulation ${
                                                isActive
                                                    ? isCriminal
                                                        ? ARCHIVE_SEGMENT_BTN_CRIMINAL_ACTIVE
                                                        : ARCHIVE_SEGMENT_BTN_ACTIVE
                                                    : ARCHIVE_SEGMENT_BTN_INACTIVE
                                            }`}
                                        >
                                            {tab.full}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    {lifecycleViewMode === 'trash' ? (
                        <p className="mt-3 text-[11px] leading-relaxed text-amber-200/75">
                            تبقى الإضابير هنا حتى تحذفها نهائياً بنفسك. يمكنك استرجاعها في أي وقت.
                        </p>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};
