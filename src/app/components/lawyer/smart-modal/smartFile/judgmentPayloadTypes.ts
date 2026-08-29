/** Payload from SmartJudgmentModal / validation pipeline. */
export type JudgmentPayload = {
    date?: string;
    type?: string;
    form?: string;
    decision?: string;
    action?: string;
    judgmentType?: string;
    judgmentForm?: string;
    judgmentDate?: string;
    notes?: string;
    nextStage?: string;
    openAppealTransitionModal?: boolean;
    openObjectionModal?: boolean;
    /** بعد حفظ الحكم يفتح نافذة تسجيل طعن الخصم */
    openRegisterOpponentAppealModal?: boolean;
    [key: string]: unknown;
};

export type AppealTransitionPayload = {
    appealType: string;
    appellant: string;
    filingDate: string;
    newCaseNumber: string;
    notes: string;
    includedOpponentPartyIds?: Array<number | string>;
    includedAppellantPartyIds?: Array<number | string>;
    appealDossierMode?: 'standard' | 'interpleader_appellant' | 'against_interpleader';
};

export type CrossAppealPayload = {
    filingDate: string;
    receiptNumber: string;
    notes: string;
    crossAppealPartyIds?: Array<number | string>;
};

export type StageTransitionPayload = {
    newStage: string;
    newCourt: string;
    newCaseNo: string;
    appellant: string;
    result: string;
    date: string;
    [key: string]: unknown;
};

export type SmartFileAttachment = {
    id?: string;
    isActive?: boolean;
    status?: string;
    attachedProperty?: string;
    judgmentSyncDate?: string;
    judgmentSyncNote?: string;
    [key: string]: unknown;
};
