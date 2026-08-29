import React from 'react';
import type { JudgmentModalStyles } from '../../smartFile/smartModalChrome';
import { ShieldAlert } from '@/app/components/ui/icons/ShieldAlert';
import { GLASS_BTN_ROSE } from './judgmentGlassButtons';

export type JudgmentAbsentRoleActionsProps = {
    styles: JudgmentModalStyles;
    judgmentType: string;
    isPlaintiffLawyer: boolean;
    isDefendantLawyer: boolean;
    btnGold: string;
    btnNeutral: string;
    btnWait: string;
    appealTransitionLabel: string;
    onWaitForOpponent: () => void;
    onSaveJudgment: (actionType: string) => void;
};

export function JudgmentAbsentRoleActions({
    styles: s,
    judgmentType,
    isPlaintiffLawyer,
    isDefendantLawyer,
    btnGold,
    btnNeutral,
    btnWait,
    appealTransitionLabel,
    onWaitForOpponent,
    onSaveJudgment,
}: JudgmentAbsentRoleActionsProps) {
    return (
        <>
            {isPlaintiffLawyer &&
                (judgmentType === 'إجابة الدعوى بالكامل' ? (
                    <button type="button" onClick={() => onSaveJudgment('wait_objection')} className={btnWait}>
                        حفظ الحكم وانتظار اعتراض الخصم
                    </button>
                ) : (
                    <button type="button" onClick={() => onSaveJudgment('appeal')} className={btnGold}>
                        {appealTransitionLabel}
                    </button>
                ))}
            {isDefendantLawyer &&
                (judgmentType === 'رد الدعوى كلياً' ? (
                    <button type="button" onClick={onWaitForOpponent} className={btnWait}>
                        حفظ الحكم وانتظار طعن الخصم
                    </button>
                ) : (
                    <div className="flex flex-col gap-2 w-full">
                        <p className={`${s.hint} text-rose-300/85 border-rose-500/15 justify-center`}>
                            <ShieldAlert size={14} className="shrink-0 text-rose-400/80" />
                            صدر حكم غيابي ضد موكلك
                        </p>
                        <button type="button" onClick={() => onSaveJudgment('objection')} className={GLASS_BTN_ROSE}>
                            حفظ وتقديم اعتراض غيابي
                        </button>
                        <button type="button" onClick={() => onSaveJudgment('appeal')} className={btnNeutral}>
                            حفظ وترك الحكم غيابياً (انتقال للطعن)
                        </button>
                    </div>
                ))}
        </>
    );
}
