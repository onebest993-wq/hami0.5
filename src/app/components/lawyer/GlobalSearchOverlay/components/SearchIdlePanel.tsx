import React from 'react';
import { RecentSearchesPanel } from '@/app/components/lawyer/GlobalSearchOverlay/components/RecentSearchesPanel';

export interface SearchIdlePanelProps {
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
                    اكتب للبحث في الملفات والمواعيد والملاحظات
                </p>
            )}
        </div>
    );
}
