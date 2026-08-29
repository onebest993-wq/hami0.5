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

export function createCriminalSessionDraftUnknownDefendantActions(set: SetFn, get: GetFn): Partial<CriminalStoreState> {
    return {
        setUnknownDefendant: (value) =>
            set((state) => {
                if (value) {
                    const current = Array.isArray(state.draft.defendants) ? state.draft.defendants : [];
                    const unknowns = current.filter((d) => isDefendantIdentityUnknown(d));
                    const identified = current.filter(
                        (d) => !isDefendantIdentityUnknown(d) && !isEmptyDefendantShell(d),
                    );
                    const juvenileCtx = inferUnknownDefendantJuvenileContext(current);
                    const nextUnknowns =
                        unknowns.length > 0
                            ? unknowns
                            : [
                                  makeUnknownIdentityDefendant(
                                      nextUnknownDefendantIndex(current),
                                      { isJuvenile: juvenileCtx },
                                  ),
                              ];
                    return {
                        draft: {
                            ...state.draft,
                            unknownDefendant: true,
                            defendants: [...identified, ...nextUnknowns],
                        },
                    };
                }
                const current = Array.isArray(state.draft.defendants) ? state.draft.defendants : [];
                const identified = current.filter((d) => !isDefendantIdentityUnknown(d));
                return {
                    draft: {
                        ...state.draft,
                        unknownDefendant: false,
                        defendants: identified.length ? identified : [makeEmptyDefendant()],
                    },
                };
            }),
        addUnknownDefendant: () =>
            set((state) => {
                const raw = Array.isArray(state.draft.defendants) ? state.draft.defendants : [];
                const juvenileCtx = inferUnknownDefendantJuvenileContext(raw);
                const next = [
                    ...raw,
                    makeUnknownIdentityDefendant(nextUnknownDefendantIndex(raw), {
                        isJuvenile: juvenileCtx,
                    }),
                ];
                const hasNamedIdentified = getIdentifiedDefendants(next).some((d) =>
                    resolveDefendantFullName(d),
                );
                let basics = state.draft.basics;
                if (!hasNamedIdentified && !isInvestigationStoredStage(String(basics.stage ?? '').trim())) {
                    basics = { ...basics, stage: 'مرحلة التحقيق' };
                }
                return {
                    draft: {
                        ...state.draft,
                        basics,
                        defendants: syncUnknownDefendantsJuvenileContext(
                            pruneEmptyDefendantShells(next),
                        ),
                        unknownDefendant: hasUnrevealedUnknownDefendants(next),
                    },
                };
            }),
        toggleDraftDefendantIdentityUnknown: (defendantId, unknown) =>
            set((state) => {
                const id = String(defendantId ?? '').trim();
                if (!id) return state;
                const raw = Array.isArray(state.draft.defendants) ? state.draft.defendants : [];
                const hit = raw.find((d) => d.id === id);
                if (!hit) return state;

                if (unknown) {
                    if (isDefendantIdentityUnknown(hit)) return state;
                    if (!canMarkDraftDefendantAsUnknown(raw, id)) return state;
                    const juvenileCtx = inferUnknownDefendantJuvenileContext(raw);
                    const idx = nextUnknownDefendantIndex(raw);
                    const next = raw.map((d) =>
                        d.id === id
                            ? convertIdentifiedDefendantToUnknown(d, idx, { isJuvenile: juvenileCtx })
                            : d,
                    );
                    return {
                        draft: {
                            ...state.draft,
                            defendants: syncUnknownDefendantsJuvenileContext(
                                pruneEmptyDefendantShells(next),
                            ),
                            unknownDefendant: hasUnrevealedUnknownDefendants(next),
                        },
                    };
                }

                if (!isDefendantIdentityUnknown(hit)) return state;
                const next = raw.map((d) =>
                    d.id === id ? convertUnknownDefendantToIdentifiedShell(d) : d,
                );
                return {
                    draft: {
                        ...state.draft,
                        defendants: next,
                        unknownDefendant: hasUnrevealedUnknownDefendants(next),
                    },
                };
            }),
        revealDefendantIdentity: (caseId, defendantId, payload) => {
            const errMsg = validateRevealDefendantIdentityPayload(payload);
            if (errMsg) return errMsg;
            let blockingError: string | null = null;
            set((state) => {
                const target = state.casesById[caseId] as CriminalCase | undefined;
                if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) {
                    blockingError = 'تعذّر كشف الهوية.';
                    return state;
                }
                const id = String(defendantId ?? '').trim();
                const defs = Array.isArray(target.defendants) ? target.defendants : [];
                if (!defs.some((d) => d.id === id)) {
                    blockingError = 'المتهم غير موجود في الإضبارة.';
                    return state;
                }
                const fullName = String(payload.fullName ?? '').trim();
                const revealIsUnderSeven = payload.isUnderSeven === true;
                const revealIsJuvenile = payload.isJuvenile === true && !revealIsUnderSeven;
                const nextDefendants = pruneEmptyDefendantShells(
                    defs.map((d) => {
                        if (d.id !== id) return normalizeDefendantPersonalFields(d);
                        const revealed: CriminalDefendant = {
                            ...d,
                            isIdentityUnknown: false,
                            fullName,
                            address: String(payload.address ?? d.address ?? '').trim(),
                            birthYear: String(payload.birthYear ?? d.birthYear ?? '').trim(),
                            isJuvenile: revealIsJuvenile,
                            isUnderSeven: revealIsUnderSeven,
                            birthDate:
                                payload.birthDate !== undefined
                                    ? String(payload.birthDate ?? '').trim()
                                    : d.birthDate,
                            guardianName:
                                payload.guardianName !== undefined
                                    ? String(payload.guardianName ?? '').trim()
                                    : d.guardianName,
                            guardianRelationship:
                                payload.guardianRelationship !== undefined
                                    ? String(payload.guardianRelationship ?? '').trim()
                                    : d.guardianRelationship,
                        };
                        if (revealIsUnderSeven) {
                            revealed.status = '';
                            revealed.detentionAuthority = '';
                            revealed.detentionExpiryDate = '';
                            revealed.guarantorDetails = undefined;
                            revealed.socialInquiryReport = undefined;
                        } else if (payload.status !== undefined) {
                            revealed.status = payload.status;
                        }
                        if (!revealIsJuvenile && !revealIsUnderSeven) {
                            revealed.guardianName = '';
                            revealed.guardianRelationship = '';
                            revealed.birthDate = '';
                            revealed.socialInquiryReport = undefined;
                        } else if (revealIsJuvenile) {
                            revealed.socialInquiryReport =
                                d.socialInquiryReport ?? {
                                    isAttached: false,
                                    workflowStatus: 'not_requested' as const,
                                    receivedDate: '',
                                    investigatorName: '',
                                    recommendations: '',
                                };
                        }
                        return normalizeDefendantPersonalFields(revealed);
                    }),
                );
                const nextCase = syncJuvenileInvestigationCaseFlags(
                    syncUnknownDefendantCaseFlag(
                        { ...target, defendants: nextDefendants },
                        nextDefendants,
                    ),
                );
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: nextCase,
                    },
                };
            });
            return blockingError;
        }
    };
}
