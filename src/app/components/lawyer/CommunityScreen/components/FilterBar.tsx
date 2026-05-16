import React from 'react';

interface FilterBarProps {
    filters: string[];
    selectedFilterIndex: number;
    onFilterSelect: (index: number) => void;
}

export const FilterBar = ({ filters, selectedFilterIndex, onFilterSelect }: FilterBarProps) => {
    return (
        <div className="overflow-x-auto py-3 px-4 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="flex gap-2 min-w-max">
                {filters.map((filter, index) => {
                    const isSelected = selectedFilterIndex === index;
                    return (
                        <button type="button"
                            key={index}
                            onClick={() => onFilterSelect(index)}
                            className={`
                                px-4 py-2 rounded-full text-[13px] border transition-all duration-200
                                ${isSelected
                                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 font-bold'
                                    : 'bg-transparent border-white/10 text-white/40 font-normal hover:border-white/20'}
                            `}
                        >
                            {filter}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
