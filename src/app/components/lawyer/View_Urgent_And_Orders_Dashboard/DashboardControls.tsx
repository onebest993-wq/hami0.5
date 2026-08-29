import React from 'react';
import { LayoutGrid } from '@/app/components/ui/icons/LayoutGrid';
import { List } from '@/app/components/ui/icons/List';
import { Search } from '@/app/components/ui/icons/Search';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import type { ViewMode } from './types';

type UrgentScope = 'active' | 'archive' | 'trash';

interface DashboardControlsProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    scope: UrgentScope;
    onScopeChange: (scope: UrgentScope) => void;
    archivedCount?: number;
    trashedCount?: number;
}

/**
 * شريط واحد: [نشطة|أرشيف] بحث [عرض]
 */
export const DashboardControls = ({
    searchQuery,
    onSearchChange,
    viewMode,
    onViewModeChange,
    scope,
    onScopeChange,
    archivedCount = 0,
    trashedCount = 0,
}: DashboardControlsProps) => {
    const isArchive = scope === 'archive';
    const isActive = scope === 'active';

    return (
        <div dir="rtl" className="w-full">
            <div
                className="flex h-11 w-full items-stretch overflow-hidden rounded-lg border border-white/10 bg-transparent"
                role="search"
            >
                <div
                    className="flex shrink-0 items-center gap-0.5 border-l border-white/10 p-1"
                    role="tablist"
                    aria-label="نطاق العرض"
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onScopeChange('active')}
                        className={`h-full min-w-[3.25rem] rounded-lg px-2.5 text-[11px] font-bold touch-manipulation ${
                            isActive ? 'bg-white/[0.12] text-white' : 'text-white/45 hover:bg-white/[0.06] hover:text-white/75'
                        }`}
                    >
                        نشطة
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={isArchive}
                        onClick={() => onScopeChange('archive')}
                        className={`inline-flex h-full min-w-[3.25rem] items-center justify-center gap-1 rounded-lg px-2.5 text-[11px] font-bold touch-manipulation ${
                            isArchive ? 'bg-white/[0.12] text-white' : 'text-white/45 hover:bg-white/[0.06] hover:text-white/75'
                        }`}
                    >
                        أرشيف
                        {archivedCount > 0 ? (
                            <span
                                className={`min-w-[1rem] rounded-full px-1 text-[9px] font-bold leading-4 tabular-nums ${
                                    isArchive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/45'
                                }`}
                            >
                                {archivedCount > 9 ? '9+' : archivedCount}
                            </span>
                        ) : null}
                    </button>
                </div>

                <label className="relative flex min-w-0 flex-1 items-center">
                    <span className="sr-only">بحث في الطلبات المستعجلة</span>
                    <Search
                        className="pointer-events-none absolute right-2.5 text-white/35"
                        size={14}
                        aria-hidden
                    />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="بحث…"
                        className="h-full w-full bg-transparent pr-8 pl-2 text-sm text-white placeholder:text-white/35 outline-none"
                    />
                </label>

                <div
                    className="flex shrink-0 items-center gap-0.5 border-r border-white/8 px-1"
                    role="group"
                    aria-label="نمط العرض"
                >
                    <button
                        type="button"
                        title="عرض شبكي"
                        aria-pressed={viewMode === 'grid'}
                        onClick={() => onViewModeChange('grid')}
                        className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg touch-manipulation ${
                            viewMode === 'grid' ? 'bg-white/[0.12] text-white' : 'text-white/40 hover:bg-white/[0.06] hover:text-white'
                        }`}
                    >
                        <LayoutGrid size={15} />
                    </button>
                    <button
                        type="button"
                        title="عرض قائمة"
                        aria-pressed={viewMode === 'list'}
                        onClick={() => onViewModeChange('list')}
                        className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg touch-manipulation ${
                            viewMode === 'list' ? 'bg-white/[0.12] text-white' : 'text-white/40 hover:bg-white/[0.06] hover:text-white'
                        }`}
                    >
                        <List size={15} />
                    </button>
                </div>

                {trashedCount > 0 || scope === 'trash' ? (
                    <button
                        type="button"
                        title="سلة المهملات"
                        aria-pressed={scope === 'trash'}
                        aria-label={`سلة المهملات${trashedCount > 0 ? ` (${trashedCount})` : ''}`}
                        onClick={() => onScopeChange(scope === 'trash' ? 'active' : 'trash')}
                        className={`flex shrink-0 min-h-[44px] min-w-[44px] items-center justify-center gap-1 border-r border-white/8 px-2 touch-manipulation ${
                            scope === 'trash'
                                ? 'bg-rose-950/40 text-rose-200'
                                : 'text-white/40 hover:bg-white/[0.06] hover:text-rose-200'
                        }`}
                    >
                        <Trash2 size={15} aria-hidden />
                        {trashedCount > 0 ? (
                            <span className="text-[10px] font-bold tabular-nums">
                                {trashedCount > 9 ? '9+' : trashedCount}
                            </span>
                        ) : null}
                    </button>
                ) : null}
            </div>
        </div>
    );
};
