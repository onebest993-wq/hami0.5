import type { Dispatch, SetStateAction } from 'react';
import type { StageConclusion } from '../criminalStore';
import type { CriminalDefendant, SocialInquiryWorkflowStatus } from '../criminalCaseModel';
import type { StageCloserDecisionType } from '../orchestrators/criminalOrchestratorSliceTypes';
import { StageCloserDecisionContextSections } from './StageCloserDecisionContextSections';
import { StageCloserReferralFields } from './StageCloserReferralFields';
import { StageCloserClosureMetaFields } from './StageCloserClosureMetaFields';

export type StageCloserFormSectionsProps = {
    defendants: CriminalDefendant[];
    isCassationStage: boolean;
    juvenileAccused: boolean;
    firstJuvenileDefendant: CriminalDefendant | null;
    firstJuvenileSocialWorkflow: SocialInquiryWorkflowStatus;
    patchSocialInquiryReport: (patch: {
        workflowStatus?: SocialInquiryWorkflowStatus;
        isAttached?: boolean;
        receivedDate?: string;
        investigatorName?: string;
        recommendations?: string;
    }) => void;
    closureDecisionType: StageCloserDecisionType;
    closureExpirationReason: StageConclusion['expirationReason'] | '';
    setClosureExpirationReason: Dispatch<SetStateAction<StageConclusion['expirationReason'] | ''>>;
    closureExpirationCustomDetail: string;
    setClosureExpirationCustomDetail: Dispatch<SetStateAction<string>>;
    closureExpirationDefendantIds: string[];
    setClosureExpirationDefendantIds: Dispatch<SetStateAction<string[]>>;
    closureScopedDefendantIds: string[];
    setClosureScopedDefendantIds: Dispatch<SetStateAction<string[]>>;
    closureSharedObjective269b: boolean;
    setClosureSharedObjective269b: Dispatch<SetStateAction<boolean>>;
    closurePunishmentType: 'death' | 'life' | 'other';
    setClosurePunishmentType: Dispatch<SetStateAction<'death' | 'life' | 'other'>>;
    closureJuvenileSeverDefendantId: string;
    setClosureJuvenileSeverDefendantId: Dispatch<SetStateAction<string>>;
    closureReferralStage: 'محكمة الجنح' | 'محكمة الجنايات' | '';
    setClosureReferralStage: Dispatch<SetStateAction<'محكمة الجنح' | 'محكمة الجنايات' | ''>>;
    closureReferralCourtName: string;
    setClosureReferralCourtName: Dispatch<SetStateAction<string>>;
    closureReferralCaseNumber: string;
    setClosureReferralCaseNumber: Dispatch<SetStateAction<string>>;
    closureDate: string;
    setClosureDate: Dispatch<SetStateAction<string>>;
    closureDefendantStatus: StageConclusion['defendantStatusAtDecision'];
    setClosureDefendantStatus: Dispatch<SetStateAction<StageConclusion['defendantStatusAtDecision']>>;
    closureDetails: string;
    setClosureDetails: Dispatch<SetStateAction<string>>;
    isDecisionDefendantStatus: (
        v: string,
    ) => v is StageConclusion['defendantStatusAtDecision'];
};

export function StageCloserFormSections({
    defendants,
    isCassationStage,
    juvenileAccused,
    firstJuvenileDefendant,
    firstJuvenileSocialWorkflow,
    patchSocialInquiryReport,
    closureDecisionType,
    closureExpirationReason,
    setClosureExpirationReason,
    closureExpirationCustomDetail,
    setClosureExpirationCustomDetail,
    closureExpirationDefendantIds,
    setClosureExpirationDefendantIds,
    closureScopedDefendantIds,
    setClosureScopedDefendantIds,
    closureSharedObjective269b,
    setClosureSharedObjective269b,
    closurePunishmentType,
    setClosurePunishmentType,
    closureJuvenileSeverDefendantId,
    setClosureJuvenileSeverDefendantId,
    closureReferralStage,
    setClosureReferralStage,
    closureReferralCourtName,
    setClosureReferralCourtName,
    closureReferralCaseNumber,
    setClosureReferralCaseNumber,
    closureDate,
    setClosureDate,
    closureDefendantStatus,
    setClosureDefendantStatus,
    closureDetails,
    setClosureDetails,
    isDecisionDefendantStatus,
}: StageCloserFormSectionsProps) {
    return (
        <>
            <StageCloserDecisionContextSections
                defendants={defendants}
                juvenileAccused={juvenileAccused}
                firstJuvenileDefendant={firstJuvenileDefendant}
                firstJuvenileSocialWorkflow={firstJuvenileSocialWorkflow}
                patchSocialInquiryReport={patchSocialInquiryReport}
                closureDecisionType={closureDecisionType}
                closureExpirationReason={closureExpirationReason}
                setClosureExpirationReason={setClosureExpirationReason}
                closureExpirationCustomDetail={closureExpirationCustomDetail}
                setClosureExpirationCustomDetail={setClosureExpirationCustomDetail}
                closureExpirationDefendantIds={closureExpirationDefendantIds}
                setClosureExpirationDefendantIds={setClosureExpirationDefendantIds}
                closureScopedDefendantIds={closureScopedDefendantIds}
                setClosureScopedDefendantIds={setClosureScopedDefendantIds}
                closureSharedObjective269b={closureSharedObjective269b}
                setClosureSharedObjective269b={setClosureSharedObjective269b}
                closurePunishmentType={closurePunishmentType}
                setClosurePunishmentType={setClosurePunishmentType}
                closureJuvenileSeverDefendantId={closureJuvenileSeverDefendantId}
                setClosureJuvenileSeverDefendantId={setClosureJuvenileSeverDefendantId}
            />

            <StageCloserReferralFields
                closureDecisionType={closureDecisionType}
                closureReferralStage={closureReferralStage}
                setClosureReferralStage={setClosureReferralStage}
                closureReferralCourtName={closureReferralCourtName}
                setClosureReferralCourtName={setClosureReferralCourtName}
                closureReferralCaseNumber={closureReferralCaseNumber}
                setClosureReferralCaseNumber={setClosureReferralCaseNumber}
            />

            <StageCloserClosureMetaFields
                isCassationStage={isCassationStage}
                closureDate={closureDate}
                setClosureDate={setClosureDate}
                closureDefendantStatus={closureDefendantStatus}
                setClosureDefendantStatus={setClosureDefendantStatus}
                closureDetails={closureDetails}
                setClosureDetails={setClosureDetails}
                isDecisionDefendantStatus={isDecisionDefendantStatus}
            />
        </>
    );
}
