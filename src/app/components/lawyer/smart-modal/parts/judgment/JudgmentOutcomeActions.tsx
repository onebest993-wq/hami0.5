import React from 'react';
import {
    isAppealStageName,
    isCassationStageName,
    type FirstInstanceAppealRights,
} from '../../smartFile/judgmentTypes';
import type { JudgmentModalStyles } from '../../smartFile/smartModalChrome';
import type {
    AppealClientOutcome,
    CassationClientOutcome,
} from '../../smartFile/appealStageJudgmentEngine';
import { JudgmentFirstInstanceHadoriActions } from './JudgmentFirstInstanceHadoriActions';
import { JudgmentAbsentRoleActions } from './JudgmentAbsentRoleActions';
import { JudgmentAppealStageActions } from './JudgmentAppealStageActions';
import { JudgmentCassationStageActions } from './JudgmentCassationStageActions';
import { JudgmentCorrectionStageActions } from './JudgmentCorrectionStageActions';

export type JudgmentOutcomeActionsProps = {
    styles: JudgmentModalStyles;
    judgmentType: string;
    currentStage: string;
    isCorrectionStage: boolean;
    showAbsentObjectionAppealActions: boolean;
    showFirstInstanceHadoriAppealActions: boolean;
    showAbsentJudgmentRoleActions: boolean;
    isPlaintiffLawyer: boolean;
    isDefendantLawyer: boolean;
    hadoriAppealRights: FirstInstanceAppealRights;
    appealStageOutcome: AppealClientOutcome | null;
    cassationOutcome: CassationClientOutcome | null;
    correctionRejectedOutcome: AppealClientOutcome | null;
    correctionAcceptedOutcome: AppealClientOutcome | null;
    btnGold: string;
    btnNeutral: string;
    btnWait: string;
    waitHintFallback: string;
    selfAppealHintFallback: string;
    appealTransitionLabel: string;
    onClose: () => void;
    onWaitForOpponent: () => void;
    onSaveJudgment: (actionType: string) => void;
};

export function JudgmentOutcomeActions({
    styles: s,
    judgmentType,
    currentStage,
    isCorrectionStage,
    showAbsentObjectionAppealActions,
    showFirstInstanceHadoriAppealActions,
    showAbsentJudgmentRoleActions,
    isPlaintiffLawyer,
    isDefendantLawyer,
    hadoriAppealRights,
    appealStageOutcome,
    cassationOutcome,
    correctionRejectedOutcome,
    correctionAcceptedOutcome,
    btnGold,
    btnNeutral,
    btnWait,
    waitHintFallback,
    selfAppealHintFallback,
    appealTransitionLabel,
    onClose,
    onWaitForOpponent,
    onSaveJudgment,
}: JudgmentOutcomeActionsProps) {
    if (!judgmentType) {
        return (
            <div className="mt-1 flex flex-col items-center py-2">
                <p className="text-white/40 text-xs">اختر قرار الحكم أولاً لإظهار الخيارات المتاحة</p>
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-3 w-full ${s.divider}`}>
            {showAbsentObjectionAppealActions || showFirstInstanceHadoriAppealActions ? (
                <JudgmentFirstInstanceHadoriActions
                    styles={s}
                    judgmentType={judgmentType}
                    hadoriAppealRights={hadoriAppealRights}
                    btnGold={btnGold}
                    btnWait={btnWait}
                    waitHintFallback={waitHintFallback}
                    selfAppealHintFallback={selfAppealHintFallback}
                    appealTransitionLabel={appealTransitionLabel}
                    onWaitForOpponent={onWaitForOpponent}
                    onSaveJudgment={onSaveJudgment}
                />
            ) : null}

            {showAbsentJudgmentRoleActions ? (
                <JudgmentAbsentRoleActions
                    styles={s}
                    judgmentType={judgmentType}
                    isPlaintiffLawyer={isPlaintiffLawyer}
                    isDefendantLawyer={isDefendantLawyer}
                    btnGold={btnGold}
                    btnNeutral={btnNeutral}
                    btnWait={btnWait}
                    appealTransitionLabel={appealTransitionLabel}
                    onWaitForOpponent={onWaitForOpponent}
                    onSaveJudgment={onSaveJudgment}
                />
            ) : null}

            {isAppealStageName(currentStage) && judgmentType ? (
                <JudgmentAppealStageActions
                    styles={s}
                    appealStageOutcome={appealStageOutcome}
                    btnGold={btnGold}
                    btnWait={btnWait}
                    onSaveJudgment={onSaveJudgment}
                />
            ) : null}

            {isCassationStageName(currentStage) && judgmentType ? (
                <div className="flex flex-col gap-3 w-full">
                    <JudgmentCassationStageActions
                        styles={s}
                        judgmentType={judgmentType}
                        cassationOutcome={cassationOutcome}
                        btnGold={btnGold}
                        onSaveJudgment={onSaveJudgment}
                    />
                </div>
            ) : null}

            {isCorrectionStage ? (
                <JudgmentCorrectionStageActions
                    styles={s}
                    judgmentType={judgmentType}
                    correctionRejectedOutcome={correctionRejectedOutcome}
                    correctionAcceptedOutcome={correctionAcceptedOutcome}
                    btnGold={btnGold}
                    onSaveJudgment={onSaveJudgment}
                />
            ) : null}

            <button type="button" onClick={onClose} className={`${btnNeutral} text-white/50 hover:text-white/75 mt-0.5`}>
                إلغاء
            </button>
        </div>
    );
}
