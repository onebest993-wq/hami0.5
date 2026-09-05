import React from 'react';
import type { JudgmentModalStyles } from '../../smartFile/smartModalChrome';
import type { CassationClientOutcome } from '../../smartFile/appealStageJudgmentEngine';
import { Stamp } from '@/app/components/ui/icons/Stamp';
import { GLASS_BTN_EMERALD, GLASS_BTN_NEUTRAL } from './judgmentGlassButtons';
import {
    CASSATION_JUDGMENT_AFFIRMED,
    CASSATION_JUDGMENT_DISMISS_FORMAL,
    CASSATION_JUDGMENT_REVERSE_FINAL,
} from '@/app/domain/lawsuit/cassationArt210';

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
    if (
        judgmentType === CASSATION_JUDGMENT_AFFIRMED
        || judgmentType === CASSATION_JUDGMENT_DISMISS_FORMAL
        || judgmentType === CASSATION_JUDGMENT_REVERSE_FINAL
    ) {
        const isLoss = cassationOutcome === 'loss';
        const action =
            judgmentType === CASSATION_JUDGMENT_REVERSE_FINAL
                ? 'reverse_final'
                : 'final_ratification';
        return (
            <div className="flex flex-col gap-2">
                <button
                    type="button"
                    onClick={() => onSaveJudgment(action)}
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
