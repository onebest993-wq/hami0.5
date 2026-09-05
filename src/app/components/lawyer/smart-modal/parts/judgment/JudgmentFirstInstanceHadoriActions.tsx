import React from 'react';
import {
    isSubjectMatterJudgmentType,
    type FirstInstanceAppealRights,
} from '../../smartFile/judgmentTypes';
import { isInterpleaderJudgmentType } from '../../smartFile/interpleaderJudgmentEngine';
import type { JudgmentModalStyles } from '../../smartFile/smartModalChrome';
import { Info } from '@/app/components/ui/icons/Info';
import { Trophy } from '@/app/components/ui/icons/Trophy';
import { Stamp } from '@/app/components/ui/icons/Stamp';
import { GLASS_BTN_EMERALD, GLASS_BTN_ROSE } from './judgmentGlassButtons';

export type JudgmentFirstInstanceHadoriActionsProps = {
    styles: JudgmentModalStyles;
    judgmentType: string;
    hadoriAppealRights: FirstInstanceAppealRights;
    btnGold: string;
    btnWait: string;
    waitHintFallback: string;
    selfAppealHintFallback: string;
    appealTransitionLabel: string;
    /** خصم غائب ملزَم — بعد الحفظ قد يظهر اعتراض/تبليغ */
    opponentMayFileAbsentObjection?: boolean;
    /** الموكل المدعى عليه غائب وملزَم — مسار اعتراض فوري اختياري */
    showClientAbsentObjection?: boolean;
    onWaitForOpponent: () => void;
    onSaveJudgment: (actionType: string) => void;
};

/**
 * حفظ واحد يُقفل المنطوق — المسارات (طعنك / طعن الخصم / اعتراض) من تذييل الإضبارة.
 * اعتراض غيابي اختياري فوري إن كان الموكل غائباً ملزَماً.
 */
export function JudgmentFirstInstanceHadoriActions({
    styles: s,
    judgmentType,
    hadoriAppealRights,
    btnGold,
    btnWait,
    waitHintFallback,
    selfAppealHintFallback,
    appealTransitionLabel: _appealTransitionLabel,
    opponentMayFileAbsentObjection = false,
    showClientAbsentObjection = false,
    onWaitForOpponent,
    onSaveJudgment,
}: JudgmentFirstInstanceHadoriActionsProps) {
    const isPartial =
        judgmentType === 'رد الدعوى جزئياً' || String(judgmentType).includes('جزئياً');
    const formRejectSaveLabel = judgmentType === 'رد الاعتراض شكلاً' ? 'حفظ القرار' : null;

    const lockHint = (() => {
        if (hadoriAppealRights.hint) return hadoriAppealRights.hint;
        if (hadoriAppealRights.action === 'wait_opponent') return waitHintFallback;
        if (hadoriAppealRights.action === 'self_appeal') return selfAppealHintFallback;
        if (isPartial) {
            return 'حكم جزئي: يُحفظ المنطوق مرة واحدة — طعن موكلك وطعن/اعتراض الخصم يظهران معاً في تذييل الإضبارة.';
        }
        return 'يُحفظ الحكم وتُقفل المرافعة — مسارات الطعن من تذييل الإضبارة.';
    })();

    const primarySave = (
        <button
            type="button"
            onClick={onWaitForOpponent}
            className={btnWait}
            data-testid="smart-judgment-lock-save"
        >
            {formRejectSaveLabel
                ?? (opponentMayFileAbsentObjection
                    ? 'حفظ الحكم (بانتظار اعتراض أو طعن الخصم)'
                    : 'حفظ الحكم')}
        </button>
    );

    const objectionOptional =
        showClientAbsentObjection ? (
            <button
                type="button"
                onClick={() => onSaveJudgment('objection')}
                className={GLASS_BTN_ROSE}
                data-testid="smart-judgment-save-objection"
            >
                حفظ وتقديم اعتراض غيابي
            </button>
        ) : null;

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

    const lockSaveBlock = (
        <div className="flex flex-col gap-2">
            <p className={`${s.hint} border-0 bg-transparent p-0 ${s.waitHintText} justify-center`}>
                <Info size={14} className={`shrink-0 ${s.waitHintIcon}`} />
                {lockHint}
            </p>
            {primarySave}
            {objectionOptional}
            {showClientAbsentObjection ? (
                <p className="text-[10px] text-white/45 text-center leading-relaxed">
                    الاعتراض اختياري الآن — يمكنك ترك الحكم غيابياً والطعن لاحقاً من التذييل.
                </p>
            ) : null}
        </div>
    );

    switch (hadoriAppealRights.action) {
        case 'wait_opponent':
            return lockSaveBlock;
        case 'self_appeal':
            return lockSaveBlock;
        case 'finalize_non_merit':
            return plaintiffNonMeritFinalizeBlock;
        case 'both_paths':
            return lockSaveBlock;
        case 'none':
            if (judgmentType === 'رد الاعتراض شكلاً') {
                return lockSaveBlock;
            }
            if (
                !isSubjectMatterJudgmentType(judgmentType)
                && !isInterpleaderJudgmentType(judgmentType)
            ) {
                return null;
            }
            return lockSaveBlock;
        default:
            if (
                !isSubjectMatterJudgmentType(judgmentType)
                && !isInterpleaderJudgmentType(judgmentType)
            ) {
                return null;
            }
            return lockSaveBlock;
    }
}
