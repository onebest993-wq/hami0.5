import React from 'react';
import { Scale } from '@/app/components/ui/icons/Scale';
import type { JudgmentModalStyles } from './smartFile/smartModalChrome';

export type AppealTransitionModalAppealTypeSectionProps = {
    s: JudgmentModalStyles;
    appealType: string;
    setAppealType: (value: string) => void;
    appealTypeOptions: Array<{ value: string; label: string }>;
};

export function AppealTransitionModalAppealTypeSection({
    s,
    appealType,
    setAppealType,
    appealTypeOptions,
}: AppealTransitionModalAppealTypeSectionProps) {
    return (
        <div className={s.section}>
            <p className={s.label}>
                <Scale size={12} className={s.labelIcon} />
                نوع الطعن
            </p>
            <div className="flex flex-wrap gap-2">
                {appealTypeOptions.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAppealType(opt.value)}
                        className={`flex-1 min-w-[5.5rem] py-2.5 px-3 rounded-xl border text-sm transition-all ${
                            appealType === opt.value ? s.toggleActive : s.toggleIdle
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
