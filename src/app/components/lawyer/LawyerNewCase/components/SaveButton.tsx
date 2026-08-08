import React from 'react';
import { CheckCircle2 } from '@/app/components/ui/lucideIcons';
import { NC_FOOTER } from '../newCaseGlassTheme';
import {
    PERSONAL_STATUS_FOOTER,
    PERSONAL_STATUS_SAVE_BTN,
} from '@/app/components/lawyer/personal-status/personalStatusVisualTheme';

export interface SaveButtonProps {
    isAnalyzing: boolean;
    hasCriminalError: boolean;
    onSave: () => void;
    variant?: 'civil' | 'personal';
}

export const SaveButton = ({ isAnalyzing, hasCriminalError, onSave, variant = 'civil' }: SaveButtonProps) => {
    const isPersonal = variant === 'personal';
    return (
        <div className={isPersonal ? PERSONAL_STATUS_FOOTER : NC_FOOTER}>
            <button
                type="button"
                data-testid="lawyer-new-case-save"
                onClick={onSave}
                disabled={isAnalyzing || hasCriminalError}
                className={
                    isPersonal
                        ? PERSONAL_STATUS_SAVE_BTN
                        : 'w-full h-12 rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/15 backdrop-blur-sm text-[#F5EED8] font-bold text-sm shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:bg-[#E6C673]/22 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation'
                }
            >
                {isAnalyzing ? 'جارٍ التحليل والحفظ...' : <><CheckCircle2 size={18} /> حفظ وتأسيس الدعوى</>}
            </button>
        </div>
    );
};
