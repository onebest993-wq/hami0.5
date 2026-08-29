import React from 'react';
import type { JudgmentModalStyles } from '../../smartFile/smartModalChrome';
import type { CassationClientOutcome } from '../../smartFile/appealStageJudgmentEngine';
import { ShieldAlert } from '@/app/components/ui/icons/ShieldAlert';
import { Trophy } from '@/app/components/ui/icons/Trophy';
import { ArrowLeftRight } from '@/app/components/ui/icons/ArrowLeftRight';
import { Stamp } from '@/app/components/ui/icons/Stamp';
import { GLASS_BTN_EMERALD, GLASS_BTN_NEUTRAL } from './judgmentGlassButtons';

export type JudgmentCassationStageActionsProps = {
    styles: JudgmentModalStyles;
    judgmentType: string;
    cassationOutcome: CassationClientOutcome | null;
    btnGold: string;
    onSaveJudgment: (actionType: string) => void;
};

export function JudgmentCassationStageActions({
    styles: s,
    judgmentType,
    cassationOutcome,
    btnGold,
    onSaveJudgment,
}: JudgmentCassationStageActionsProps) {
    if (judgmentType === 'تصديق الحكم' || judgmentType === 'رد الطعن التمييزي شكلاً') {
        if (cassationOutcome === 'loss') {
            return (
                <div className="flex flex-col gap-2">
                    <p className={`${s.hint} text-rose-300/85 border-rose-500/15 justify-center`}>
                        <ShieldAlert size={14} className="shrink-0 text-rose-400/80" />
                        تصديق الحكم — اكتسب الدرجة القطعية (حكم نهائي ضد موكلك)
                    </p>
                    <button type="button" onClick={() => onSaveJudgment('final_ratification')} className={GLASS_BTN_NEUTRAL}>
                        <Stamp size={16} />
                        ختم الإضبارة (مكتسبة الدرجة القطعية)
                    </button>
                </div>
            );
        }
        return (
            <div className="flex flex-col gap-2">
                <p className={`${s.hint} text-emerald-300/85 border-emerald-500/15 justify-center`}>
                    <Trophy size={14} className="shrink-0 text-emerald-400/80" />
                    {cassationOutcome === 'win'
                        ? 'موكلك ربح — اكتسب الحكم الدرجة القطعية'
                        : 'اكتسب الحكم الدرجة القطعية (نهاية المطاف)'}
                </p>
                <button type="button" onClick={() => onSaveJudgment('final_ratification')} className={GLASS_BTN_EMERALD}>
                    ختم الإضبارة (مكتسبة الدرجة القطعية)
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <p
                className={`${s.hint} ${
                    cassationOutcome === 'remand_favorable'
                        ? 'text-emerald-300/85 border-emerald-500/15'
                        : s.isPearl
                          ? 'text-[#FFD4DC]/85 border-[#F0A8B4]/15'
                          : 'text-[#E6C673]/85 border-[#E6C673]/15'
                } justify-center`}
            >
                <ArrowLeftRight
                    size={14}
                    className={`shrink-0 ${s.isPearl ? 'text-[#F0A8B4]/80' : 'text-[#E6C673]/80'}`}
                />
                {cassationOutcome === 'remand_favorable'
                    ? 'نقض الحكم — قد يُعاد لصالح موكلك بعد إعادة الإضبارة'
                    : 'تم نقض الحكم — يجب إعادة الدعوى للمحكمة السابقة'}
            </p>
            <button type="button" onClick={() => onSaveJudgment('remand_to_lower')} className={btnGold}>
                إعادة الإضبارة (لاتباع القرار التمييزي)
            </button>
        </div>
    );
}
