export type DossierActionType =
    | 'delegation'
    | 'unify'
    | 'transfer'
    | 'renew'
    | 'inaba_correspondence';

export interface DossierActionPayload {
    actionType: DossierActionType;
    delegationTargetDirectorate?: string;
    delegationPurpose?: string;
    unificationTargetType?: 'own' | 'colleague';
    unificationTargetId?: string;
    unificationColleagueToken?: string;
    unificationTargetMeta?: { directorate?: string; fileNumber?: string; fileYear?: string };
    transferTargetDirectorate?: string;
    transferReason?: string;
    renewalReason?: string;
    inabaCorrespondenceSubFileId?: string;
    inabaCorrespondenceDirectorate?: string;
    inabaCorrespondenceSubject?: string;
}
