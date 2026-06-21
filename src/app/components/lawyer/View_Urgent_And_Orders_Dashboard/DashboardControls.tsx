import React from 'react';
import { Search, Filter, Grid3x3, List } from 'lucide-react';
import type { ViewMode, FilterStatus } from './types';
import {
    ARCHIVE_SEARCH_INPUT,
    ARCHIVE_SEGMENT_BTN_ACTIVE,
    ARCHIVE_SEGMENT_BTN_BASE,
    ARCHIVE_SEGMENT_BTN_INACTIVE,
    ARCHIVE_SEGMENT_SHELL,
    ARCHIVE_TOOLBAR_LABEL,
    ARCHIVE_TOOLBAR_SECTION,
} from '@/app/components/lawyer/ArchivePortal/archiveToolbarStyles';

interface DashboardControlsProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    filterStatus: FilterStatus;
    onFilterChange: (value: FilterStatus) => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
}

export const DashboardControls = ({
    searchQuery,
    onSearchChange,
    filterStatus,
    onFilterChange,
    viewMode,
    onViewModeChange,
}: DashboardControlsProps) => (
    <div className={`${ARCHIVE_TOOLBAR_SECTION} rounded-2xl border border-white/[0.06] space-y-3 !py-3.5`}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_11rem_auto] gap-2.5 items-center">
            <div className="relative min-w-0">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35" size={16} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="بحث بالاسم، نوع الطلب، أو المحكمة..."
                    className={ARCHIVE_SEARCH_INPUT}
                />
            </div>

            <div className="relative min-w-0">
                <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" size={16} />
                <select
                    value={filterStatus}
                    onChange={(e) => onFilterChange(e.target.value as FilterStatus)}
                    className={`${ARCHIVE_SEARCH_INPUT} appearance-none cursor-pointer`}
                >
                    <option value="all">جميع الحالات</option>
                    <option value="critical">حرجة فقط</option>
                    <option value="active">نشطة فقط</option>
                    <option value="completed">منجزة فقط</option>
                </select>
            </div>

            <div className="flex items-center gap-2 justify-end">
                <span className={`${ARCHIVE_TOOLBAR_LABEL} hidden sm:inline`}>العرض</span>
                <div className={`${ARCHIVE_SEGMENT_SHELL} p-0.5`}>
                    <button
                        type="button"
                        onClick={() => onViewModeChange('grid')}
                        className={`${ARCHIVE_SEGMENT_BTN_BASE} inline-flex items-center gap-1.5 px-2.5 ${
                            viewMode === 'grid' ? ARCHIVE_SEGMENT_BTN_ACTIVE : ARCHIVE_SEGMENT_BTN_INACTIVE
                        }`}
                    >
                        <Grid3x3 size={15} />
                        <span className="text-[11px]">شبكة</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onViewModeChange('list')}
                        className={`${ARCHIVE_SEGMENT_BTN_BASE} inline-flex items-center gap-1.5 px-2.5 ${
                            viewMode === 'list' ? ARCHIVE_SEGMENT_BTN_ACTIVE : ARCHIVE_SEGMENT_BTN_INACTIVE
                        }`}
                    >
                        <List size={15} />
                        <span className="text-[11px]">قائمة</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
);
