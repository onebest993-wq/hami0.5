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
import { claimUnownedCriminalCases } from './criminalCaseOwner';
import { caseMutationBlocked } from './criminalCaseMutationPolicy';
import { isCriminalCaseMutationBlocked } from './criminalCaseMutationGuard';
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

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalSessionDraftComplainantActions(set: SetFn, get: GetFn) {
    return {
        addComplainant: () =>
            set((state) => ({
                draft: { ...state.draft, complainants: [...state.draft.complainants, makeEmptyComplainant()] },
            })),
        deleteComplainant: (id) =>
            set((state) => {
                const list = Array.isArray(state.draft.complainants) ? state.draft.complainants : [];
                if (list.length <= 1) return state;
                const next = list.filter((c) => c.id !== id);
                if (next.length === list.length) return state;
                const pruned = pruneCounterComplaintTargetsAfterPartyRemoval(next, id);
                return {
                    draft: syncDraftOfficeRepresentation({
                        ...state.draft,
                        complainants: pruned.length ? pruned : [makeEmptyComplainant()],
                    }),
                };
            }),
        toggleDraftComplainantOfficeClient: (id, next) =>
            set((state) => ({
                draft: applyComplainantOfficeClientToggle(state.draft, id, next),
            })),
        setDraftComplainantCounterComplaintTargets: (complainantId, targetDefendantIds) =>
            set((state) => {
                const cid = String(complainantId ?? '').trim();
                if (!cid) return state;
                return {
                    draft: {
                        ...state.draft,
                        complainants: state.draft.complainants.map((c) =>
                            c.id === cid
                                ? {
                                      ...c,
                                      counterComplaintTargetDefendantIds:
                                          targetDefendantIds === undefined
                                              ? undefined
                                              : (Array.isArray(targetDefendantIds)
                                                    ? targetDefendantIds
                                                    : []
                                                )
                                                      .map((id) => String(id ?? '').trim())
                                                      .filter(Boolean),
                                  }
                                : c,
                        ),
                    },
                };
            }),
        setComplainantField: (id, key, value) =>
            set((state) => ({
                draft: {
                    ...state.draft,
                    complainants: state.draft.complainants.map((c) => (c.id === id ? { ...c, [key]: value } : c)),
                },
            })),
        updateCaseComplainantJuvenile: (caseId, complainantId, data) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const list = Array.isArray(target.complainants) ? target.complainants : [];
                const hasTarget = list.some((c) => c.id === complainantId);
                if (!hasTarget) return state;

                const nextIsJuvenile = typeof data?.isJuvenile === 'boolean' ? data.isJuvenile : null;
                const nextBirthDate = typeof data?.birthDate === 'string' ? String(data.birthDate) : null;
                const nextGuardianName = typeof data?.guardianName === 'string' ? String(data.guardianName) : null;
                const nextGuardianRelationship =
                    typeof data?.guardianRelationship === 'string'
                        ? String(data.guardianRelationship)
                        : null;

                const next = list.map((c) => {
                    if (c.id !== complainantId) return c;
                    const patched: CriminalComplainant = {
                        ...c,
                        isJuvenile: nextIsJuvenile === null ? Boolean(c.isJuvenile) : nextIsJuvenile,
                        birthDate: nextBirthDate === null ? String(c.birthDate ?? '') : nextBirthDate,
                        guardianName: nextGuardianName === null ? String(c.guardianName ?? '') : nextGuardianName,
                        guardianRelationship:
                            nextGuardianRelationship === null
                                ? String(c.guardianRelationship ?? '')
                                : nextGuardianRelationship,
                    };
                    if (nextIsJuvenile === false) {
                        patched.guardianName = '';
                        patched.guardianRelationship = '';
                        patched.birthDate = '';
                    }
                    return patched;
                });

                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, complainants: next },
                    },
                };
            })
    };
}
