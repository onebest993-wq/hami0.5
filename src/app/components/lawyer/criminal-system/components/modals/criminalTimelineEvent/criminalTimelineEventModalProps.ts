import type { CriminalCaseStage, CriminalDefendant, TimelineEvent } from '../../../criminalStore';


import {
    type CriminalActionParty,
} from '../../../criminalStageUtils';



export type CriminalTimelineEventModalProps = {
    isOpen: boolean;
    caseId: string;
    stage: string;
    isUnknownPerpetrator: boolean;
    isInvestigation: boolean;
    isCourtStage: boolean;
    isTrialCourtStage: boolean;
    isCassationStage: boolean;
    defendants: CriminalDefendant[];
    actionParties: CriminalActionParty[];
    isMutualComplaint: boolean;
    onClose: () => void;
    addTimelineEvent: (caseId: string, event: TimelineEvent) => void;
    updateCaseStage: (caseId: string, stage: CriminalCaseStage) => void;
    onError: () => void;
};
