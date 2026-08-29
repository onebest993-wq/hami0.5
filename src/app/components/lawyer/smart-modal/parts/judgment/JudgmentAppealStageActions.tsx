import React from 'react';
import type { JudgmentModalStyles } from '../../smartFile/smartModalChrome';
import type { AppealClientOutcome } from '../../smartFile/appealStageJudgmentEngine';
import { Info } from '@/app/components/ui/icons/Info';
import { ShieldAlert } from '@/app/components/ui/icons/ShieldAlert';
import { Trophy } from '@/app/components/ui/icons/Trophy';

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
                        <Trophy size={14} className="shrink-0 text-emerald-400/80" />
                        موكلك ربح مرحلة الاستئناف — بانتظار تمييز الخصم
                    </p>
                    <button type="button" onClick={() => onSaveJudgment('wait_cassation')} className={btnWait}>
                        حفظ القرار وانتظار طعن الخصم (تمييزاً)
                    </button>
                </div>
            ) : appealStageOutcome === 'loss' ? (
                <div className="flex flex-col gap-2">
                    <p className={`${s.hint} text-rose-300/85 border-rose-500/15 justify-center`}>
                        <ShieldAlert size={14} className="shrink-0 text-rose-400/80" />
                        موكلك خسر مرحلة الاستئناف — يحق له الطعن تمييزاً
                    </p>
                    <button type="button" onClick={() => onSaveJudgment('appeal')} className={btnGold}>
                        حفظ والانتقال لمحكمة التمييز
                    </button>
                </div>
            ) : appealStageOutcome === 'partial' ? (
                <div className="flex flex-col gap-2">
                    <p className={`${s.hint} text-[#E6C673]/85 border-[#E6C673]/15 justify-center`}>
                        <Info
                            size={14}
                            className={`shrink-0 ${s.isPearl ? 'text-[#F0A8B4]/80' : 'text-[#E6C673]/80'}`}
                        />
                        حكم جزئي — يحق للطرفين الطعن تمييزاً فيما حُسم عليه
                    </p>
                    <button type="button" onClick={() => onSaveJudgment('wait_cassation')} className={btnWait}>
                        حفظ وانتظار تمييز الخصم
                    </button>
                    <button type="button" onClick={() => onSaveJudgment('appeal')} className={btnGold}>
                        حفظ والانتقال للتمييز
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    <p className={`${s.hint} border-0 bg-transparent p-0 ${s.waitHintText} justify-center`}>
                        <Info size={14} className={`shrink-0 ${s.waitHintIcon}`} />
                        حدّد موقف موكلك: الكاسب ينتظر تمييز الخصم، والخاسر يطعن تمييزاً.
                    </p>
                    <button type="button" onClick={() => onSaveJudgment('wait_cassation')} className={btnWait}>
                        حفظ وانتظار تمييز الخصم (الكاسب)
                    </button>
                    <button type="button" onClick={() => onSaveJudgment('appeal')} className={btnGold}>
                        حفظ والانتقال للتمييز (الخاسر)
                    </button>
                </div>
            )}
        </div>
    );
}
