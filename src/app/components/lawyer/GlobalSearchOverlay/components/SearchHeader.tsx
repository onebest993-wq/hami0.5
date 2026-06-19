import React, { type RefObject } from 'react';
import { motion } from 'motion/react';
import { Loader2, Search, X } from 'lucide-react';

export interface SearchHeaderProps {
    query: string;
    onQueryChange: (value: string) => void;
    onClose: () => void;
    isBusy: boolean;
    inputRef?: RefObject<HTMLInputElement | null>;
}

export function SearchHeader({ query, onQueryChange, onClose, isBusy, inputRef }: SearchHeaderProps) {
    return (
        <div className="relative shrink-0 px-4 pt-2 pb-3 sm:px-5 sm:pt-4">
            <div
                className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4 sm:hidden"
                aria-hidden
            />

            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E6C673]/40 to-transparent hidden sm:block" />

            <div className="flex items-center gap-2.5">
                <motion.button
                    type="button"
                    onClick={onClose}
                    whileTap={{ scale: 0.94 }}
                    className="shrink-0 text-sm font-bold text-[#E6C673]/80 active:text-[#E6C673] px-1 min-h-[44px] sm:hidden"
                    aria-label="إغلاق البحث"
                >
                    إغلاق
                </motion.button>

                <div
                    className={`flex-1 flex items-center gap-3 min-h-[52px] rounded-2xl px-4 border transition-all duration-300 ${
                        query
                            ? 'bg-[#E6C673]/[0.06] border-[#E6C673]/25 shadow-[0_0_32px_rgba(230,198,115,0.08)]'
                            : 'bg-white/[0.05] border-white/[0.08]'
                    }`}
                >
                    <Search className="text-[#E6C673] shrink-0" size={20} strokeWidth={2.2} aria-hidden />
                    <input
                        autoFocus
                        ref={inputRef}
                        data-testid="global-search-input"
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        placeholder="ابحث في التطبيق..."
                        enterKeyHint="search"
                        className="flex-1 min-w-0 bg-transparent text-base sm:text-lg font-bold text-white placeholder-white/25 outline-none border-none"
                    />
                    {isBusy ? (
                        <Loader2 size={20} className="text-[#E6C673] animate-spin shrink-0" />
                    ) : query ? (
                        <motion.button
                            type="button"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={() => onQueryChange('')}
                            whileTap={{ scale: 0.9 }}
                            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 shrink-0"
                            aria-label="مسح البحث"
                        >
                            <X size={14} />
                        </motion.button>
                    ) : null}
                </div>

                <motion.button
                    type="button"
                    onClick={onClose}
                    whileTap={{ scale: 0.92 }}
                    className="hidden sm:flex w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/[0.08] items-center justify-center text-white/40 hover:text-white shrink-0"
                    aria-label="إغلاق البحث"
                >
                    <X size={18} />
                </motion.button>
            </div>
        </div>
    );
}
