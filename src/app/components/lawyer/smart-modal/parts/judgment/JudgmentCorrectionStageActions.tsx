import React from 'react';
import type { JudgmentModalStyles } from '../../smartFile/smartModalChrome';
import type { AppealClientOutcome } from '../../smartFile/appealStageJudgmentEngine';
import { Info } from '@/app/components/ui/icons/Info';
import { ShieldAlert } from '@/app/components/ui/icons/ShieldAlert';
import { Trophy } from '@/app/components/ui/icons/Trophy';
import { ArrowLeftRight } from '@/app/components/ui/icons/ArrowLeftRight';
import { Stamp } from '@/app/components/ui/icons/Stamp';
import { GLASS_BTN_EMERALD, GLASS_BTN_NEUTRAL } from './judgmentGlassButtons';

export type JudgmentCorrectionStageActionsProps = {
    styles: JudgmentModalStyles;
    judgmentType: string;
    correctionRejectedOutcome: AppealClientOutcome | null;
    correctionAcceptedOutcome: AppealClientOutcome | null;
    btnGold: string;
    onSaveJudgment: (actionType: string) => void;
};

export function JudgmentCorrectionStageActions({
    styles: s,
    judgmentType,
    correctionRejectedOutcome,
    correctionAcceptedOutcome,
    btnGold,
    onSaveJudgment,
}: JudgmentCorrectionStageActionsProps) {
    return (
        <>
            {judgmentType === 'رد طلب التصحيح' ? (
                correctionRejectedOutcome === 'loss' ? (
                    <div className="flex flex-col gap-2 w-full">
                        <p className={`${s.hint} text-rose-300/85 border-rose-500/15 justify-center`}>
                            <ShieldAlert size={14} className="shrink-0 text-rose-400/80" />
                            رد طلب التصحيح — يُؤيد القرار التمييزي ويكتسب الدرجة القطعية (حكم نهائي ضد موكلك)
                        </p>
                        <button
                            type="button"
                            onClick={() => onSaveJudgment('correction_rejected')}
                            className={GLASS_BTN_NEUTRAL}
                        >
                            <Stamp size={16} />
                            ختم الإضبارة (مكتسبة الدرجة القطعية)
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 w-full">
                        <p
                            className={`${s.hint} ${
                                correctionRejectedOutcome === 'win'
                                    ? 'text-emerald-300/85 border-emerald-500/15'
                                    : 'text-[#E6C673]/85 border-[#E6C673]/15'
                            } justify-center`}
                        >
                            {correctionRejectedOutcome === 'win' ? (
                                <Trophy size={14} className="shrink-0 text-emerald-400/80" />
                            ) : (
                                <Info size={14} className="shrink-0 text-[#E6C673]/80" />
                            )}
                            {correctionRejectedOutcome === 'win'
                                ? 'رد طلب التصحيح — يُؤيد القرار التمييزي لصالح موكلك ويكتسب الدرجة القطعية'
                                : 'رد طلب التصحيح — يُؤيد القرار التمييزي ويكتسب الدرجة القطعية'}
                        </p>
                        <button
                            type="button"
                            onClick={() => onSaveJudgment('correction_rejected')}
                            className={
                                correctionRejectedOutcome === 'win' ? GLASS_BTN_EMERALD : GLASS_BTN_NEUTRAL
                            }
                        >
                            <Stamp size={16} />
                            ختم الإضبارة (مكتسبة الدرجة القطعية)
                        </button>
                    </div>
                )
            ) : null}

            {judgmentType === 'قبول طلب التصحيح' ? (
                correctionAcceptedOutcome === 'win' ? (
                    <div className="flex flex-col gap-2 w-full">
                        <p className={`${s.hint} text-emerald-300/85 border-emerald-500/15 justify-center`}>
                            <Trophy size={14} className="shrink-0 text-emerald-400/80" />
                            قبول التصحيح — يُعاد النظر لصالح موكلك بعد إلغاء القفل القطعي
                        </p>
                        <button
                            type="button"
                            onClick={() => onSaveJudgment('correction_complete')}
                            className={GLASS_BTN_EMERALD}
                        >
                            إتمام التصحيح والعودة لمرحلة الترافع
                        </button>
                    </div>
                ) : correctionAcceptedOutcome === 'loss' ? (
                    <div className="flex flex-col gap-2 w-full">
                        <p className={`${s.hint} text-rose-300/85 border-rose-500/15 justify-center`}>
                            <ShieldAlert size={14} className="shrink-0 text-rose-400/80" />
                            قبول التصحيح — يُعاد النظر ضد موكلك بعد إلغاء القفل القطعي
                        </p>
                        <button
                            type="button"
                            onClick={() => onSaveJudgment('correction_complete')}
                            className={GLASS_BTN_NEUTRAL}
                        >
                            إتمام التصحيح والعودة لمرحلة الترافع
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 w-full">
                        <p className={`${s.hint} text-[#E6C673]/85 border-[#E6C673]/15 justify-center`}>
                            <ArrowLeftRight
                                size={14}
                                className={`shrink-0 ${s.isPearl ? 'text-[#F0A8B4]/80' : 'text-[#E6C673]/80'}`}
                            />
                            قبول التصحيح — تُعاد الإضبارة لآخر مرحلة ترافع نشطة (استئناف أو تمييز).
                        </p>
                        <button
                            type="button"
                            onClick={() => onSaveJudgment('correction_complete')}
                            className={btnGold}
                        >
                            إتمام التصحيح والعودة لمرحلة الترافع
                        </button>
                    </div>
                )
            ) : null}
        </>
    );
}
