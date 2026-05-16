import React from 'react';
import { Sparkles, X } from 'lucide-react';
import type { HeaderProps } from './types';

export const Header = ({ onClose }: HeaderProps) => (
    <div className="sticky top-0 z-10 bg-gradient-to-r from-[#0F172A] via-[#162044] to-[#0F172A] border-b border-[#E6C673]/30">
        <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-400/20">
                    <Sparkles size={16} className="text-[#0B1021]" />
                </div>
                <div>
                    <h2 className="text-white font-bold text-sm">المستشار الذكي</h2>
                    <p className="text-[10px] text-amber-400/70">متصل بالقوانين العراقية</p>
                </div>
            </div>
            <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    </div>
);
