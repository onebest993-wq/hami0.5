import React from 'react';
import { Check } from '@/app/components/ui/icons/Check';
import { Plus } from '@/app/components/ui/icons/Plus';
import { X } from '@/app/components/ui/icons/X';
import { REPOSITORY_ACTION_CATEGORY } from '@/app/services/vaultCustomCategories';

export const REPOSITORY_ACTION_CHIPS: ReadonlyArray<{ label: string; value: string }> = [
    { label: 'الكل', value: 'الكل' },
    { label: 'بطاقة', value: REPOSITORY_ACTION_CATEGORY.note },
    { label: 'مسح', value: REPOSITORY_ACTION_CATEGORY.scan },
    { label: 'صورة', value: REPOSITORY_ACTION_CATEGORY.image },
    { label: 'PDF', value: REPOSITORY_ACTION_CATEGORY.pdf },
    { label: 'تسجيل', value: REPOSITORY_ACTION_CATEGORY.voice },
];

function deckRowClass(active: boolean): string {
    return `hami-repository-filter-deck__row min-h-[44px] touch-manipulation ${
        active ? 'hami-repository-filter-deck__row--active' : ''
    }`;
}

type RepositoryClassificationDeckProps = {
    creating: boolean;
    newName: string;
    onNewNameChange: (value: string) => void;
    onSubmitCategory: () => void;
    onCancelCreate: () => void;
    onStartCreate: () => void;
    actionActive: (value: string) => boolean;
    countFor: (value: string) => number | undefined;
    onSelectFilter: (value: string) => void;
    customCategories: string[];
    activeFilter: string;
    onRemoveCategory: (name: string) => void;
};

export function RepositoryClassificationDeck({
    creating,
    newName,
    onNewNameChange,
    onSubmitCategory,
    onCancelCreate,
    onStartCreate,
    actionActive,
    countFor,
    onSelectFilter,
    customCategories,
    activeFilter,
    onRemoveCategory,
}: RepositoryClassificationDeckProps) {
    if (creating) {
        return (
            <div className="hami-repository-filter-deck" data-testid="repository-filter-deck">
                <div className="flex items-center gap-1.5 px-1 pb-1 shrink-0">
                    <input
                        type="text"
                        data-testid="smart-vault-new-category"
                        value={newName}
                        onChange={(e) => onNewNameChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSubmitCategory();
                            if (e.key === 'Escape') onCancelCreate();
                        }}
                        placeholder="اسم التصنيف..."
                        autoFocus
                        className="flex-1 min-w-0 min-h-[44px] rounded-xl border border-white/12 bg-[#0A0F1C]/55 px-2.5 text-base text-[#F4F0E8] outline-none"
                    />
                    <button
                        type="button"
                        onClick={onSubmitCategory}
                        disabled={!newName.trim()}
                        data-testid="smart-vault-new-category-save"
                        aria-label="حفظ التصنيف"
                        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-[#E6C673]/80 bg-[#E6C673]/90 text-[#0A0F1C] disabled:opacity-40"
                    >
                        <Check size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={onCancelCreate}
                        aria-label="إلغاء"
                        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-white/10 text-white/50"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="hami-repository-filter-deck" data-testid="repository-filter-deck">
            <p className="hami-repository-filter-deck__heading">نوع المحتوى</p>
            <ul className="hami-repository-filter-deck__list" role="listbox" aria-label="نوع المحتوى">
                {REPOSITORY_ACTION_CHIPS.map((chip) => {
                    const active = actionActive(chip.value);
                    const count = countFor(chip.value);
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
                                onClick={() => onSelectFilter(chip.value)}
                                className={deckRowClass(active)}
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

            {customCategories.length > 0 ? (
                <>
                    <p className="hami-repository-filter-deck__heading">تصنيفات مخصصة</p>
                    <ul
                        className="hami-repository-filter-deck__list"
                        role="listbox"
                        aria-label="تصنيفات مخصصة"
                    >
                        {customCategories.map((category) => {
                            const count = countFor(category);
                            const isActive = activeFilter === category;
                            return (
                                <li key={category}>
                                    <div
                                        className={`${deckRowClass(isActive)} !justify-between gap-1 !px-1`}
                                    >
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={isActive}
                                            onClick={() => onSelectFilter(isActive ? 'الكل' : category)}
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
                onClick={onStartCreate}
                data-testid="smart-vault-add-category"
                aria-label="تصنيف مخصص"
                title="تصنيف مخصص"
                className={`${deckRowClass(false)} hami-repository-filter-deck__row--add`}
            >
                <Plus size={16} aria-hidden className="shrink-0 opacity-80" />
                <span className="hami-repository-filter-deck__label">تصنيف مخصص</span>
            </button>
        </div>
    );
}
