export type IncidentalType = 'joined' | 'counter' | 'thirdParty' | 'joinder_appeal' | 'counter_appeal';
export type IncidentalStatus = 'active' | 'resolved' | 'rejected';
export type ThirdPartyEntryMode = 'affiliative' | 'selfClaim';
export type IncidentalEntryDecision = 'pending' | 'accepted' | 'rejected';
export type AffiliationSide = 'plaintiff' | 'defendant';

export type IncidentalFileLink = {
    parentFileId: number;
    parentCaseNo: string;
    incidentalId: string;
    type: 'joined' | 'counter';
    filingPartyId?: string;
    filingPartyName?: string;
    opposingPartyId?: string;
    opposingPartyName?: string;
};

export interface IncidentalCase {
    id: string;
    type: IncidentalType;
    partyName: string;
    partyRole?: string;
    date: string;
    status: IncidentalStatus;
    details?: string;
    thirdPartyEntryMode?: ThirdPartyEntryMode;
    affiliationSide?: AffiliationSide;
    affiliationPartyId?: number | string;
    affiliationPartyName?: string;
    entryDecision?: IncidentalEntryDecision;
    linkedFileId?: number;
    linkedCaseNo?: string;
    linkedJudgmentOutcome?: string;
    parentFileId?: number;
    parentCaseNo?: string;
}
