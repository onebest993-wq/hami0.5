import React, { useMemo, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import {
    countDocsInCategory,
    countRepositoryCategoryItems,
    getVisibleVaultCustomCategories,
    isRepositoryActionCategory,
    REPOSITORY_ACTION_CATEGORY,
    categoryMatchesName,
} from '@/app/services/vaultCustomCategories';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { RepositoryFeedFilter } from '@/app/services/repository/repositoryUnifiedFeed';
import {
    REPO_CUSTOM_CAT_ADD,
    REPO_CUSTOM_CAT_CHIP,
    REPO_CUSTOM_CAT_CHIP_ACTIVE,
    REPO_CUSTOM_CAT_ROW,
    REPO_FILTER_CHIP,
    REPO_FILTER_CHIP_ACTIVE,
    REPO_INPUT,
    REPO_TOUCH_ICON,
} from './smartRepositoryTheme';

/** فلاتر التصنيف = أسماء أزرار الإجراءات (بدون اختراع تسميات) */
const ACTION_FILTER_CHIPS: ReadonlyArray<{ label: string; value: string }> = [
    { label: 'الكل', value: 'الكل' },
    { label: 'بطاقة', value: REPOSITORY_ACTION_CATEGORY.note },
    { label: 'مسح', value: REPOSITORY_ACTION_CATEGORY.scan },
    { label: 'صورة', value: REPOSITORY_ACTION_CATEGORY.image },
    { label: 'PDF', value: REPOSITORY_ACTION_CATEGORY.pdf },
    { label: 'تسجيل', value: REPOSITORY_ACTION_CATEGORY.voice },
];

type RepositoryCustomCategoryRowProps = {
    activeFilter: string;
    customCategories?: string[];
    docs: SmartVaultDoc[];
    notes?: GlobalNote[];
    onFilterChange: (filter: string) => void;
    onAddCategory?: (name: string) => void;
    onRemoveCategory?: (name: string) => void;
    /** يُصفَّر إلى all عند اختيار تصنيف إجراء */
    onMainFilterChange?: (filter: RepositoryFeedFilter) => void;
};

function isChipActive(activeFilter: string, value: string): boolean {
    if (value === 'الكل') return !activeFilter || activeFilter === 'الكل';
    if (activeFilter === value) return true;
    return categoryMatchesName(activeFilter, value);
}

export function RepositoryCustomCategoryRow({
    activeFilter,
    customCategories,
    docs,
    notes = [],
    onFilterChange,
    onAddCategory,
    onRemoveCategory = () => undefined,
    onMainFilterChange,
}: RepositoryCustomCategoryRowProps) {
    const customCategoriesSafe = customCategories ?? [];
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');

    const customOnlyCategories = useMemo(() => {
        const visible = getVisibleVaultCustomCategories([
            ...customCategoriesSafe,
            ...docs.map((d) => d.customCategory?.trim() || '').filter(Boolean),
        ]);
        return visible.filter((c) => !isRepositoryActionCategory(c));
    }, [customCategoriesSafe, docs]);

    const selectFilter = (value: string) => {
        onMainFilterChange?.('all');
        onFilterChange(value);
    };

    const submitCategory = () => {
        const trimmed = newName.trim();
        if (!trimmed || !onAddCategory) return;
        onAddCategory(trimmed);
        selectFilter(trimmed);
        setNewName('');
        setCreating(false);
    };

    const cancelCreate = () => {
        setCreating(false);
        setNewName('');
    };

    return (
        <div
            className={`${REPO_CUSTOM_CAT_ROW} hami-repository-rail hami-repository-rail--filters`}
            dir="rtl"
            data-testid="repository-filter-row"
        >
            {creating ? (
                <div className="flex items-center gap-2 w-full min-w-0">
                    <input
                        type="text"
                        data-testid="smart-vault-new-category"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') submitCategory();
                            if (e.key === 'Escape') cancelCreate();
                        }}
                        placeholder="اسم التصنيف..."
                        autoFocus
                        className={`${REPO_INPUT} !py-2 !px-3 text-xs flex-1 min-w-0 !min-h-[44px]`}
                    />
                    <button
                        type="button"
                        onClick={submitCategory}
                        disabled={!newName.trim()}
                        data-testid="smart-vault-new-category-save"
                        aria-label="حفظ التصنيف"
                        className={`${REPO_TOUCH_ICON} rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/12 text-[#E6C673] disabled:opacity-40`}
                    >
                        <Check size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={cancelCreate}
                        aria-label="إلغاء"
                        className={`${REPO_TOUCH_ICON} rounded-xl border border-white/10 text-white/50`}
                    >
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-pan-x w-full min-w-0">
                    {ACTION_FILTER_CHIPS.map((chip) => {
                        const active = isChipActive(activeFilter, chip.value);
                        const count =
                            chip.value === 'الكل'
                                ? undefined
                                : countRepositoryCategoryItems(docs, notes, chip.value);
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
                                className={active ? REPO_FILTER_CHIP_ACTIVE : REPO_FILTER_CHIP}
                            >
                                <span>{chip.label}</span>
                                {typeof count === 'number' && count > 0 ? (
                                    <span className="opacity-55 tabular-nums text-[10px]">{count}</span>
                                ) : null}
                            </button>
                        );
                    })}

                    {customOnlyCategories.length > 0 ? (
                        <span className="shrink-0 w-px h-5 bg-white/10 mx-0.5" aria-hidden />
                    ) : null}

                    {customOnlyCategories.map((category) => {
                        const count = countDocsInCategory(docs, category);
                        const isActive = activeFilter === category;
                        return (
                            <div
                                key={category}
                                className={`${isActive ? REPO_CUSTOM_CAT_CHIP_ACTIVE : REPO_CUSTOM_CAT_CHIP} flex items-center gap-0.5 pr-1 max-w-[9rem]`}
                            >
                                <button
                                    type="button"
                                    onClick={() => selectFilter(isActive ? 'الكل' : category)}
                                    data-testid={`smart-vault-filter-${category}`}
                                    title={category}
                                    className="min-w-0 flex-1 truncate text-right px-2 min-h-[44px] inline-flex items-center"
                                >
                                    <span className="truncate">{category}</span>
                                    {count > 0 ? (
                                        <span className="mr-1 opacity-60 tabular-nums text-[10px]">
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
                                    className={`${REPO_TOUCH_ICON} !min-w-[36px] !min-h-[36px] rounded-lg hover:bg-rose-500/20 text-white/45 hover:text-rose-300`}
                                >
                                    <X size={11} strokeWidth={2.5} />
                                </button>
                            </div>
                        );
                    })}

                    {onAddCategory ? (
                        <button
                            type="button"
                            onClick={() => setCreating(true)}
                            data-testid="smart-vault-add-category"
                            aria-label="تصنيف مخصص"
                            title="تصنيف مخصص"
                            className={
                                customOnlyCategories.length === 0
                                    ? REPO_CUSTOM_CAT_ADD
                                    : `${REPO_TOUCH_ICON} rounded-full border border-dashed border-[#E6C673]/30 text-[#E6C673]/80 hover:bg-[#E6C673]/8 transition-colors`
                            }
                        >
                            <Plus size={14} aria-hidden />
                            {customOnlyCategories.length === 0 ? <span>تصنيف</span> : null}
                        </button>
                    ) : null}
                </div>
            )}
        </div>
    );
}
