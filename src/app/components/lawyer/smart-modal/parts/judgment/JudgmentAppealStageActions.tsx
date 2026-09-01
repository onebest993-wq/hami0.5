import React from 'react';
import type { JudgmentModalStyles } from '../../smartFile/smartModalChrome';
import type { AppealClientOutcome } from '../../smartFile/appealStageJudgmentEngine';

export type JudgmentAppealStageActionsProps = {
    styles: JudgmentModalStyles;
    appealStageOutcome: AppealClientOutcome | null;
    btnGold: string;
    btnWait: string;
    onSaveJudgment: (actionType: string) => void;
};

export function JudgmentAppealStageActions({
    styles: s,
    appealStageOutcome,
    btnGold,
    btnWait,
    onSaveJudgment,
}: JudgmentAppealStageActionsProps) {
    return (
        <div className="flex flex-col gap-3 w-full">
            {appealStageOutcome === 'win' ? (
                <div className="flex flex-col gap-2">
                    <p className={`${s.hint} text-emerald-300/85 border-emerald-500/15 justify-center`}>
                        موكلك ربح مرحلة الاستئناف — بانتظار تمييز الخصم
                    </p>
                    <button type="button" onClick={() => onSaveJudgment('wait_cassation')} className={btnWait}>
                        حفظ القرار وانتظار طعن الخصم (تمييزاً)
                    </button>
                </div>
            ) : appealStageOutcome === 'loss' ? (
                <div className="flex flex-col gap-2">
                    <p className={`${s.hint} text-rose-300/85 border-rose-500/15 justify-center`}>
                        موكلك خسر مرحلة الاستئناف — يحق له الطعن تمييزاً
                    </p>
                    <button type="button" onClick={() => onSaveJudgment('appeal')} className={btnGold}>
                        حفظ القرار
                    </button>
                </div>
            ) : appealStageOutcome === 'partial' ? (
                <div className="flex flex-col gap-2">
                    <p className={`${s.hint} text-[#E6C673]/85 border-[#E6C673]/15 justify-center`}>
                        حكم جزئي — يحق للطرفين الطعن تمييزاً فيما حُسم عليه
                    </p>
                    <button type="button" onClick={() => onSaveJudgment('wait_cassation')} className={btnWait}>
                        حفظ وانتظار تمييز الخصم
                    </button>
                    <button type="button" onClick={() => onSaveJudgment('appeal')} className={btnGold}>
                        حفظ القرار
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    <p className={`${s.hint} border-0 bg-transparent p-0 ${s.waitHintText} justify-center`}>
                        حدّد موقف موكلك: الكاسب ينتظر تمييز الخصم، والخاسر يطعن تمييزاً.
                    </p>
                    <button type="button" onClick={() => onSaveJudgment('wait_cassation')} className={btnWait}>
                        حفظ وانتظار تمييز الخصم (الكاسب)
                    </button>
                    <button type="button" onClick={() => onSaveJudgment('appeal')} className={btnGold}>
                        حفظ القرار (الخاسر)
                    </button>
                </div>
            )}
        </div>
    );
}
