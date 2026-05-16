import React from 'react';
import { ChevronLeft } from 'lucide-react';
import type { FilterTag } from '@/app/components/lawyer/hooks/useSmartVault';
import { FILTERS } from '@/app/components/lawyer/hooks/useSmartVault';

interface FilterChipsProps {
    activeFilter: FilterTag;
    onChange: React.Dispatch<React.SetStateAction<FilterTag>>;
    totalCount: number;
    filteredCount: number;
}

export const FilterChips: React.FC<FilterChipsProps> = ({ activeFilter, onChange, totalCount, filteredCount }) => (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {FILTERS.map((f) => {
            const isActive = activeFilter === f;
            return (
                <button type="button"
                    key={f}
                    onClick={() => onChange(f)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                        isActive
                            ? 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.15)]'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                >
                    {f}
                    {f === 'الكل' && <span className="mr-1 text-[10px] opacity-60">({totalCount})</span>}
                </button>
            );
        })}
        {activeFilter !== 'الكل' && (
            <span className="shrink-0 text-[10px] text-white/30 mr-1">
                ({filteredCount})
            </span>
        )}
    </div>
);
