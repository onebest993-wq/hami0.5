import React, { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import {
    countDocsInCategory,
    getVisibleVaultCustomCategories,
} from '@/app/services/vaultCustomCategories';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { REPO_CUSTOM_CAT_ADD, REPO_CUSTOM_CAT_CHIP, REPO_CUSTOM_CAT_CHIP_ACTIVE, REPO_CUSTOM_CAT_ROW, REPO_INPUT, REPO_TOUCH_ICON } from './smartRepositoryTheme';

type RepositoryCustomCategoryRowProps = {
    activeFilter: string;
    customCategories: string[];
    docs: SmartVaultDoc[];
    onFilterChange: (filter: string) => void;
    onAddCategory: (name: string) => void;
    onRemoveCategory: (name: string) => void;
};

export function RepositoryCustomCategoryRow({
    activeFilter,
    customCategories,
    docs,
    onFilterChange,
    onAddCategory,
    onRemoveCategory,
}: RepositoryCustomCategoryRowProps) {
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const visibleCategories = getVisibleVaultCustomCategories(customCategories);

    const submitCategory = () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        onAddCategory(trimmed);
        onFilterChange(trimmed);
        setNewName('');
        setCreating(false);
    };

    if (visibleCategories.length === 0 && !creating) {
        return (
            <div className={REPO_CUSTOM_CAT_ROW}>
                <button
                    type="button"
                    onClick={() => setCreating(true)}
                    data-testid="smart-vault-add-category"
                    className={REPO_CUSTOM_CAT_ADD}
                >
                    <Plus size={14} />
                    <span>تصنيف مخصص</span>
                </button>
            </div>
        );
    }

    return (
        <div className={REPO_CUSTOM_CAT_ROW} dir="rtl">
            {creating ? (
                <div className="flex items-center gap-2 w-full">
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
                        className={`${REPO_INPUT} !py-2 !px-3 text-xs flex-1 min-w-0`}
                    />
                    <button
                        type="button"
                        onClick={submitCategory}
                        disabled={!newName.trim()}
                        data-testid="smart-vault-new-category-save"
                        className={`${REPO_TOUCH_ICON} rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/12 text-[#E6C673] disabled:opacity-40`}
                    >
                        <Check size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setCreating(false);
                            setNewName('');
                        }}
                        className={`${REPO_TOUCH_ICON} rounded-xl border border-white/10 text-white/50`}
                    >
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none w-full">
                    {visibleCategories.map((category) => {
                        const count = countDocsInCategory(docs, category);
                        const isActive = activeFilter === category;
                        return (
                            <div
                                key={category}
                                className={`${isActive ? REPO_CUSTOM_CAT_CHIP_ACTIVE : REPO_CUSTOM_CAT_CHIP} flex items-center gap-1 pr-1 max-w-[9rem]`}
                            >
                                <button
                                    type="button"
                                    onClick={() => onFilterChange(isActive ? 'الكل' : category)}
                                    data-testid={`smart-vault-filter-${category}`}
                                    title={category}
                                    className="min-w-0 flex-1 truncate text-right px-2 min-h-[44px] inline-flex items-center"
                                >
                                    <span className="truncate">{category}</span>
                                    {count > 0 ? (
                                        <span className="mr-1 opacity-60 tabular-nums text-[10px]">({count})</span>
                                    ) : null}
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveCategory(category);
                                    }}
                                    aria-label={`حذف تصنيف ${category}`}
                                    className={`${REPO_TOUCH_ICON} rounded-lg hover:bg-rose-500/20 text-white/45 hover:text-rose-300`}
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
                        className={REPO_CUSTOM_CAT_ADD}
                    >
                        <Plus size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
