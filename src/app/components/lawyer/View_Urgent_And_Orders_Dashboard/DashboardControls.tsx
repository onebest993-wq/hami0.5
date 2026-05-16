import React from 'react';
import { Search, Filter, Grid3x3, List } from 'lucide-react';
import type { ViewMode, FilterStatus } from './types';

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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="بحث بالاسم، نوع الطلب، أو المحكمة..."
                className="w-full bg-[#1A1E2E] border border-white/10 rounded-lg pr-10 pl-4 py-3 text-white text-sm focus:border-[#E6C673] outline-none"
            />
        </div>

        <div className="relative">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <select
                value={filterStatus}
                onChange={(e) => onFilterChange(e.target.value as FilterStatus)}
                className="w-full bg-[#1A1E2E] border border-white/10 rounded-lg pr-10 pl-4 py-3 text-white text-sm focus:border-[#E6C673] outline-none appearance-none cursor-pointer"
            >
                <option value="all">جميع الحالات</option>
                <option value="critical">حرجة فقط</option>
                <option value="active">نشطة فقط</option>
                <option value="completed">منجزة فقط</option>
            </select>
        </div>

        <div className="flex gap-2">
            <button
                type="button"
                onClick={() => onViewModeChange('grid')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${
                    viewMode === 'grid'
                        ? 'bg-[#E6C673] border-[#E6C673] text-[#0B1021] font-bold'
                        : 'bg-[#1A1E2E] border-white/10 text-white/60 hover:border-white/30'
                }`}
            >
                <Grid3x3 size={16} />
                <span className="text-sm">شبكة</span>
            </button>
            <button
                type="button"
                onClick={() => onViewModeChange('list')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${
                    viewMode === 'list'
                        ? 'bg-[#E6C673] border-[#E6C673] text-[#0B1021] font-bold'
                        : 'bg-[#1A1E2E] border-white/10 text-white/60 hover:border-white/30'
                }`}
            >
                <List size={16} />
                <span className="text-sm">قائمة</span>
            </button>
        </div>
    </div>
);
