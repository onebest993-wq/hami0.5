import React from 'react';
import { motion } from 'motion/react';
import { Clock, RotateCcw } from 'lucide-react';

export interface RecentSearchesPanelProps {
    recentSearches: string[];
    isLoadingIndex: boolean;
    onSelect: (value: string) => void;
    onClear: () => void;
}

export function RecentSearchesPanel({ recentSearches, isLoadingIndex, onSelect, onClear }: RecentSearchesPanelProps) {
    if (isLoadingIndex && recentSearches.length === 0) {
        return (
            <div className="px-5 py-4 flex flex-wrap gap-2" aria-hidden>
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="h-9 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse"
                        style={{ width: `${72 + i * 28}px` }}
                    />
                ))}
            </div>
        );
    }

    if (recentSearches.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="px-5 py-4 space-y-3"
        >
            <div className="flex justify-between items-center">
                <h3 className="text-[11px] font-bold text-white/35 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={12} className="text-[#E6C673]/60" />
                    الأخيرة
                </h3>
                <motion.button
                    type="button"
                    onClick={onClear}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="text-[10px] text-white/30 hover:text-[#E6C673] flex items-center gap-1 transition-colors"
                >
                    <RotateCcw size={10} />
                    مسح
                </motion.button>
            </div>
            <div className="flex flex-wrap gap-2">
                {recentSearches.map((s, i) => (
                    <motion.button
                        key={s}
                        type="button"
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04 }}
                        whileHover={{ scale: 1.03, y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onSelect(s)}
                        className="px-3.5 py-2 rounded-xl text-sm text-white/80 bg-white/[0.04] border border-white/[0.06] hover:border-[#E6C673]/25 hover:bg-[#E6C673]/[0.06] hover:text-[#E6C673] transition-colors truncate max-w-[220px]"
                    >
                        {s}
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
}
