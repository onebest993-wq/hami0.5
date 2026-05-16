import React from 'react';
import { Scale } from 'lucide-react';
import type { CivilSubView } from '../types';

export interface CivilTabsProps {
    civilSubView: CivilSubView;
    onSelectMainForm: () => void;
}

export const CivilTabs = ({ civilSubView, onSelectMainForm }: CivilTabsProps) => {
    return (
        <div className="sticky top-0 z-40 bg-gradient-to-b from-[#0B1021] via-[#141824] to-[#0B1021] border-b-2 border-[#E6C673]/20 shadow-2xl">
            <div className="px-3 py-3">
                <div className="flex gap-2">
                    <button type="button"
                        onClick={onSelectMainForm}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs transition-all duration-200 ${
                            civilSubView === 'main-form'
                                ? 'bg-gradient-to-r from-[#E6C673] to-[#D4AF37] text-[#0B1021] shadow-lg shadow-[#E6C673]/30'
                                : 'bg-[#1A1E2E]/80 text-white/50 hover:text-white/80 hover:bg-[#1A1E2E] border border-white/5'
                        }`}
                    >
                        <Scale size={16} />
                        بيانات الدعوى
                    </button>
                </div>
            </div>
        </div>
    );
};
