import React from 'react';
import { HomeRotateCcwIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';

export interface RecentSearchesPanelProps {
    recentSearches: string[];
    onSelect: (value: string) => void;
    onClear: () => void;
}

export function RecentSearchesPanel({ recentSearches, onSelect, onClear }: RecentSearchesPanelProps) {
    if (recentSearches.length === 0) return null;

    return (
        <div className="px-3.5 py-2.5 space-y-2" data-testid="global-search-recent-panel">
            <div className="flex justify-between items-center">
                <h3 className="text-[11px] font-semibold text-white/40">الأخيرة</h3>
                <button
                    type="button"
                    onClick={onClear}
                    className="text-[10px] text-white/35 active:text-white/70 flex items-center gap-1 min-h-[44px] min-w-[44px] px-2 touch-manipulation"
                    aria-label="مسح عمليات البحث الأخيرة"
                    data-testid="global-search-clear-recent"
                >
                    <HomeRotateCcwIcon size={10} aria-hidden />
                    مسح
                </button>
            </div>
            <div className="hami-gs-recent-rail" role="list" aria-label="عمليات البحث الأخيرة">
                {recentSearches.map((s) => (
                    <button
                        key={s}
                        type="button"
                        role="listitem"
                        onClick={() => onSelect(s)}
                        className="hami-gs-recent-chip"
                        data-testid={`global-search-recent-${s}`}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
}
