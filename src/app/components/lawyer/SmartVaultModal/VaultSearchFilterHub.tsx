import React, { useState } from 'react';
import { Plus, Search, Sparkles, Loader2, X, Check } from 'lucide-react';
import { countDocsInCategory } from '@/app/services/vaultCustomCategories';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';
import { VAULT_TRAVERTINE_HUB, VAULT_CHIP_ACTIVE, VAULT_CHIP_IDLE, VAULT_INPUT } from './vaultDustyRoseTheme';

export type VaultSearchFilterHubProps = {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    isSearching: boolean;
    onAISearch: () => void;
    /** بحث فوري — بدون زر ذكاء أو مؤشر تحميل */
    liveSearch?: boolean;
    /** بحث فقط — بدون شريط التصنيفات (المستودع الموحّد) */
    searchOnly?: boolean;
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    customCategories: string[];
    onAddCategory: (name: string) => void;
    onRemoveCategory: (name: string) => void;
    docs: SmartVaultDoc[];
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
    activeFilter,
    onFilterChange,
    customCategories,
    onAddCategory,
    onRemoveCategory,
    docs,
}) => {
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');

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

    const searchRowMinH = searchOnly ? 'min-h-[44px]' : 'min-h-[40px]';
    const clearSearchBtnClass = searchOnly
        ? 'shrink-0 inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md hover:bg-[#0E1B2E]/40 text-[#C9BCA8]/60 touch-manipulation'
        : 'shrink-0 p-1 rounded-md hover:bg-[#0E1B2E]/40 text-[#C9BCA8]/60';

    const searchRow = (
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
                    placeholder={liveSearch || searchOnly ? 'بحث في المستودع...' : 'بحث...'}
                    className="flex-1 min-w-0 bg-transparent text-[#E8E4DC] text-sm placeholder:text-[#C9BCA8]/38 outline-none border-none"
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
                ) : (liveSearch || searchOnly) && searchQuery.trim() ? (
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
    );

    if (searchOnly) {
        return (
            <div className={VAULT_TRAVERTINE_HUB} dir="rtl">
                {searchRow}
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

                    {customCategories.map((category) => {
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
