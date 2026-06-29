import React from 'react';
import { RecentSearchesPanel } from '@/app/components/lawyer/GlobalSearchOverlay/components/RecentSearchesPanel';

export interface SearchIdlePanelProps {
    recentSearches: string[];
    onSelect: (value: string) => void;
    onClear: () => void;
}

export function SearchIdlePanel({ recentSearches, onSelect, onClear }: SearchIdlePanelProps) {
    return (
        <div data-testid="global-search-idle">
            <RecentSearchesPanel
                recentSearches={recentSearches}
                onSelect={onSelect}
                onClear={onClear}
            />
        </div>
    );
}
