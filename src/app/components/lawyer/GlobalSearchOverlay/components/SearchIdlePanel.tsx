import React from 'react';
import { RecentSearchesPanel } from '@/app/components/lawyer/GlobalSearchOverlay/components/RecentSearchesPanel';
import { GLOBAL_SEARCH_IDLE_HINT } from '@/app/components/lawyer/GlobalSearchOverlay/searchScopeChipLabels';

interface SearchIdlePanelProps {
    recentSearches: string[];
    onSelect: (value: string) => void;
    onClear: () => void;
}

export function SearchIdlePanel({ recentSearches, onSelect, onClear }: SearchIdlePanelProps) {
    const hasRecent = recentSearches.length > 0;

    return (
        <div data-testid="global-search-idle">
            {hasRecent ? (
                <RecentSearchesPanel
                    recentSearches={recentSearches}
                    onSelect={onSelect}
                    onClear={onClear}
                />
            ) : (
                <p className="hami-gs-idle-hint" data-testid="global-search-idle-hint">
                    {GLOBAL_SEARCH_IDLE_HINT}
                </p>
            )}
        </div>
    );
}
