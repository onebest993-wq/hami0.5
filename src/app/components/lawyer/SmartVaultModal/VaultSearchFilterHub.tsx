import React, { useCallback, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search } from '@/app/components/ui/icons/Search';
import { X } from '@/app/components/ui/icons/X';
import { ListFilter } from '@/app/components/ui/icons/ListFilter';
import {
    countDocsInCategory,
    countRepositoryCategoryItems,
    getVisibleVaultCustomCategories,
    categoryMatchesName,
} from '@/app/services/vaultCustomCategories';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { REPO_PORTAL_Z } from '@/app/components/lawyer/SmartRepository/smartRepositoryTheme';
import {
    REPOSITORY_ACTION_CHIPS,
    RepositoryClassificationDeck,
} from '@/app/components/lawyer/SmartRepository/RepositoryClassificationDeck';
import { useVaultClassificationPopover } from '@/app/components/lawyer/SmartRepository/hooks/useVaultClassificationPopover';

export type VaultSearchFilterHubProps = {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
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
    const filtersPanelId = useId();
    const visibleCategories = getVisibleVaultCustomCategories(customCategories);
    const popoverEnabled = !externalClassification;

    const dismissCreate = useCallback(() => {
        setCreating(false);
        setNewName('');
    }, []);

    const {
        filterToggleRef,
        filterMenuRef,
        filterMenuPos,
        filterPanelMounted,
        filterPanelVisible,
        filterPopoverOpen,
        toggleFilters,
        setFiltersExpanded,
    } = useVaultClassificationPopover(popoverEnabled, creating, dismissCreate);

    const submitCategory = () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        onAddCategory(trimmed);
        onFilterChange(trimmed);
        setNewName('');
        setCreating(false);
    };

    const isFilterActive = (value: string) => {
        if (value === 'الكل') return !activeFilter || activeFilter === 'الكل';
        if (activeFilter === value) return true;
        return categoryMatchesName(activeFilter, value);
    };

    const hasActiveFilters = Boolean(activeFilter && activeFilter !== 'الكل');

    const activeFilterSummary = useMemo(() => {
        if (!hasActiveFilters) return null;
        const preset = REPOSITORY_ACTION_CHIPS.find((chip) => isFilterActive(chip.value));
        return preset?.label ?? activeFilter;
    }, [activeFilter, hasActiveFilters, docs.length]);

    const selectFilter = useCallback(
        (value: string) => {
            onFilterChange(value);
            if (value !== 'الكل') setFiltersExpanded(false);
        },
        [onFilterChange, setFiltersExpanded],
    );

    const countCategoryItems = useCallback(
        (category: string) => {
            if (category === 'الكل') return undefined;
            if (notes.length > 0) return countRepositoryCategoryItems(docs, notes, category);
            return countDocsInCategory(docs, category);
        },
        [docs, notes],
    );

    return (
        <div
            className="hami-repository-search-deck"
            dir="rtl"
            data-testid="repository-search-deck"
        >
            <div className="hami-repository-search-deck__row flex h-11 w-full items-stretch overflow-hidden rounded-2xl border-0 bg-white/[0.05] transition-colors focus-within:ring-1 focus-within:ring-[#E6C673]/30">
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
                            className={`inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center rounded-xl px-2 transition-colors touch-manipulation ${
                                filterPopoverOpen || hasActiveFilters
                                    ? 'bg-[#E6C673]/14 text-[#E6C673]'
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
                        inputMode="search"
                        data-testid="smart-vault-search"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={onSearchKeyDown}
                        placeholder="بحث في المستودع..."
                        aria-controls={externalClassification ? undefined : filtersPanelId}
                        aria-expanded={externalClassification ? undefined : filterPopoverOpen}
                        className="flex-1 min-w-0 bg-transparent text-base text-[#F4F0E8] placeholder:text-white/28 outline-none border-none"
                    />
                    {searchQuery.trim() ? (
                        <button
                            type="button"
                            onClick={() => onSearchChange('')}
                            title="مسح البحث"
                            aria-label="مسح البحث"
                            className="shrink-0 inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl hover:bg-white/[0.06] text-white/42 hover:text-white/70 touch-manipulation transition-colors"
                        >
                            <X size={13} />
                        </button>
                    ) : null}
                </div>
            </div>

            {!externalClassification && !filterPopoverOpen && hasActiveFilters && activeFilterSummary ? (
                <button
                    type="button"
                    onClick={() => setFiltersExpanded(true)}
                    className="mt-2 flex w-full flex-wrap items-center gap-1.5 text-right"
                    data-testid="repository-active-filter-summary"
                >
                    <span className="text-[10px] font-bold text-white/40">مفعّل:</span>
                    <span className="rounded-full bg-[#E6C673]/12 px-2 py-0.5 text-[10px] font-medium text-[#E6C673]">
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
                          <RepositoryClassificationDeck
                              creating={creating}
                              newName={newName}
                              onNewNameChange={setNewName}
                              onSubmitCategory={submitCategory}
                              onCancelCreate={dismissCreate}
                              onStartCreate={() => setCreating(true)}
                              actionActive={isFilterActive}
                              countFor={countCategoryItems}
                              onSelectFilter={selectFilter}
                              customCategories={visibleCategories}
                              activeFilter={activeFilter}
                              onRemoveCategory={onRemoveCategory}
                          />
                      </div>,
                      document.body,
                  )
                : null}
        </div>
    );
};
