import type { StageConclusion } from '../criminalStore';
import type { CriminalDefendant } from '../criminalCaseModel';
import { isPrivateRightWaiverDecisionValue } from '../criminalStageUtils';
import { validateExpirationReasonSelection } from '../stageExpirationReasons';
import { isCassationClosureQuashDecision } from '../cassationEngine';
import {
    decisionRequiresDefendantScope,
    shouldShowDefendantDecisionScopePicker,
} from '../partyPersonalStage';
import type { StageCloserDecisionType } from '../orchestrators/criminalOrchestratorSliceTypes';

export type StageCloserModalFooterProps = {
    defendants: CriminalDefendant[];
    stageCloserReferralOnly: boolean;
    closureDecisionType: StageCloserDecisionType;
    closureDate: string;
    closureDetails: string;
    closureExpirationReason: StageConclusion['expirationReason'] | '';
    closureExpirationCustomDetail: string;
    closureExpirationDefendantIds: string[];
    closureJuvenileSeverDefendantId: string;
    closureReferralStage: string;
    closureReferralCourtName: string;
    closureReferralCaseNumber: string;
    closureScopedDefendantIds: string[];
    closureSharedObjective269b: boolean;
    onClose: () => void;
    onSubmit: () => void;
};

export function StageCloserModalFooter({
    defendants,
    stageCloserReferralOnly,
    closureDecisionType,
    closureDate,
    closureDetails,
    closureExpirationReason,
    closureExpirationCustomDetail,
    closureExpirationDefendantIds,
    closureJuvenileSeverDefendantId,
    closureReferralStage,
    closureReferralCourtName,
    closureReferralCaseNumber,
    closureScopedDefendantIds,
    closureSharedObjective269b,
    onClose,
    onSubmit,
}: StageCloserModalFooterProps) {
    return (
        <div className="flex items-center justify-end gap-2 pt-2">
            <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words"
            >
                إلغاء
            </button>
            <button
                type="button"
                onClick={onSubmit}
                disabled={
                    !closureDecisionType ||
                    !closureDate.trim() ||
                    !closureDetails.trim() ||
                    (closureDecisionType === 'expiration' &&
                        (Boolean(
                            validateExpirationReasonSelection(
                                closureExpirationReason,
                                closureExpirationCustomDetail,
                            ),
                        ) ||
                            !closureExpirationDefendantIds.length)) ||
                    (closureDecisionType === 'juvenile_severance_referral' &&
                        !closureJuvenileSeverDefendantId.trim()) ||
                    ((closureDecisionType === 'referral' ||
                        closureDecisionType === 'case_split_fugitive_referral') &&
                        (!closureReferralStage.trim() ||
                            !closureReferralCourtName.trim() ||
                            !closureReferralCaseNumber.trim())) ||
                    (decisionRequiresDefendantScope(closureDecisionType) &&
                        shouldShowDefendantDecisionScopePicker(defendants) &&
                        !isPrivateRightWaiverDecisionValue(closureDecisionType) &&
                        closureDecisionType !== 'expiration' &&
                        closureDecisionType !== 'juvenile_severance_referral' &&
                        !(
                            closureSharedObjective269b &&
                            isCassationClosureQuashDecision(closureDecisionType)
                        ) &&
                        !closureScopedDefendantIds.length)
                }
                className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words"
            >
                {stageCloserReferralOnly ? 'حفظ أمر الإحالة' : 'حفظ القرار الختامي'}
            </button>
        </div>
    );
}
