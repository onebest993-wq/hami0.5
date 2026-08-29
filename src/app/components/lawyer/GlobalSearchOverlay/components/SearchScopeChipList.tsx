import React from 'react';
import {
    SEARCH_SCOPE_CHIPS,
    type GlobalSearchScopeId,
} from '@/app/components/lawyer/GlobalSearchOverlay/searchScopes';

export type SearchScopeChipListProps = {
    scope: GlobalSearchScopeId;
    onScopeChange: (scope: GlobalSearchScopeId) => void;
    onAfterSelect?: () => void;
};

function scopeChipClass(selected: boolean): string {
    return `hami-gs-scope-chip outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40 ${
        selected ? 'hami-gs-scope-chip--active' : 'active:text-white/75'
    }`;
}

export function SearchScopeChipList({
    scope,
    onScopeChange,
    onAfterSelect,
}: SearchScopeChipListProps) {
    return (
        <div
            className="hami-gs-scope-rail"
            role="listbox"
            aria-label="تصنيف البحث"
            data-testid="global-search-scope-menu"
        >
            {SEARCH_SCOPE_CHIPS.map((chip) => {
                const selected = scope === chip.id;
                return (
                    <button
                        key={chip.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        data-testid={`global-search-scope-${chip.id}`}
                        onClick={() => {
                            onScopeChange(chip.id);
                            onAfterSelect?.();
                        }}
                        className={scopeChipClass(selected)}
                    >
                        {chip.label}
                    </button>
                );
            })}
        </div>
    );
}
