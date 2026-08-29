import React from 'react';
import { X } from '@/app/components/ui/icons/X';
import type { JudgmentModalStyles } from './smartFile/smartModalChrome';

export type AppealTransitionModalHeaderProps = {
    s: JudgmentModalStyles;
    isOpponentRegistration: boolean;
    isGhayabi: boolean;
    onClose: () => void;
};

export function AppealTransitionModalHeader({
    s,
    isOpponentRegistration,
    isGhayabi,
    onClose,
}: AppealTransitionModalHeaderProps) {
    return (
        <div className={s.header}>
            <div className="min-w-0 text-right">
                <h2 className={s.headerTitle}>
                    {isOpponentRegistration
                        ? isGhayabi
                            ? 'تسجيل طعن الحكم الغيابي'
                            : 'تسجيل طعن الخصم'
                        : 'بوابة الطعن'}
                </h2>
                <p className={`text-[11px] truncate ${s.isPearl ? 'text-[#9894A0]' : 'text-white/40'}`}>
                    انقلاب المراكز وإنشاء إضبارة الطعن
                </p>
            </div>
            <button
                type="button"
                onClick={onClose}
                className={s.closeBtn}
                aria-label="إغلاق"
            >
                <X size={18} />
            </button>
        </div>
    );
}
