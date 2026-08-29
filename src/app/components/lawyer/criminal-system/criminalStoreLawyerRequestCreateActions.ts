/**
 * إنشاء طلب محامي — مُستخرَج من criminalStoreLawyerRequestActions.ts
 */
import type { StoreApi } from 'zustand';
import { ensureStageJourneyOnCase } from './criminalStorePersistSupport';
import { caseMutationBlocked } from './criminalCaseMutationPolicy';
import { isCriminalCaseMutationBlocked } from './criminalCaseMutationGuard';
import { createCriminalId as createId } from './criminalIdUtils';
import type { CriminalCase, LawyerRequest } from './criminalCaseModel';
import { resolveCaseStageFromRecord } from './criminalStageRuntimeCore';
import {
    requiresInvestigationPurgeDefendantScope,
    resolveInvestigationClosureDefendantIds,
} from './investigationDefendantPurge';
import {
    filterUnknownDefendantsFromPartyIds,
    UNKNOWN_DEFENDANT_ACTION_BLOCKED_MESSAGE,
} from './criminalUnknownDefendant';
import { isDefendantTargetRequestTemplate } from './requestPartySelection';
import { validateCreateLawyerRequestInput, type CreateLawyerRequestInput } from './lawyerRequestsEngine';
import { buildInitialOrderEnforcement } from './orderEnforcementEngine';
import {
    isInvestigationSeveranceJudicialTemplate,
    isJudicialDecisionTemplate,
    resolveStoredRequestTypeFields,
} from './proceduralRequestTypes';
import { applyLawyerRequestOutcomeOnCase, stampProceduralNodeId } from './criminalStoreCaseTransforms';
import { resolveCurrentJourneyNodeId } from './stageJourneyRuntimeCore';
import type { CriminalStoreState } from './criminalStoreState.types';
import { applyAssetSeizureFromJudicialRequest } from './criminalStoreLawyerRequestAssetSeizureApply';
import {
    buildAssetSeizurePayload,
    buildDefendantBailPayload,
} from './criminalStoreLawyerRequestCreatePayload';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalLawyerRequestCreateActions(set: SetFn, get: GetFn) {
    return {
        createLawyerRequest: (caseId: string, input: CreateLawyerRequestInput) => {
            const err = validateCreateLawyerRequestInput(input);
            if (err) return { error: err, requestId: null };
            const target = get().casesById[caseId] as CriminalCase | undefined;
            if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, get().sessionOwnerLawyerId)) {
                return { error: 'تعذّر تسجيل الطلب.', requestId: null };
            }
            const resolved = resolveStoredRequestTypeFields(
                input.proceduralTemplate,
                String(input.customTypeName ?? ''),
                input.isAppealable === true,
            );
            const detentionStart = String(input.detentionStartDate ?? '').trim();
            const detentionEnd = String(input.detentionEndDate ?? '').trim();
            const requestDate = String(input.requestDate).trim();
            const lawyerNote = String(input.lawyerNote).trim();
            const isJudicial = isJudicialDecisionTemplate(resolved.proceduralTemplate);
            if (isInvestigationSeveranceJudicialTemplate(resolved.proceduralTemplate)) {
                return {
                    error: 'قرار تفريق الإضبارة يُكمَّل عبر مسار شطر الإضبارة — اختر المتهمين ثم «تنفيذ التفريق وإنشاء الإضبارة».',
                    requestId: null,
                };
            }
            const requestedPartyIds = filterUnknownDefendantsFromPartyIds(
                target.defendants,
                input.defendantIds,
            );
            if (
                Array.isArray(input.defendantIds) &&
                input.defendantIds.length > requestedPartyIds.length &&
                isDefendantTargetRequestTemplate(resolved.proceduralTemplate)
            ) {
                return { error: UNKNOWN_DEFENDANT_ACTION_BLOCKED_MESSAGE, requestId: null };
            }
            if (
                isJudicial &&
                requiresInvestigationPurgeDefendantScope(resolved.proceduralTemplate) &&
                resolveCaseStageFromRecord(target) === 'investigation'
            ) {
                const purgeIds = resolveInvestigationClosureDefendantIds(target, {
                    id: 'pending',
                    requestDate,
                    type: resolved.type,
                    lawyerNote,
                    status: 'executed',
                    defendantIds: requestedPartyIds,
                    proceduralTemplate: resolved.proceduralTemplate,
                });
                if (!purgeIds.length) {
                    return {
                        error: 'حدّد متهماً واحداً على الأقل مشمولاً بقرار الغلق/الصلح/التفريق.',
                        requestId: null,
                    };
                }
            }
            const legalArticleBasis = String(input.legalArticleBasis ?? '').trim() || undefined;
            const orderEnforcement = buildInitialOrderEnforcement(
                resolved.proceduralTemplate,
                legalArticleBasis ?? '',
                input.enforcementKind,
            );
            const defendantBailPayload = buildDefendantBailPayload(input.defendantBail);
            const assetSeizurePayload = buildAssetSeizurePayload(input.assetSeizure);
            const request: LawyerRequest = {
                id: createId(),
                requestDate,
                type: resolved.type,
                lawyerNote,
                status: isJudicial ? 'executed' : 'pending',
                defendantIds: requestedPartyIds.length ? requestedPartyIds : undefined,
                proceduralTemplate: resolved.proceduralTemplate,
                isAppealable: resolved.isAppealable,
                detentionStartDate: detentionStart || undefined,
                detentionEndDate: detentionEnd || undefined,
                legalArticleBasis: orderEnforcement?.legalArticleBasis ?? legalArticleBasis,
                orderEnforcement,
                referredCourtName: String(input.referredCourtName ?? '').trim() || undefined,
                defendantBail: defendantBailPayload,
                assetSeizure: assetSeizurePayload,
                ...(isJudicial
                    ? {
                          isLocked: true,
                          decisionArchived: true,
                          judgeMargin: lawyerNote,
                          decisionDate: requestDate,
                      }
                    : {}),
            };
            if (isJudicial) {
                set((state) => {
                    const t = ensureStageJourneyOnCase(state.casesById[caseId] as CriminalCase);
                    if (!t) return state;
                    const nodeId = resolveCurrentJourneyNodeId(t.stageJourney);
                    const stamped = stampProceduralNodeId(request, nodeId);
                    const reqs = Array.isArray(t.lawyerRequests) ? t.lawyerRequests : [];
                    let nextCase = applyLawyerRequestOutcomeOnCase(
                        { ...t, lawyerRequests: [...reqs, stamped] },
                        stamped,
                    );
                    if (assetSeizurePayload) {
                        nextCase = applyAssetSeizureFromJudicialRequest(nextCase, stamped, assetSeizurePayload);
                    }
                    return { casesById: { ...state.casesById, [caseId]: nextCase } };
                });
            } else {
                get().addOrUpdateRequest(caseId, request);
            }
            return { error: null, requestId: request.id };
        },
    };
}
