/**
 * Trial verdict finalize / sync + initial hearing — extracted from criminalStoreTrialActions.
 */
import type { StoreApi } from 'zustand';
import {
    createCriminalId as createId,
} from './criminalIdUtils';
import type {
    CriminalCase,
    TimelineEvent,
} from './criminalCaseModel';
import type { TrialSession } from './trialSessionsEngine';
import {
    upsertVerdictCardFromConclusion,
} from './verdictCardsEngine';
import {
    computeAppealDeadline,
    normalizeTrialSessions,
    presenceTypeFromSession,
    validateTrialSessionIsoDate,
    prunePhantomScheduledTrialSessions,
    mapStageFinalKindToTrialOutcome,
    mapDecisionPresenceToTrialVerdictPresence,
} from './trialSessionsEngine';
import {
    resolveCaseStageFromRecord,
} from './criminalStageRuntimeCore';
import { rejectCriminalCaseMutation } from './criminalCaseMutationGuard';
import {
    applyPersonalStagesFromConclusion,
    buildTrialVerdictStageConclusion,
    caseMaterialProcedureBlocked,
    trialSessionsLocked,
} from './criminalStoreCaseTransforms';
import type { CriminalStoreState } from './criminalStoreState.types';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalTrialHearingActions(set: SetFn, _get: GetFn): Partial<CriminalStoreState> {
    return {
        finalizeTrialVerdict: (caseId, sessionId, verdictData) => {
            let err: string | null = null;
            const verdictDate =
                String(verdictData.date ?? '').trim() || new Date().toISOString().slice(0, 10);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(verdictDate)) return 'تاريخ الحكم غير صالح.';
            if (!['conviction', 'acquittal', 'release'].includes(String(verdictData.outcome ?? ''))) {
                return 'نوع الحكم غير صالح.';
            }
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                err = rejectCriminalCaseMutation(target, state.sessionOwnerLawyerId);
                if (err) return state;
                if (caseMaterialProcedureBlocked(target)) {
                    err = 'لا يمكن تسجيل الحكم — الإضبارة مقفلة.';
                    return state;
                }
                if (trialSessionsLocked(target)) {
                    err = 'الإضبارة محسومة مسبقاً — الحكم مسجّل.';
                    return state;
                }
                const list = normalizeTrialSessions(target.trials);
                const idx = list.findIndex((s) => s.id === sessionId);
                if (idx < 0) {
                    err = 'الجلسة غير موجودة.';
                    return state;
                }
                const current = list[idx]!;
                if (current.status === 'verdict_issued') {
                    err = 'الحكم مسجّل مسبقاً على هذه الجلسة.';
                    return state;
                }
                if (current.status !== 'pending') {
                    err = 'لا يمكن إصدار حكم على جلسة مؤجّلة — أضف جلسة جديدة للحكم.';
                    return state;
                }
                const presenceType =
                    verdictData.presenceType ?? presenceTypeFromSession(current.presenceStatus);
                const updated: TrialSession = {
                    ...current,
                    status: 'verdict_issued',
                    verdict: {
                        outcome: verdictData.outcome,
                        presenceType,
                        date: verdictDate,
                        appealDeadline: computeAppealDeadline(verdictDate),
                    },
                };
                const nextList = list.map((s, i) => (i === idx ? updated : s));
                const conclusion = buildTrialVerdictStageConclusion(
                    target,
                    current,
                    verdictData.outcome,
                    verdictDate,
                );
                const frozenTarget: CriminalCase = {
                    ...target,
                    trials: nextList,
                    verdictDate,
                    isFrozen: true,
                    finalDecision: conclusion,
                };
                const nextCase = upsertVerdictCardFromConclusion(
                    applyPersonalStagesFromConclusion(frozenTarget, conclusion),
                    conclusion,
                );
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: nextCase,
                    },
                };
            });
            return err;
        },
        syncTrialSessionVerdictFromStageFinal: (caseId, sessionId, input) => {
            const outcome = mapStageFinalKindToTrialOutcome(String(input.kind ?? ''));
            if (!outcome) return null;
            const verdictDate = String(input.issuedAt ?? '').trim();
            const dateErr = validateTrialSessionIsoDate(verdictDate);
            if (dateErr) return dateErr;
            let err: string | null = null;
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                err = rejectCriminalCaseMutation(target, state.sessionOwnerLawyerId);
                if (err) return state;
                const list = normalizeTrialSessions(target.trials);
                const idx = list.findIndex((s) => s.id === sessionId);
                if (idx < 0) {
                    err = 'الجلسة غير موجودة.';
                    return state;
                }
                const current = list[idx]!;
                if (current.status === 'verdict_issued') return state;
                const presenceType = mapDecisionPresenceToTrialVerdictPresence(
                    input.presenceType,
                    current.presenceStatus,
                );
                const updated: TrialSession = {
                    ...current,
                    status: 'verdict_issued',
                    verdict: {
                        outcome,
                        presenceType,
                        date: verdictDate,
                        appealDeadline: computeAppealDeadline(verdictDate),
                    },
                };
                const nextList = list.map((s, i) => (i === idx ? updated : s));
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, trials: nextList, verdictDate },
                    },
                };
            });
            return err;
        },
        registerInitialTrialHearingDate: (caseId, nextHearingDate) => {
            const date = String(nextHearingDate ?? '').trim();
            if (!date) return 'تاريخ موعد المحاكمة مطلوب.';
            const dateErr = validateTrialSessionIsoDate(date);
            if (dateErr) return dateErr;

            let err: string | null = null;
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                err = rejectCriminalCaseMutation(target, state.sessionOwnerLawyerId);
                if (err) return state;
                if (caseMaterialProcedureBlocked(target)) {
                    err = 'لا يمكن تسجيل موعد المحاكمة — الإضبارة مقفلة.';
                    return state;
                }
                const stage = resolveCaseStageFromRecord(target);
                if (stage !== 'misdemeanor' && stage !== 'felony') {
                    err = 'موعد المحاكمة يُسجَّل في مرحلة محكمة الموضوع (جنح أو جنايات) فقط.';
                    return state;
                }
                const cleanedTrials = prunePhantomScheduledTrialSessions(
                    target.trials,
                    String(target.location.nextHearingDate ?? ''),
                );
                const prior = String(target.location.nextHearingDate ?? '').trim();
                if (prior) {
                    err = 'تم تسجيل موعد المحاكمة مسبقاً.';
                    return state;
                }
                if (cleanedTrials.length > 0) {
                    err = 'توجد جلسات مرافعة مسجّلة — عدّل الموعد من سجل المرافعات.';
                    return state;
                }
                const today = new Date().toISOString().slice(0, 10);
                const event: TimelineEvent = {
                    id: createId(),
                    date: today,
                    type: 'action',
                    category: 'موعد المحاكمة',
                    title: 'تسجيل موعد المحاكمة',
                    description: date,
                };
                const events = Array.isArray(target.timelineEvents) ? target.timelineEvents : [];
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            location: { ...target.location, nextHearingDate: date },
                            trials: cleanedTrials,
                            timelineEvents: [...events, event],
                        },
                    },
                };
            });
            return err;
        },
        prunePhantomScheduledTrialSessions: (caseId) => {
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                const scheduled = String(target.location.nextHearingDate ?? '').trim();
                const pruned = prunePhantomScheduledTrialSessions(target.trials, scheduled);
                const current = normalizeTrialSessions(target.trials);
                if (pruned.length === current.length) return state;
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, trials: pruned },
                    },
                };
            });
        },
    };
}
