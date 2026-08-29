/**
 * Lawyer requests, detention decisions, judicial appeal lifecycle — split from criminalStoreRequestsActions.ts
 */
import type { StoreApi } from 'zustand';
import {
    ensureStageJourneyOnCase,
} from './criminalStorePersistSupport';
import type {
    JudicialDecision,
} from '@/app/types/criminal';
import {
    resolveProceduralDefendantIds,
} from './criminalProceduralPartyUtils';
import {
    caseMutationBlocked,
} from './criminalCaseMutationPolicy';
import { isCriminalCaseMutationBlocked } from './criminalCaseMutationGuard';
import {
    createCriminalId as createId,
} from './criminalIdUtils';
import type {
    CriminalCase,
    DefendantStatus,
    LawyerRequest,
    TimelineEvent,
} from './criminalCaseModel';
import type { GuarantorPerson } from './criminalGuarantorModel';
import type { SeizedAsset } from './criminalSeizedAssetModel';
import {
    resolveCaseStageFromRecord,
} from './criminalStageRuntimeCore';
import {
    coalesceJudicialDecisions,
    findJudicialDecisionByRef,
    findJudicialDecisionStoreIndex,
} from './judicialDecisionsEngine';
import {
    requiresInvestigationPurgeDefendantScope,
    resolveInvestigationClosureDefendantIds,
} from './investigationDefendantPurge';
import {
    filterUnknownDefendantsFromPartyIds,
    UNKNOWN_DEFENDANT_ACTION_BLOCKED_MESSAGE,
} from './criminalUnknownDefendant';
import {
    isDefendantTargetRequestTemplate,
} from './requestPartySelection';
import {
    isLawyerRequestPending,
} from './lawyerRequestStatusMachine';
import {
    stripLawyerRequestDecisionPatch,
    validateCreateLawyerRequestInput,
    validateFinalizeLawyerRequestInput,
} from './lawyerRequestsEngine';
import {
    buildInitialOrderEnforcement,
} from './orderEnforcementEngine';
import {
    validateDetentionExtensionEnd,
} from './detentionEngine';
import {
    isDetentionDecisionTemplate,
    isInvestigationSeveranceJudicialTemplate,
    isJudicialDecisionTemplate,
    resolveStoredRequestTypeFields,
} from './proceduralRequestTypes';
import {
    declareJudicialDecisionFinalOnCase,
    fileJudicialDecisionAppealOnCase,
    recordJudicialAppealResultOnCases,
} from './criminalJudicialAppealMutations';
import {
    resolveCurrentJourneyNodeId,
} from './stageJourneyRuntimeCore';
import {
    appendCaseTrashItem,
    applyLawyerRequestOutcomeOnCase,
    caseMaterialProcedureBlocked,
    cassationAppealMutationBlocked,
    filterOutJudicialDecisionsForRequest,
    findOpenDetentionHistoryIndex,
    patchDetentionDecisionOnCase,
    patchOrderEnforcementOnCase,
    readDetentionHistoryLog,
    readLawyerRequestDefendantIds,
    requiresDetentionAuthority,
    requiresDetentionExpiryDate,
    resolveDecisionPartyIds,
    resolveJudicialDecisionsForCase,
    stampProceduralNodeId,
    upsertJudicialDecisionOnCase,
} from './criminalStoreCaseTransforms';
import type { CriminalStoreState } from './criminalStoreState.types';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalDetentionDecisionActions(set: SetFn, get: GetFn): Partial<CriminalStoreState> {
    return {
        extendDetentionOnDecision: (caseId, decisionId, newEndDate) => {
            const target = get().casesById[caseId] as CriminalCase | undefined;
            if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, get().sessionOwnerLawyerId)) return 'تعذّر تحديث التوقيف.';
            const merged = resolveJudicialDecisionsForCase(target);
            const hit = merged.find((d) => d.id === decisionId || `jd_${d.sourceRequestId}` === decisionId);
            if (!hit || !isDetentionDecisionTemplate(hit.proceduralTemplate ?? hit.title)) {
                return 'قرار التوقيف غير موجود.';
            }
            if (hit.detentionReleasedAt) return 'البطاقة مغلقة — تم توثيق إطلاق السراح.';
            const err = validateDetentionExtensionEnd(String(hit.detentionEndDate ?? ''), newEndDate);
            if (err) return err;
            const end = String(newEndDate).trim();
            set((state) => {
                const t = state.casesById[caseId] as CriminalCase | undefined;
                if (!t) return state;
                const patched = patchDetentionDecisionOnCase(t, decisionId, { detentionEndDate: end }, hit);
                if (!patched) return state;
                const partyIds = resolveDecisionPartyIds(hit, patched);
                const nextDefendants =
                    partyIds.length && Array.isArray(patched.defendants)
                        ? patched.defendants.map((d) =>
                              partyIds.includes(d.id) ? { ...d, detentionExpiryDate: end } : d,
                          )
                        : patched.defendants;
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...patched, defendants: nextDefendants },
                    },
                };
            });
            return null;
        },
        documentDetentionReleaseOnDecision: (caseId, decisionId) => {
            const target = get().casesById[caseId] as CriminalCase | undefined;
            if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, get().sessionOwnerLawyerId)) return 'تعذّر توثيق إطلاق السراح.';
            const merged = resolveJudicialDecisionsForCase(target);
            const hit = merged.find((d) => d.id === decisionId || `jd_${d.sourceRequestId}` === decisionId);
            if (!hit) return 'قرار التوقيف غير موجود.';
            if (hit.detentionReleasedAt) return null;
            const partyIds = resolveDecisionPartyIds(hit, target);
            if (!partyIds.length) return 'حدد المتهم المرتبط بالتوقيف.';
            const releasedAt = new Date().toISOString().slice(0, 10);
            set((state) => {
                const t = state.casesById[caseId] as CriminalCase | undefined;
                if (!t) return state;
                let next = patchDetentionDecisionOnCase(t, decisionId, { detentionReleasedAt: releasedAt }, hit);
                if (!next) return state;
                const resolvedIds = resolveProceduralDefendantIds(
                    Array.isArray(next.complainants) ? next.complainants : [],
                    Array.isArray(next.defendants) ? next.defendants : [],
                    partyIds,
                    next.isMutualComplaint === true,
                );
                const nextDefendants = (Array.isArray(next.defendants) ? next.defendants : []).map((d) => {
                    if (!resolvedIds.includes(d.id)) return d;
                    const nextDef = { ...d, status: 'مكفل' as DefendantStatus };
                    if (!requiresDetentionAuthority(nextDef.status)) nextDef.detentionAuthority = '';
                    if (!requiresDetentionExpiryDate(nextDef.status)) nextDef.detentionExpiryDate = '';
                    return nextDef;
                });
                next = { ...next, defendants: nextDefendants };
                return { casesById: { ...state.casesById, [caseId]: next } };
            });
            return null;
        },
        updateOrderEnforcementOnDecision: (caseId, decisionId, patch) => {
            const target = get().casesById[caseId] as CriminalCase | undefined;
            if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, get().sessionOwnerLawyerId)) return 'تعذّر تحديث متابعة الأمر.';
            const merged = resolveJudicialDecisionsForCase(target);
            const hit = merged.find((d) => d.id === decisionId || `jd_${d.sourceRequestId}` === decisionId);
            if (!hit) return 'الأمر غير موجود في السجل.';
            set((state) => {
                const t = state.casesById[caseId] as CriminalCase | undefined;
                if (!t) return state;
                const patched = patchOrderEnforcementOnCase(t, decisionId, patch, hit);
                if (!patched) return state;
                return { casesById: { ...state.casesById, [caseId]: patched } };
            });
            return null;
        },
        releaseDefendantsFromDetention: (caseId, defendantIds) => {
            const target = get().casesById[caseId] as CriminalCase | undefined;
            if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, get().sessionOwnerLawyerId)) return 'تعذّر تحديث حالة المتهم.';
            const ids = defendantIds.map((x) => String(x ?? '').trim()).filter(Boolean);
            if (!ids.length) return 'حدد المتهم.';
            set((state) => {
                const t = state.casesById[caseId] as CriminalCase | undefined;
                if (!t) return state;
                const resolvedIds = resolveProceduralDefendantIds(
                    Array.isArray(t.complainants) ? t.complainants : [],
                    Array.isArray(t.defendants) ? t.defendants : [],
                    ids,
                    t.isMutualComplaint === true,
                );
                const nextDefendants = (Array.isArray(t.defendants) ? t.defendants : []).map((d) => {
                    if (!resolvedIds.includes(d.id)) return d;
                    const nextDef = { ...d, status: 'مكفل' as DefendantStatus };
                    if (!requiresDetentionAuthority(nextDef.status)) nextDef.detentionAuthority = '';
                    if (!requiresDetentionExpiryDate(nextDef.status)) nextDef.detentionExpiryDate = '';
                    return nextDef;
                });
                return { casesById: { ...state.casesById, [caseId]: { ...t, defendants: nextDefendants } } };
            });
            return null;
        }
    };
}
