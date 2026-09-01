import React from 'react';
import type { JudgmentModalStyles } from '../../smartFile/smartModalChrome';
import type { CassationClientOutcome } from '../../smartFile/appealStageJudgmentEngine';
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
    judgmentType,
    cassationOutcome,
    btnGold,
    onSaveJudgment,
}: JudgmentCassationStageActionsProps) {
    if (judgmentType === 'تصديق الحكم' || judgmentType === 'رد الطعن التمييزي شكلاً') {
        const isLoss = cassationOutcome === 'loss';
        return (
            <div className="flex flex-col gap-2">
                <button
                    type="button"
                    onClick={() => onSaveJudgment('final_ratification')}
                    className={isLoss ? GLASS_BTN_NEUTRAL : GLASS_BTN_EMERALD}
                >
                    <Stamp size={16} />
                    ختم الإضبارة
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <button type="button" onClick={() => onSaveJudgment('remand_to_lower')} className={btnGold}>
                إعادة الإضبارة
            </button>
        </div>
    );
}
