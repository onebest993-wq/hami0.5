import React from 'react';
import {
    isSubjectMatterJudgmentType,
    type FirstInstanceAppealRights,
} from '../../smartFile/judgmentTypes';
import type { JudgmentModalStyles } from '../../smartFile/smartModalChrome';
import { Info } from '@/app/components/ui/icons/Info';
import { ShieldAlert } from '@/app/components/ui/icons/ShieldAlert';
import { Trophy } from '@/app/components/ui/icons/Trophy';
import { Stamp } from '@/app/components/ui/icons/Stamp';
import { Clock } from '@/app/components/ui/icons/Clock';
import { GLASS_BTN_EMERALD } from './judgmentGlassButtons';

export type JudgmentFirstInstanceHadoriActionsProps = {
    styles: JudgmentModalStyles;
    judgmentType: string;
    hadoriAppealRights: FirstInstanceAppealRights;
    btnGold: string;
    btnWait: string;
    waitHintFallback: string;
    selfAppealHintFallback: string;
    appealTransitionLabel: string;
    onWaitForOpponent: () => void;
    onSaveJudgment: (actionType: string) => void;
};

export function JudgmentFirstInstanceHadoriActions({
    styles: s,
    judgmentType,
    hadoriAppealRights,
    btnGold,
    btnWait,
    waitHintFallback,
    selfAppealHintFallback,
    appealTransitionLabel,
    onWaitForOpponent,
    onSaveJudgment,
}: JudgmentFirstInstanceHadoriActionsProps) {
    const plaintiffWaitAppealBlock = (
        <div className={s.waitBox}>
            <p className={`${s.hint} border-0 bg-transparent p-0 ${s.waitHintText} justify-center`}>
                <Clock size={14} className={`shrink-0 ${s.waitHintIcon}`} />
                {hadoriAppealRights.hint || waitHintFallback}
            </p>
            <button type="button" onClick={onWaitForOpponent} className={btnWait}>
                <Clock size={16} />
                حفظ الحكم وانتظار طعن الخصم
            </button>
        </div>
    );

    const plaintiffNonMeritFinalizeBlock = (
        <div className="flex flex-col gap-2">
            <p className={`${s.hint} text-emerald-300/85 border-emerald-500/15 justify-center`}>
                <Trophy size={14} className="shrink-0 text-emerald-400/80" />
                إنهاء نهائي — مكتسبة الدرجة القطعية
            </p>
            <button type="button" onClick={() => onSaveJudgment('finalize_non_merit')} className={GLASS_BTN_EMERALD}>
                <Stamp size={16} />
                ختم الإضبارة (مكتسبة الدرجة القطعية)
            </button>
        </div>
    );

    const defendantAppealBlock = (
        <div className="flex flex-col gap-2">
            <p className={`${s.hint} text-rose-300/85 border-rose-500/15 justify-center`}>
                <ShieldAlert size={14} className="shrink-0 text-rose-400/80" />
                {hadoriAppealRights.hint || selfAppealHintFallback}
            </p>
            <button type="button" onClick={() => onSaveJudgment('appeal')} className={btnGold}>
                {appealTransitionLabel}
            </button>
        </div>
    );

    const dualPathBlock = (opts: { kaasebSuffix?: string; khasirSuffix?: string; waitLabel?: string }) => (
        <div className="flex flex-col gap-2">
            <p className={`${s.hint} border-0 bg-transparent p-0 ${s.waitHintText} justify-center`}>
                <Info size={14} className={`shrink-0 ${s.waitHintIcon}`} />
                {hadoriAppealRights.hint ||
                    'حدّد موقف موكلك: إن كنت الكاسب انتظر طعن الخصم، وإن كنت الخاسر انتقل للطعن.'}
            </p>
            <button type="button" onClick={onWaitForOpponent} className={btnWait}>
                <Clock size={16} />
                {opts.waitLabel ?? 'حفظ الحكم وانتظار طعن الخصم'}
                {opts.kaasebSuffix ?? ''}
            </button>
            <button type="button" onClick={() => onSaveJudgment('appeal')} className={btnGold}>
                {appealTransitionLabel}
                {opts.khasirSuffix ?? ''}
            </button>
        </div>
    );

    switch (hadoriAppealRights.action) {
        case 'wait_opponent':
            return plaintiffWaitAppealBlock;
        case 'self_appeal':
            return defendantAppealBlock;
        case 'finalize_non_merit':
            return plaintiffNonMeritFinalizeBlock;
        case 'both_paths':
            return dualPathBlock({
                waitLabel: 'حفظ الحكم وانتظار طعن الخصم',
                kaasebSuffix: ' (الكاسب)',
                khasirSuffix: ' (الخاسر)',
            });
        case 'none':
        default:
            if (!isSubjectMatterJudgmentType(judgmentType)) return null;
            return dualPathBlock({});
    }
}
