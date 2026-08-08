import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Sparkles, Loader2, X, Check, ListFilter } from '@/app/components/ui/lucideIcons';
import {
    countDocsInCategory,
    countRepositoryCategoryItems,
    getVisibleVaultCustomCategories,
    REPOSITORY_ACTION_CATEGORY,
    categoryMatchesName,
} from '@/app/services/vaultCustomCategories';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { REPO_PORTAL_Z } from '@/app/components/lawyer/SmartRepository/smartRepositoryTheme';
import { VAULT_TRAVERTINE_HUB, VAULT_CHIP_ACTIVE, VAULT_CHIP_IDLE, VAULT_INPUT } from './vaultDustyRoseTheme';

const FILTER_POPOVER_WIDTH = 272;
const FILTER_POPOVER_MAX_H = 320;

type FilterPopoverPos = { top: number; left: number; width: number; maxHeight: number };

function computeFilterPopoverPos(anchor: HTMLElement): FilterPopoverPos {
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(FILTER_POPOVER_WIDTH, window.innerWidth - 20);
    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const preferBelow = spaceBelow >= 180 || spaceBelow >= spaceAbove;
    const maxHeight = Math.min(
        FILTER_POPOVER_MAX_H,
        Math.round(vh * 0.48),
        preferBelow ? Math.max(140, spaceBelow) : Math.max(140, spaceAbove),
    );
    const top = preferBelow ? rect.bottom + gap : Math.max(8, rect.top - gap - maxHeight);
    let left = rect.right - width;
    left = Math.max(10, Math.min(left, vw - width - 10));
    return { top, left, width, maxHeight };
}

export type VaultSearchFilterHubProps = {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    isSearching: boolean;
    onAISearch: () => void;
    /** بحث فوري — بدون زر ذكاء أو مؤشر تحميل */
    liveSearch?: boolean;
    /** بحث فقط — التصنيفات مدمجة داخل نافذة البحث (المستودع الموحّد) */
    searchOnly?: boolean;
    /** التصنيفات في شريط منفصل — يُخفى زر/لوحة التصنيف من البحث */
    externalClassification?: boolean;
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    customCategories: string[];
    onAddCategory: (name: string) => void;
    onRemoveCategory: (name: string) => void;
    docs: SmartVaultDoc[];
    /** ملاحظات للعدّ الدقيق في فلاتر النوع (بطاقة، مسح، …) */
    notes?: GlobalNote[];
};

export const VaultSearchFilterHub: React.FC<VaultSearchFilterHubProps> = ({
    searchQuery,
    onSearchChange,
    onSearchKeyDown,
    searchInputRef,
    isSearching,
    onAISearch,
    liveSearch = false,
    searchOnly = false,
    externalClassification = false,
    activeFilter,
    onFilterChange,
    customCategories,
    onAddCategory,
    onRemoveCategory,
    docs,
    notes = [],
}) => {
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [filterPanelMounted, setFilterPanelMounted] = useState(false);
    const [filterPanelVisible, setFilterPanelVisible] = useState(false);
    const filterToggleRef = useRef<HTMLButtonElement>(null);
    const filterMenuRef = useRef<HTMLDivElement>(null);
    const [filterMenuPos, setFilterMenuPos] = useState<FilterPopoverPos>({
        top: 0,
        left: 0,
        width: FILTER_POPOVER_WIDTH,
        maxHeight: FILTER_POPOVER_MAX_H,
    });
    const filtersPanelId = useId();
    const visibleCategories = getVisibleVaultCustomCategories(customCategories);
    const filterPopoverOpen = filtersExpanded || creating;

    useEffect(() => {
        if (!searchOnly || externalClassification) return;

        if (filterPopoverOpen) {
            setFilterPanelMounted(true);
            const frame = requestAnimationFrame(() => setFilterPanelVisible(true));
            return () => cancelAnimationFrame(frame);
        }

        setFilterPanelVisible(false);
        const timer = window.setTimeout(() => setFilterPanelMounted(false), 240);
        return () => window.clearTimeout(timer);
    }, [externalClassification, filterPopoverOpen, searchOnly]);

    const submitCategory = () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        onAddCategory(trimmed);
        onFilterChange(trimmed);
        setNewName('');
        setCreating(false);
    };

    const chipBase =
        'shrink-0 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold transition-all border whitespace-nowrap';

    const repoChipBase =
        'shrink-0 inline-flex items-center justify-center min-h-[36px] px-2.5 rounded-xl text-[10px] font-bold border transition-colors whitespace-nowrap';
    const repoChipIdle =
        'border-white/10 bg-white/[0.04] text-white/55 hover:border-[#E6C673]/25 hover:text-white/75';
    const repoChipActive =
        'border-[#E6C673]/40 bg-[#E6C673]/16 text-[#E6C673]';

    const actionChips = [
        { label: 'الكل', value: 'الكل' },
        { label: 'بطاقة', value: REPOSITORY_ACTION_CATEGORY.note },
        { label: 'مسح', value: REPOSITORY_ACTION_CATEGORY.scan },
        { label: 'صورة', value: REPOSITORY_ACTION_CATEGORY.image },
        { label: 'PDF', value: REPOSITORY_ACTION_CATEGORY.pdf },
        { label: 'تسجيل', value: REPOSITORY_ACTION_CATEGORY.voice },
    ];

    const isFilterActive = (value: string) => {
        if (value === 'الكل') return !activeFilter || activeFilter === 'الكل';
        if (activeFilter === value) return true;
        return categoryMatchesName(activeFilter, value);
    };

    const hasActiveFilters = Boolean(activeFilter && activeFilter !== 'الكل');

    const activeFilterSummary = useMemo(() => {
        if (!hasActiveFilters) return null;
        const preset = actionChips.find((chip) => isFilterActive(chip.value));
        return preset?.label ?? activeFilter;
    }, [activeFilter, hasActiveFilters, docs.length]);

    const closeFilters = useCallback(() => {
        setFiltersExpanded(false);
        setCreating(false);
        setNewName('');
    }, []);

    const updateFilterMenuPos = useCallback(() => {
        if (!filterToggleRef.current) return;
        setFilterMenuPos(computeFilterPopoverPos(filterToggleRef.current));
    }, []);

    const toggleFilters = useCallback(() => {
        setFiltersExpanded((open) => {
            if (open) {
                setCreating(false);
                setNewName('');
            }
            return !open;
        });
    }, []);

    useLayoutEffect(() => {
        if (!searchOnly || externalClassification || !filterPanelMounted) return;
        updateFilterMenuPos();
    }, [externalClassification, filterPanelMounted, searchOnly, updateFilterMenuPos]);

    useEffect(() => {
        if (!searchOnly || externalClassification || !filterPopoverOpen) return;

        const onPointer = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node;
            if (filterToggleRef.current?.contains(target)) return;
            if (filterMenuRef.current?.contains(target)) return;
            closeFilters();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !creating) closeFilters();
        };
        const onLayout = () => updateFilterMenuPos();

        document.addEventListener('mousedown', onPointer);
        document.addEventListener('touchstart', onPointer);
        window.addEventListener('keydown', onKey);
        window.addEventListener('resize', onLayout);
        window.addEventListener('scroll', onLayout, true);
        return () => {
            document.removeEventListener('mousedown', onPointer);
            document.removeEventListener('touchstart', onPointer);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', onLayout);
            window.removeEventListener('scroll', onLayout, true);
        };
    }, [closeFilters, creating, externalClassification, filterPopoverOpen, searchOnly, updateFilterMenuPos]);

    const selectFilter = useCallback(
        (value: string) => {
            onFilterChange(value);
            if (value !== 'الكل') setFiltersExpanded(false);
        },
        [onFilterChange],
    );

    const countCategoryItems = useCallback(
        (category: string) => {
            if (category === 'الكل') return undefined;
            if (notes.length > 0) return countRepositoryCategoryItems(docs, notes, category);
            return countDocsInCategory(docs, category);
        },
        [docs, notes],
    );

    const repositoryDeckRowClass = (active: boolean) =>
        `hami-repository-filter-deck__row min-h-[44px] touch-manipulation ${
            active ? 'hami-repository-filter-deck__row--active' : ''
        }`;

    const repositoryFilterDeck = creating ? (
        <div className="hami-repository-filter-deck" data-testid="repository-filter-deck">
            <div className="flex items-center gap-1.5 px-1 pb-1 shrink-0">
                <input
                    type="text"
                    data-testid="smart-vault-new-category"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') submitCategory();
                        if (e.key === 'Escape') {
                            setCreating(false);
                            setNewName('');
                        }
                    }}
                    placeholder="اسم التصنيف..."
                    autoFocus
                    className="flex-1 min-w-0 min-h-[44px] rounded-xl border border-white/12 bg-[#0A0F1C]/55 px-2.5 text-xs text-[#F4F0E8] outline-none"
                />
                <button
                    type="button"
                    onClick={submitCategory}
                    disabled={!newName.trim()}
                    data-testid="smart-vault-new-category-save"
                    aria-label="حفظ التصنيف"
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-[#E6C673]/80 bg-[#E6C673]/90 text-[#0A0F1C] disabled:opacity-40"
                >
                    <Check size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setCreating(false);
                        setNewName('');
                    }}
                    aria-label="إلغاء"
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-white/10 text-white/50"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    ) : (
        <div className="hami-repository-filter-deck" data-testid="repository-filter-deck">
            <p className="hami-repository-filter-deck__heading">نوع المحتوى</p>
            <ul className="hami-repository-filter-deck__list" role="listbox" aria-label="نوع المحتوى">
                {actionChips.map((chip) => {
                    const active = isFilterActive(chip.value);
                    const count = countCategoryItems(chip.value);
                    return (
                        <li key={chip.value}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={active}
                                data-testid={
                                    chip.value === 'الكل'
                                        ? 'repository-filter-all'
                                        : `smart-vault-filter-${chip.value}`
                                }
                                onClick={() => selectFilter(chip.value)}
                                className={repositoryDeckRowClass(active)}
                            >
                                <span className="hami-repository-filter-deck__label">{chip.label}</span>
                                {typeof count === 'number' && count > 0 ? (
                                    <span className="hami-repository-filter-deck__count tabular-nums">
                                        {count}
                                    </span>
                                ) : null}
                            </button>
                        </li>
                    );
                })}
            </ul>

            {visibleCategories.length > 0 ? (
                <>
                    <p className="hami-repository-filter-deck__heading">تصنيفات مخصصة</p>
                    <ul className="hami-repository-filter-deck__list" role="listbox" aria-label="تصنيفات مخصصة">
                        {visibleCategories.map((category) => {
                            const count = countCategoryItems(category);
                            const isActive = activeFilter === category;
                            return (
                                <li key={category}>
                                    <div
                                        className={`${repositoryDeckRowClass(isActive)} !justify-between gap-1 !px-1`}
                                    >
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={isActive}
                                            onClick={() => selectFilter(isActive ? 'الكل' : category)}
                                            data-testid={`smart-vault-filter-${category}`}
                                            title={category}
                                            className="min-w-0 flex-1 truncate text-right px-2 min-h-[44px] inline-flex items-center justify-between gap-2"
                                        >
                                            <span className="truncate">{category}</span>
                                            {typeof count === 'number' && count > 0 ? (
                                                <span className="hami-repository-filter-deck__count tabular-nums shrink-0">
                                                    {count}
                                                </span>
                                            ) : null}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveCategory(category);
                                            }}
                                            aria-label={`حذف تصنيف ${category}`}
                                            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg hover:bg-rose-500/20 opacity-70 hover:opacity-100 shrink-0"
                                        >
                                            <X size={14} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </>
            ) : null}

            <button
                type="button"
                onClick={() => setCreating(true)}
                data-testid="smart-vault-add-category"
                aria-label="تصنيف مخصص"
                title="تصنيف مخصص"
                className={`${repositoryDeckRowClass(false)} hami-repository-filter-deck__row--add`}
            >
                <Plus size={16} aria-hidden className="shrink-0 opacity-80" />
                <span className="hami-repository-filter-deck__label">تصنيف مخصص</span>
            </button>
        </div>
    );

    const classificationChips = (
        <>
            {creating ? (
                <div className="flex items-center gap-1.5 px-3 pb-2.5 shrink-0">
                    <input
                        type="text"
                        data-testid="smart-vault-new-category"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') submitCategory();
                            if (e.key === 'Escape') {
                                setCreating(false);
                                setNewName('');
                            }
                        }}
                        placeholder="تصنيف..."
                        autoFocus
                        className="flex-1 min-w-0 min-h-[36px] rounded-xl border border-white/12 bg-[#0A0F1C]/55 px-2.5 text-xs text-[#F4F0E8] outline-none"
                    />
                    <button
                        type="button"
                        onClick={submitCategory}
                        disabled={!newName.trim()}
                        data-testid="smart-vault-new-category-save"
                        title="حفظ"
                        className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] rounded-xl border border-[#E6C673]/80 bg-[#E6C673]/90 text-[#0A0F1C] disabled:opacity-40"
                    >
                        <Check size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setCreating(false);
                            setNewName('');
                        }}
                        title="إلغاء"
                        className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] rounded-xl border border-white/10 text-white/50"
                    >
                        <X size={13} />
                    </button>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-1.5 px-1 pb-1 shrink-0">
                    {actionChips.map((chip) => {
                        const active = isFilterActive(chip.value);
                        const count =
                            chip.value === 'الكل'
                                ? docs.length
                                : countDocsInCategory(docs, chip.value);
                        return (
                            <button
                                key={chip.value}
                                type="button"
                                data-testid={
                                    chip.value === 'الكل'
                                        ? 'repository-filter-all'
                                        : `smart-vault-filter-${chip.value}`
                                }
                                onClick={() => selectFilter(chip.value)}
                                className={`${repoChipBase} ${active ? repoChipActive : repoChipIdle}`}
                            >
                                <span>{chip.label}</span>
                                {typeof count === 'number' && count > 0 ? (
                                    <span className="mr-1 opacity-70 tabular-nums text-[9px]">
                                        {count}
                                    </span>
                                ) : null}
                            </button>
                        );
                    })}

                    {visibleCategories.map((category) => {
                        const count = countDocsInCategory(docs, category);
                        const isActive = activeFilter === category;
                        return (
                            <div
                                key={category}
                                className={`${repoChipBase} gap-0.5 !px-1 max-w-[8rem] ${
                                    isActive ? repoChipActive : repoChipIdle
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => selectFilter(isActive ? 'الكل' : category)}
                                    data-testid={`smart-vault-filter-${category}`}
                                    title={category}
                                    className="min-w-0 flex-1 truncate text-right px-1.5 min-h-[34px] inline-flex items-center"
                                >
                                    <span className="truncate">{category}</span>
                                    {count > 0 ? (
                                        <span className="mr-1 opacity-70 tabular-nums text-[9px]">
                                            ({count})
                                        </span>
                                    ) : null}
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveCategory(category);
                                    }}
                                    aria-label={`حذف تصنيف ${category}`}
                                    className="inline-flex items-center justify-center min-w-[28px] min-h-[28px] rounded-lg hover:bg-rose-500/20 opacity-70 hover:opacity-100"
                                >
                                    <X size={11} strokeWidth={2.5} />
                                </button>
                            </div>
                        );
                    })}

                    <button
                        type="button"
                        onClick={() => setCreating(true)}
                        data-testid="smart-vault-add-category"
                        aria-label="تصنيف مخصص"
                        title="تصنيف مخصص"
                        className={`${repoChipBase} ${repoChipIdle}`}
                    >
                        <Plus size={14} aria-hidden />
                        <span>تصنيف</span>
                    </button>
                </div>
            )}
        </>
    );

    const searchRowMinH = searchOnly ? 'min-h-[44px]' : 'min-h-[40px]';
    const clearSearchBtnClass = searchOnly
        ? 'shrink-0 inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-xl hover:bg-white/[0.06] text-white/42 hover:text-white/70 touch-manipulation transition-colors'
        : 'shrink-0 p-1 rounded-md hover:bg-[#0E1B2E]/40 text-[#C9BCA8]/60';

    const searchRow = searchOnly ? (
        <div
            className="hami-repository-search-deck__row flex h-11 w-full items-stretch overflow-hidden rounded-xl border border-white/10 bg-[#0B1021]/70 transition-colors focus-within:ring-1 focus-within:ring-[#E6C673]/25"
        >
            <div className="flex min-w-0 flex-1 items-center gap-1 px-2.5 sm:gap-1.5 sm:px-3">
                {!externalClassification ? (
                    <button
                        ref={filterToggleRef}
                        type="button"
                        data-testid="repository-classification-toggle"
                        aria-label={filterPopoverOpen ? 'إخفاء التصنيفات' : 'إظهار التصنيفات'}
                        aria-expanded={filterPopoverOpen}
                        aria-controls={filtersPanelId}
                        title="تصنيفات المستودع"
                        onClick={toggleFilters}
                        className={`inline-flex h-9 min-w-[2.25rem] shrink-0 items-center justify-center rounded-lg px-2 transition-colors touch-manipulation ${
                            filterPopoverOpen || hasActiveFilters
                                ? 'border border-[#E6C673]/35 bg-[#E6C673]/14 text-[#E6C673]'
                                : 'text-white/55 hover:bg-white/[0.06] hover:text-white/80'
                        }`}
                    >
                        <ListFilter size={16} strokeWidth={2.25} aria-hidden />
                    </button>
                ) : null}
                <Search size={15} className="text-white/32 shrink-0" aria-hidden />
                <input
                    ref={searchInputRef}
                    type="search"
                    data-testid="smart-vault-search"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={onSearchKeyDown}
                    placeholder="بحث في المستودع..."
                    aria-controls={externalClassification ? undefined : filtersPanelId}
                    aria-expanded={externalClassification ? undefined : filterPopoverOpen}
                    className="flex-1 min-w-0 bg-transparent text-sm text-[#F4F0E8] placeholder:text-white/28 outline-none border-none"
                />
                {searchQuery.trim() ? (
                    <button
                        type="button"
                        onClick={() => onSearchChange('')}
                        title="مسح البحث"
                        className={clearSearchBtnClass}
                    >
                        <X size={13} />
                    </button>
                ) : null}
            </div>
        </div>
    ) : (
        <div className={`flex items-center gap-2 px-2.5 py-2 ${searchRowMinH}`}>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <Search size={15} className="text-[#B87333]/65 shrink-0" aria-hidden />
                <input
                    ref={searchInputRef}
                    type="search"
                    data-testid="smart-vault-search"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={onSearchKeyDown}
                    placeholder="بحث..."
                    className="flex-1 min-w-0 bg-transparent text-sm text-[#E8E4DC] placeholder:text-[#C9BCA8]/38 outline-none border-none"
                />
                {!liveSearch && isSearching ? (
                    <Loader2 size={13} className="text-[#B87333] animate-spin shrink-0" />
                ) : !liveSearch && searchQuery.trim() ? (
                    <button
                        type="button"
                        onClick={onAISearch}
                        title="بحث ذكي"
                        className="shrink-0 p-1 rounded-md bg-[#0E1B2E]/45 border border-[#B87333]/28 text-[#C4926A] hover:bg-[#0E1B2E]/65"
                    >
                        <Sparkles size={12} />
                    </button>
                ) : null}
            </div>
        </div>
    );

    if (searchOnly) {
        return (
            <div
                className="hami-repository-search-deck"
                dir="rtl"
                data-testid="repository-search-deck"
            >
                {searchRow}

                {!externalClassification && !filterPopoverOpen && hasActiveFilters && activeFilterSummary ? (
                    <button
                        type="button"
                        onClick={() => setFiltersExpanded(true)}
                        className="mt-2 flex w-full flex-wrap items-center gap-1.5 text-right"
                        data-testid="repository-active-filter-summary"
                    >
                        <span className="text-[10px] font-bold text-white/40">مفعّل:</span>
                        <span className="rounded-full border border-[#E6C673]/35 bg-[#E6C673]/12 px-2 py-0.5 text-[10px] font-bold text-[#E6C673]">
                            {activeFilterSummary}
                        </span>
                    </button>
                ) : null}

                {!externalClassification && filterPanelMounted && typeof document !== 'undefined'
                    ? createPortal(
                          <div
                              ref={filterMenuRef}
                              id={filtersPanelId}
                              role="dialog"
                              aria-modal="false"
                              aria-label="تصنيفات المستودع"
                              data-testid="repository-classification-panel"
                              className={`hami-repository-filter-popover fixed ${REPO_PORTAL_Z} ${
                                  filterPanelVisible
                                      ? 'hami-repository-filter-popover--visible'
                                      : 'hami-repository-filter-popover--hidden'
                              }`}
                              style={{
                                  top: filterMenuPos.top,
                                  left: filterMenuPos.left,
                                  width: filterMenuPos.width,
                                  maxHeight: filterMenuPos.maxHeight,
                              }}
                              dir="rtl"
                          >
                              {repositoryFilterDeck}
                          </div>,
                          document.body,
                      )
                    : null}
            </div>
        );
    }

    return (
        <div className={`${VAULT_TRAVERTINE_HUB} flex flex-col gap-2`} dir="rtl">
            {searchRow}

            {creating ? (
                <div className="flex items-center gap-1 px-2.5 pb-2 shrink-0">
                    <input
                        type="text"
                        data-testid="smart-vault-new-category"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') submitCategory();
                            if (e.key === 'Escape') {
                                setCreating(false);
                                setNewName('');
                            }
                        }}
                        placeholder="تصنيف..."
                        autoFocus
                        className={`${VAULT_INPUT} !py-1 !px-2 text-[10px] min-w-[5rem] max-w-[7rem]`}
                    />
                    <button
                        type="button"
                        onClick={submitCategory}
                        disabled={!newName.trim()}
                        data-testid="smart-vault-new-category-save"
                        title="حفظ"
                        className="p-1 rounded-md bg-[#B87333]/25 border border-[#B87333]/40 text-[#E8E4DC] disabled:opacity-40"
                    >
                        <Check size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setCreating(false);
                            setNewName('');
                        }}
                        title="إلغاء"
                        className="p-1 rounded-md hover:bg-[#0E1B2E]/40 text-[#C9BCA8]/60"
                    >
                        <X size={13} />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-1.5 px-2.5 pb-2 shrink-0 overflow-x-auto custom-scrollbar">
                    <button
                        type="button"
                        onClick={() => onFilterChange('الكل')}
                        data-testid="smart-vault-filter-all"
                        className={`${chipBase} ${activeFilter === 'الكل' ? VAULT_CHIP_ACTIVE : VAULT_CHIP_IDLE}`}
                    >
                        <span>الكل</span>
                        <span className="mr-1 opacity-50 tabular-nums">{docs.length}</span>
                    </button>

                    {visibleCategories.map((category) => {
                        const count = countDocsInCategory(docs, category);
                        const isActive = activeFilter === category;
                        return (
                            <div
                                key={category}
                                className={`${chipBase} max-w-[7rem] flex items-center gap-0.5 pr-0.5 ${
                                    isActive ? VAULT_CHIP_ACTIVE : VAULT_CHIP_IDLE
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => onFilterChange(category)}
                                    data-testid={`smart-vault-filter-${category}`}
                                    title={category}
                                    className="min-w-0 flex-1 truncate text-right"
                                >
                                    <span className="truncate">{category}</span>
                                    <span className="mr-1 opacity-50 tabular-nums">{count}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveCategory(category);
                                    }}
                                    title={`حذف تصنيف «${category}»`}
                                    aria-label={`حذف تصنيف ${category}`}
                                    className="shrink-0 p-0.5 rounded hover:bg-rose-500/25 text-[#C9BCA8]/70 hover:text-rose-300 transition-colors"
                                >
                                    <X size={10} strokeWidth={2.5} />
                                </button>
                            </div>
                        );
                    })}

                    <button
                        type="button"
                        onClick={() => setCreating(true)}
                        data-testid="smart-vault-add-category"
                        title="تصنيف مخصص"
                        className="shrink-0 p-1 rounded-md border border-dashed border-[#B87333]/35 text-[#C4926A]/85 hover:bg-[#B87333]/8"
                    >
                        <Plus size={12} />
                    </button>
                </div>
            )}
        </div>
    );
};
