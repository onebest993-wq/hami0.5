import React from 'react';
import type { JudgmentModalStyles } from './smartFile/smartModalChrome';
import {
    APPEAL_WINDOW_LAPSE_METHOD,
    CASSATION_WINDOW_LAPSE_METHOD,
} from './smartFile/appealWindowLapseEngine';

export type AppealTransitionModalAppealTypeSectionProps = {
    s: JudgmentModalStyles;
    appealType: string;
    setAppealType: (value: string) => void;
    appealTypeOptions: Array<{ value: string; label: string }>;
    offerAppealWindowLapse?: boolean;
    offerCassationWindowLapse?: boolean;
};

export function AppealTransitionModalAppealTypeSection({
    s,
    appealType,
    setAppealType,
    appealTypeOptions,
    offerAppealWindowLapse,
    offerCassationWindowLapse,
}: AppealTransitionModalAppealTypeSectionProps) {
    return (
        <div className={s.section}>
            <p className={s.label}>نوع الطعن</p>
            <div className={`grid gap-2 ${appealTypeOptions.length >= 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
                {appealTypeOptions.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAppealType(opt.value)}
                        className={`min-h-[3.875rem] py-2.5 px-3 rounded-xl border text-sm leading-snug text-center transition-colors ${
                            appealType === opt.value ? s.toggleActive : s.toggleIdle
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
            {offerAppealWindowLapse || offerCassationWindowLapse ? (
                <div className="mt-2 flex flex-col gap-2">
                    {offerAppealWindowLapse ? (
                        <button
                            type="button"
                            onClick={() => setAppealType(APPEAL_WINDOW_LAPSE_METHOD)}
                            className={`w-full py-2.5 px-3 rounded-xl border text-sm transition-colors min-h-[44px] ${
                                appealType === APPEAL_WINDOW_LAPSE_METHOD ? s.toggleActive : s.toggleIdle
                            }`}
                        >
                            {APPEAL_WINDOW_LAPSE_METHOD}
                        </button>
                    ) : null}
                    {offerCassationWindowLapse ? (
                        <button
                            type="button"
                            onClick={() => setAppealType(CASSATION_WINDOW_LAPSE_METHOD)}
                            className={`w-full py-2.5 px-3 rounded-xl border text-sm transition-colors min-h-[44px] ${
                                appealType === CASSATION_WINDOW_LAPSE_METHOD ? s.toggleActive : s.toggleIdle
                            }`}
                        >
                            {CASSATION_WINDOW_LAPSE_METHOD}
                        </button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
