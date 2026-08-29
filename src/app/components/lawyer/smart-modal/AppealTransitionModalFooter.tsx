import React from 'react';
import type { JudgmentModalStyles } from './smartFile/smartModalChrome';

export type AppealTransitionModalFooterProps = {
    s: JudgmentModalStyles;
    isOpponentRegistration: boolean;
    onSubmit: () => void;
    onClose: () => void;
};

export function AppealTransitionModalFooter({
    s,
    isOpponentRegistration,
    onSubmit,
    onClose,
}: AppealTransitionModalFooterProps) {
    return (
        <div className={`shrink-0 px-5 sm:px-6 py-4 border-t ${s.isPearl ? 'border-white/[0.10] bg-[#101018]/40' : 'border-white/[0.08] bg-[#0A0F1C]/50'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                    type="button"
                    onClick={onSubmit}
                    className={`min-h-[50px] w-full rounded-xl font-bold text-sm transition-colors ${s.btnPrimary}`}
                >
                    {isOpponentRegistration ? 'تسجيل الطعن' : 'تأكيد الانتقال'}
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className={`min-h-[50px] w-full rounded-xl font-bold text-sm transition-colors ${s.btnNeutral}`}
                >
                    إلغاء
                </button>
            </div>
        </div>
    );
}
