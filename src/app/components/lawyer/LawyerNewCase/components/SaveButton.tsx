import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface SaveButtonProps {
    isAnalyzing: boolean;
    hasCriminalError: boolean;
    onSave: () => void;
}

export const SaveButton = ({ isAnalyzing, hasCriminalError, onSave }: SaveButtonProps) => {
    return (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#0B1021]/90 backdrop-blur-xl border-t border-white/5 z-50">
            <button
                type="button"
                data-testid="lawyer-new-case-save"
                onClick={onSave}
                disabled={isAnalyzing || hasCriminalError}
                className="w-full h-12 rounded-xl bg-[#E6C673] text-[#0B1021] font-bold text-sm shadow-lg hover:shadow-[#E6C673]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isAnalyzing ? 'جارٍ التحليل والحفظ...' : <><CheckCircle2 size={18} /> حفظ وتأسيس الدعوى</>}
            </button>
        </div>
    );
};
