/**
 * Session ownership + draft / party mutation actions — extracted from criminalStore.ts
 * for maintainability. Keep side-effect-free relative to other store slices.
 */
import type { StoreApi } from 'zustand';
import type {
    CriminalCase,
    CriminalCaseStage,
    CriminalComplainant,
    CriminalDefendant,
    DefendantStatus,
    SocialInquiryReport,
    SocialInquiryWorkflowStatus,
} from './criminalCaseModel';
import { makeEmptyComplainant, makeEmptyLocation } from './criminalCaseDraftFactory';
import { makeEmptyDefendant } from './criminalDefendantFactory';
import {
    makeEmptyGuarantorDetails,
    normalizeGuarantorDetails,
    type GuarantorDetails,
} from './criminalGuarantorModel';
import {
    isPublicRightComplainantName,
    makePublicRightComplainant,
} from './publicProsecutionGovernance';
import { type OurRepresentation } from './criminalProceduralPartyUtils';
import { legacyRoleFromRepresentation } from './criminalStageUtils';
import { isValidSocialInquiryWorkflowStatus } from './criminalStagePresentationCore';
import { claimOrphanCriminalCaseOwnership, claimUnownedCriminalCases } from './criminalCaseOwner';
import { caseMutationBlocked } from './criminalCaseMutationPolicy';
import { normalizeDefendantPersonalFields } from './criminalStorePersistSupport';
import {
    pruneCounterComplaintTargetsAfterPartyRemoval,
    requiresDetentionAuthority,
    requiresDetentionExpiryDate,
} from './criminalStoreCaseTransforms';
import { isInvestigationStoredStage } from './criminalStageRuntimeCore';
import {
    investigationJuvenileDetentionAuthorityLabel,
    syncJuvenileInvestigationCaseFlags,
} from './juvenileInvestigationRules';
import {
    applyComplainantOfficeClientToggle,
    applyDefendantOfficeClientToggle,
    syncDraftOfficeRepresentation,
} from './criminalOfficeClient';
import {
    canMarkDraftDefendantAsUnknown,
    convertIdentifiedDefendantToUnknown,
    convertUnknownDefendantToIdentifiedShell,
    getIdentifiedDefendants,
    hasUnrevealedUnknownDefendants,
    inferUnknownDefendantJuvenileContext,
    isDefendantIdentityUnknown,
    isEmptyDefendantShell,
    makeUnknownIdentityDefendant,
    nextUnknownDefendantIndex,
    pruneEmptyDefendantShells,
    resolveDefendantFullName,
    syncUnknownDefendantCaseFlag,
    syncUnknownDefendantsJuvenileContext,
    validateRevealDefendantIdentityPayload,
} from './criminalUnknownDefendant';
import type { CriminalStoreState } from './criminalStoreState.types';
import { createCriminalSessionDraftComplainantActions } from './criminalStoreSessionDraftComplainantActions';
import { createCriminalSessionDraftDefendantActions } from './criminalStoreSessionDraftDefendantActions';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalSessionDraftActions(set: SetFn, get: GetFn): Partial<CriminalStoreState> {
    return {
        setSessionOwnerLawyerId: (lawyerId) => {
            const next = String(lawyerId ?? '').trim() || null;
            if (get().sessionOwnerLawyerId === next) return;
            set({ sessionOwnerLawyerId: next });
        },
        claimUnownedCasesForSession: (lawyerId) => {
            const uid = String(lawyerId ?? '').trim();
            if (!uid) return 0;
            const { next, claimedIds } = claimUnownedCriminalCases(get().casesById, uid);
            if (!claimedIds.length) return 0;
            set({ casesById: next, sessionOwnerLawyerId: uid });
            return claimedIds.length;
        },
        claimCriminalCaseOwnership: (caseId) => {
            const uid = String(get().sessionOwnerLawyerId ?? '').trim();
            if (!uid) return 'يجب تسجيل الدخول كمحامٍ لتملّك الإضبارة.';
            const target = get().casesById[caseId];
            if (!target) return 'الإضبارة غير موجودة.';
            const claimed = claimOrphanCriminalCaseOwnership(target, uid);
            if (!claimed) return 'لا يمكن تملّك هذه الإضبارة — لها مالك مسجّل أو الجلسة غير معروفة.';
            set((state) => ({
                casesById: { ...state.casesById, [caseId]: claimed },
            }));
            return null;
        },
        setBasicField: (key, value) =>
            set((state) => {
                if (key === 'ourRepresentation') {
                    const rep = value as OurRepresentation | '';
                    return {
                        draft: {
                            ...state.draft,
                            basics: {
                                ...state.draft.basics,
                                ourRepresentation: rep,
                                role: legacyRoleFromRepresentation(rep),
                            },
                        },
                    };
                }
                if (key !== 'stage') {
                    return { draft: { ...state.draft, basics: { ...state.draft.basics, [key]: value } } };
                }
                const nextStage = value as CriminalCaseStage | '';
                const nextLocation = makeEmptyLocation();
                return {
                    draft: {
                        ...state.draft,
                        basics: { ...state.draft.basics, stage: nextStage },
                        location: nextLocation,
                    },
                };
            }),
        setLocationField: (key, value) =>
            set((state) => ({
                draft: { ...state.draft, location: { ...state.draft.location, [key]: value } },
            })),
        setDraftArticle3Offense: (value) =>
            set((state) => ({
                draft: {
                    ...state.draft,
                    isArticle3Offense: value === true,
                    crimeDiscoveryDate: value === true ? String(state.draft.crimeDiscoveryDate ?? '') : '',
                },
            })),
        setDraftMutualComplaint: (value) =>
            set((state) => {
                if (state.draft.isPublicProsecutionComplainant === true) return state;
                const mutual = value === true;
                const complainants = (Array.isArray(state.draft.complainants)
                    ? state.draft.complainants
                    : []
                ).map((c) => {
                    const {
                        counterComplaintTargetDefendantIds: _targets,
                        isCrossComplaint: _cross,
                        ...rest
                    } = c;
                    return rest;
                });
                return {
                    draft: {
                        ...state.draft,
                        isMutualComplaint: mutual,
                        complainants,
                    },
                };
            }),
        setDraftPublicProsecutionComplainant: (value) =>
            set((state) => {
                const enabled = value === true;
                if (!enabled) {
                    const onlyPublic =
                        state.draft.complainants.length === 1 &&
                        isPublicRightComplainantName(state.draft.complainants[0]?.fullName);
                    return {
                        draft: {
                            ...state.draft,
                            isPublicProsecutionComplainant: false,
                            complainants: onlyPublic
                                ? [makeEmptyComplainant()]
                                : state.draft.complainants,
                        },
                    };
                }
                return {
                    draft: {
                        ...state.draft,
                        isPublicProsecutionComplainant: true,
                        articleIncludesPublicRight: false,
                        isMutualComplaint: false,
                        complainants: [makePublicRightComplainant()],
                    },
                };
            }),
        setDraftArticleIncludesPublicRight: (value) =>
            set((state) => {
                if (state.draft.isPublicProsecutionComplainant === true) return state;
                return {
                    draft: {
                        ...state.draft,
                        articleIncludesPublicRight: value === true,
                    },
                };
            }),
        setDraftCrimeDiscoveryDate: (value) =>
            set((state) => ({
                draft: {
                    ...state.draft,
                    crimeDiscoveryDate: String(value ?? ''),
                },
            })),
        ...createCriminalSessionDraftComplainantActions(set, get),
        ...createCriminalSessionDraftDefendantActions(set, get),
    };
}
