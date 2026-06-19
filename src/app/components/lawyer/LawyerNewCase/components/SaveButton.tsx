import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { NC_FOOTER } from '../newCaseGlassTheme';

export interface SaveButtonProps {
    isAnalyzing: boolean;
    hasCriminalError: boolean;
    onSave: () => void;
    variant?: 'civil' | 'personal';
}

export const SaveButton = ({ isAnalyzing, hasCriminalError, onSave, variant = 'civil' }: SaveButtonProps) => {
    const isPersonal = variant === 'personal';
    return (
        <div className={isPersonal ? 'shrink-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-violet-300/15 bg-[#0a0610]/90 backdrop-blur-xl' : NC_FOOTER}>
            <button
                type="button"
                data-testid="lawyer-new-case-save"
                onClick={onSave}
                disabled={isAnalyzing || hasCriminalError}
                className={
                    isPersonal
                        ? 'w-full h-12 rounded-2xl border border-violet-300/35 bg-gradient-to-l from-violet-500/20 via-fuchsia-500/15 to-teal-500/15 backdrop-blur-sm text-white font-bold text-sm shadow-[0_10px_32px_rgba(139,92,246,0.2)] hover:from-violet-500/28 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]'
                        : 'w-full h-12 rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/15 backdrop-blur-sm text-[#F5EED8] font-bold text-sm shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:bg-[#E6C673]/22 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                }
            >
                {isAnalyzing ? 'جارٍ التحليل والحفظ...' : <><CheckCircle2 size={18} /> حفظ وتأسيس الدعوى</>}
            </button>
        </div>
    );
};
