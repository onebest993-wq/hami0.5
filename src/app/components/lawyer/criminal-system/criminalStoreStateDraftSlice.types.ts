/** Draft & party session actions — slice of CriminalStoreState */
import type {
    CriminalCaseDraft,
    CriminalCaseLocation,
    DefendantAgeCategory,
    SocialInquiryReport,
} from './criminalCaseModel';
import type { GuarantorDetails } from './criminalGuarantorModel';
import type { RevealDefendantIdentityPayload } from './criminalUnknownDefendant';

export type CriminalStoreStateDraftActions = {
    setSessionOwnerLawyerId: (lawyerId: string | null) => void;
    /** يختم الأضابير التراثية بلا مالك باسم محامي الجلسة. */
    claimUnownedCasesForSession: (lawyerId: string) => number;
    /** تملّك إضبارة تراثية بلا مالك — بإجراء صريح من المحامي. */
    claimCriminalCaseOwnership: (caseId: string) => string | null;
    setBasicField: <K extends keyof CriminalCaseDraft['basics']>(
    key: K,
    value: CriminalCaseDraft['basics'][K],
    ) => void;
    setLocationField: <K extends keyof CriminalCaseLocation>(key: K, value: CriminalCaseLocation[K]) => void;
    addComplainant: () => void;
    deleteComplainant: (id: string) => void;
    setComplainantField: (
    id: string,
    key:
    | 'fullName'
    | 'address'
    | 'phone'
    | 'isJuvenile'
    | 'isUnderSeven'
    | 'birthDate'
    | 'guardianName'
    | 'guardianRelationship',
    value: string | boolean,
    ) => void;
    toggleDraftComplainantOfficeClient: (id: string, next: boolean) => void;
    /** ربط يدوي: شكوى المشتكي ضد متهمين محددين (أو الجميع عند `[]`). `undefined` = بدون توجيه متقابل. */
    setDraftComplainantCounterComplaintTargets: (
    complainantId: string,
    targetDefendantIds: string[] | undefined,
    ) => void;
    updateCaseComplainantJuvenile: (
    caseId: string,
    complainantId: string,
    data: { isJuvenile?: boolean; birthDate?: string; guardianName?: string; guardianRelationship?: string },
    ) => void;
    setUnknownDefendant: (value: boolean) => void;
    addUnknownDefendant: () => void;
    toggleDraftDefendantIdentityUnknown: (defendantId: string, unknown: boolean) => void;
    revealDefendantIdentity: (
    caseId: string,
    defendantId: string,
    payload: RevealDefendantIdentityPayload,
    ) => string | null;
    addDefendant: () => void;
    deleteDefendant: (id: string) => void;
    setDefendantField: (
    id: string,
    key:
    | 'fullName'
    | 'address'
    | 'birthYear'
    | 'status'
    | 'detentionAuthority'
    | 'detentionExpiryDate'
    | 'isJuvenile'
    | 'isUnderSeven'
    | 'birthDate'
    | 'guardianName'
    | 'guardianRelationship',
    value: string | boolean,
    ) => void;
    setDraftDefendantGuarantor: (
    defendantId: string,
    patch: Partial<GuarantorDetails> | null,
    ) => void;
    toggleDraftDefendantOfficeClient: (id: string, next: boolean) => void;
    updateCaseDefendantGuarantor: (caseId: string, defendantId: string, patch: Partial<GuarantorDetails>) => void;
    updateCaseDefendantJuvenile: (
    caseId: string,
    defendantId: string,
    data: { isJuvenile?: boolean; birthDate?: string; guardianName?: string; guardianRelationship?: string },
    ) => void;
    updateCaseDefendantAgeCategory: (
    caseId: string,
    defendantId: string,
    category: DefendantAgeCategory,
    ) => void;
    updateJuvenileSocialInquiryReport: (caseId: string, defendantId: string, report: SocialInquiryReport) => void;
};
