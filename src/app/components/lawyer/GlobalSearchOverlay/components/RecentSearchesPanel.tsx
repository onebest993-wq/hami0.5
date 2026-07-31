import React from 'react';
import { motion } from 'motion/react';
import { Clock, RotateCcw } from 'lucide-react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';

export interface RecentSearchesPanelProps {
    recentSearches: string[];
    onSelect: (value: string) => void;
    onClear: () => void;
}

export function RecentSearchesPanel({ recentSearches, onSelect, onClear }: RecentSearchesPanelProps) {
    const reduceMotion = useReduceMotion();

    if (recentSearches.length === 0) return null;

    const chipClass =
        'min-h-[44px] px-3.5 py-2 rounded-xl text-sm text-white/80 bg-white/[0.04] border border-white/[0.06] hover:border-[#E6C673]/25 hover:bg-[#E6C673]/[0.06] hover:text-[#E6C673] transition-colors truncate max-w-[220px] touch-manipulation';

    return (
        <div className="px-5 py-4 space-y-3" data-testid="global-search-recent-panel">
            <div className="flex justify-between items-center">
                <h3 className="text-[11px] font-bold text-white/35 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={12} className="text-[#E6C673]/60" />
                    الأخيرة
                </h3>
                <button
                    type="button"
                    onClick={onClear}
                    className="text-[10px] text-white/30 hover:text-[#E6C673] flex items-center gap-1 transition-colors min-h-[44px] min-w-[44px] px-2 touch-manipulation"
                    data-testid="global-search-clear-recent"
                >
                    <RotateCcw size={10} />
                    مسح
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {recentSearches.map((s) =>
                    reduceMotion ? (
                        <button
                            key={s}
                            type="button"
                            onClick={() => onSelect(s)}
                            className={chipClass}
                        >
                            {s}
                        </button>
                    ) : (
                        <motion.button
                            key={s}
                            type="button"
                            initial={false}
                            animate={{ opacity: 1, scale: 1 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => onSelect(s)}
                            className={chipClass}
                        >
                            {s}
                        </motion.button>
                    ),
                )}
            </div>
        </div>
    );
}
