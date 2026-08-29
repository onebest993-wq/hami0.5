import React from 'react';
import { Gavel } from '@/app/components/ui/icons/Gavel';
import type { JudgmentModalStyles } from './smartFile/smartModalChrome';

export type AppealTransitionModalHintProps = {
    s: JudgmentModalStyles;
    hintShell: string;
    judgmentType?: string;
    cassationOnlyHint: string | null;
    showJudgmentFormMeta: boolean;
    judgmentForm?: string;
};

export function AppealTransitionModalHint({
    s,
    hintShell,
    judgmentType,
    cassationOnlyHint,
    showJudgmentFormMeta,
    judgmentForm,
}: AppealTransitionModalHintProps) {
    if (!(judgmentType || cassationOnlyHint)) return null;

    return (
        <div className={hintShell}>
            {judgmentType ? (
                <p className={`text-xs leading-relaxed ${s.isPearl ? 'text-[#ECE8E2]/85' : 'text-white/75'}`}>
                    <Gavel size={12} className={`inline ml-1 ${s.labelIcon}`} />
                    <span className={s.isPearl ? 'text-[#9894A0]' : 'text-white/45'}> المنطوق: </span>
                    <span className={`font-bold ${s.isPearl ? 'text-[#FFFEF9]' : 'text-[#E6C673]/90'}`}>{judgmentType}</span>
                    {showJudgmentFormMeta ? (
                        <span className={s.isPearl ? 'text-[#9894A0]/80' : 'text-white/35'}> · {judgmentForm}</span>
                    ) : null}
                </p>
            ) : null}
            {cassationOnlyHint ? (
                <p className={`text-[11px] leading-relaxed ${s.isPearl ? 'text-[#FFD4DC]/85' : 'text-amber-200/80'}`}>{cassationOnlyHint}</p>
            ) : null}
        </div>
    );
}
