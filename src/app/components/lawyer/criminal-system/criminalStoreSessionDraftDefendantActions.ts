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
import { createCriminalSessionDraftUnknownDefendantActions } from './criminalStoreSessionDraftUnknownDefendantActions';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalSessionDraftDefendantActions(set: SetFn, get: GetFn): Partial<CriminalStoreState> {
    return {
        ...createCriminalSessionDraftUnknownDefendantActions(set, get),
        addDefendant: () =>
            set((state) => ({
                draft: {
                    ...state.draft,
                    defendants: [...state.draft.defendants, makeEmptyDefendant()],
                },
            })),
        deleteDefendant: (id) =>
            set((state) => {
                const list = Array.isArray(state.draft.defendants) ? state.draft.defendants : [];
                if (list.length <= 1) return state;
                const next = list.filter((d) => d.id !== id);
                if (next.length === list.length) return state;
                const prunedComplainants = pruneCounterComplaintTargetsAfterPartyRemoval(
                    state.draft.complainants,
                    id,
                );
                return {
                    draft: syncDraftOfficeRepresentation({
                        ...state.draft,
                        complainants: prunedComplainants,
                        unknownDefendant: hasUnrevealedUnknownDefendants(next),
                        defendants: next.length ? next : [makeEmptyDefendant()],
                    }),
                };
            }),
        toggleDraftDefendantOfficeClient: (id, next) =>
            set((state) => ({
                draft: applyDefendantOfficeClientToggle(state.draft, id, next),
            })),
        setDefendantField: (id, key, value) =>
            set((state) => {
                const nextDefendants = state.draft.defendants.map((d) => {
                    if (d.id !== id) return d;
                    const nextDefendant = { ...d, [key]: value };
                    if (key === 'status' && !requiresDetentionAuthority(nextDefendant.status)) {
                        nextDefendant.detentionAuthority = '';
                    }
                    if (key === 'status' && !requiresDetentionExpiryDate(nextDefendant.status)) {
                        nextDefendant.detentionExpiryDate = '';
                    }
                    if (key === 'status') {
                        const st = String(value ?? '').trim();
                        if (st === 'مكفل' && !nextDefendant.guarantorDetails) {
                            nextDefendant.guarantorDetails = makeEmptyGuarantorDetails();
                        } else if (st !== 'مكفل') {
                            nextDefendant.guarantorDetails = undefined;
                        }
                    }
                    return nextDefendant;
                });
                return {
                    draft: {
                        ...state.draft,
                        defendants: syncUnknownDefendantsJuvenileContext(nextDefendants),
                    },
                };
            }),
        setDraftDefendantGuarantor: (defendantId, patch) =>
            set((state) => {
                const id = String(defendantId ?? '').trim();
                if (!id) return state;
                const nextDefendants = state.draft.defendants.map((d) => {
                    if (d.id !== id) return d;
                    if (patch === null) return { ...d, guarantorDetails: undefined };
                    const current = normalizeGuarantorDetails(d.guarantorDetails) ?? makeEmptyGuarantorDetails();
                    const next: GuarantorDetails = { ...current, ...patch };
                    if (!next.bailAmount.trim() && !next.guarantorInfo.trim()) {
                        return { ...d, guarantorDetails: undefined };
                    }
                    return { ...d, guarantorDetails: next };
                });
                return { draft: { ...state.draft, defendants: nextDefendants } };
            }),
        updateCaseDefendantGuarantor: (caseId, defendantId, patch) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const id = String(defendantId ?? '').trim();
                if (!id) return state;
                const list = Array.isArray(target.defendants) ? target.defendants : [];
                const nextDefendants = list.map((d) => {
                    if (d.id !== id) return d;
                    const current = normalizeGuarantorDetails(d.guarantorDetails) ?? makeEmptyGuarantorDetails();
                    const next: GuarantorDetails = { ...current, ...patch };
                    if (!next.bailAmount.trim() && !next.guarantorInfo.trim()) {
                        return { ...d, guarantorDetails: undefined };
                    }
                    return { ...d, guarantorDetails: next };
                });
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, defendants: nextDefendants },
                    },
                };
            }),
        updateCaseDefendantJuvenile: (caseId, defendantId, data) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const list = Array.isArray(target.defendants) ? target.defendants : [];
                const hasTarget = list.some((d) => d.id === defendantId);
                if (!hasTarget) return state;

                const nextIsJuvenile = typeof data?.isJuvenile === 'boolean' ? data.isJuvenile : null;
                const nextBirthDate = typeof data?.birthDate === 'string' ? String(data.birthDate) : null;
                const nextGuardianName = typeof data?.guardianName === 'string' ? String(data.guardianName) : null;
                const nextGuardianRelationship =
                    typeof data?.guardianRelationship === 'string'
                        ? String(data.guardianRelationship)
                        : null;

                const next = list.map((d) => {
                    if (d.id !== defendantId) return d;
                    const patched: CriminalDefendant = {
                        ...d,
                        isJuvenile: nextIsJuvenile === null ? Boolean(d.isJuvenile) : nextIsJuvenile,
                        birthDate: nextBirthDate === null ? String(d.birthDate ?? '') : nextBirthDate,
                        guardianName: nextGuardianName === null ? String(d.guardianName ?? '') : nextGuardianName,
                        guardianRelationship:
                            nextGuardianRelationship === null
                                ? String(d.guardianRelationship ?? '')
                                : nextGuardianRelationship,
                    };
                    if (nextIsJuvenile === false) {
                        patched.guardianName = '';
                        patched.guardianRelationship = '';
                        patched.birthDate = '';
                        patched.socialInquiryReport = undefined;
                    }
                    if (
                        nextIsJuvenile === true &&
                        requiresDetentionAuthority(patched.status) &&
                        !String(patched.detentionAuthority ?? '').trim()
                    ) {
                        patched.detentionAuthority = investigationJuvenileDetentionAuthorityLabel();
                    }
                    return patched;
                });

                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: syncJuvenileInvestigationCaseFlags({ ...target, defendants: next }),
                    },
                };
            }),
        updateCaseDefendantAgeCategory: (caseId, defendantId, category) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const list = Array.isArray(target.defendants) ? target.defendants : [];
                const hit = list.find((d) => d.id === defendantId);
                if (!hit || isDefendantIdentityUnknown(hit)) return state;

                const next = list.map((d) => {
                    if (d.id !== defendantId) return d;
                    if (category === 'adult') {
                        return {
                            ...d,
                            isJuvenile: false,
                            isUnderSeven: false,
                            guardianName: '',
                            guardianRelationship: '',
                            birthDate: '',
                            socialInquiryReport: undefined,
                        };
                    }
                    if (category === 'juvenile') {
                        const patched: CriminalDefendant = {
                            ...d,
                            isJuvenile: true,
                            isUnderSeven: false,
                        };
                        if (
                            requiresDetentionAuthority(patched.status) &&
                            !String(patched.detentionAuthority ?? '').trim()
                        ) {
                            patched.detentionAuthority = investigationJuvenileDetentionAuthorityLabel();
                        }
                        return patched;
                    }
                    return {
                        ...d,
                        isUnderSeven: true,
                        isJuvenile: false,
                        status: '' as DefendantStatus,
                        detentionAuthority: '',
                        detentionExpiryDate: '',
                        guarantorDetails: undefined,
                        guardianName: '',
                        guardianRelationship: '',
                        birthDate: '',
                        socialInquiryReport: undefined,
                    };
                });

                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: syncJuvenileInvestigationCaseFlags({ ...target, defendants: next }),
                    },
                };
            }),
        updateJuvenileSocialInquiryReport: (caseId, defendantId, report) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const list = Array.isArray(target.defendants) ? target.defendants : [];
                const hasTarget = list.some((d) => d.id === defendantId);
                if (!hasTarget) return state;
                const next = list.map((d) => {
                    if (d.id !== defendantId) return d;
                    if (!d.isJuvenile) return d;
                    const isAttached = report.isAttached === true;
                    const receivedDate =
                        typeof report.receivedDate === 'string' ? String(report.receivedDate) : '';
                    const investigatorName =
                        typeof report.investigatorName === 'string'
                            ? String(report.investigatorName)
                            : '';
                    const recommendations =
                        typeof report.recommendations === 'string'
                            ? String(report.recommendations)
                            : '';
                    const workflowRaw = String(report.workflowStatus ?? '').trim();
                    const workflowStatus: SocialInquiryWorkflowStatus | undefined = isValidSocialInquiryWorkflowStatus(
                        workflowRaw,
                    )
                        ? workflowRaw
                        : isAttached
                          ? 'submitted'
                          : undefined;
                    const attached = workflowStatus === 'submitted' || isAttached;
                    const nextReport: SocialInquiryReport = {
                        workflowStatus: workflowStatus ?? (attached ? 'submitted' : 'not_requested'),
                        isAttached: attached,
                        receivedDate: receivedDate.trim() ? receivedDate : undefined,
                        investigatorName: investigatorName.trim() ? investigatorName : undefined,
                        recommendations: recommendations.trim() ? recommendations : undefined,
                    };
                    return { ...d, socialInquiryReport: nextReport };
                });
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, defendants: next },
                    },
                };
            })
    };
}
