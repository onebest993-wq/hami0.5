/**
 * Trial session CRUD + preparatory decision — extracted from criminalStoreTrialActions.
 */
import type { StoreApi } from 'zustand';
import {
    createCriminalId as createId,
} from './criminalIdUtils';
import type { TrialSession } from './trialSessionsEngine';
import {
    normalizeVerdictCards,
} from './verdictCardsEngine';
import {
    normalizeTrialSessions,
    validateAddTrialSessionInput,
    validateTrialSessionIsoDate,
    validateTrialSessionPreparatoryInput,
    hasEffectivePendingTrialSession,
    validateTrialSessionNumberUnique,
    prunePhantomScheduledTrialSessions,
    resolveCassationRemandRetrialPivotDate,
} from './trialSessionsEngine';
import {
    buildTrialSessionPreparatoryJudicialDecision,
} from './trialSessionPreparatoryDecisionEngine';
import {
    resolveCaseStageFromRecord,
} from './criminalStageRuntimeCore';
import {
    resolveCurrentJourneyNodeId,
} from './stageJourneyRuntimeCore';
import { rejectCriminalCaseMutation } from './criminalCaseMutationGuard';
import {
    appendJudicialDecisionOnCase,
    caseMaterialProcedureBlocked,
    stampProceduralNodeId,
    trialSessionsLocked,
} from './criminalStoreCaseTransforms';
import type { CriminalStoreState } from './criminalStoreState.types';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalTrialSessionActions(set: SetFn, _get: GetFn): Partial<CriminalStoreState> {
    return {
        addTrialSession: (caseId, sessionData) => {
            let err: string | null = validateAddTrialSessionInput(sessionData);
            if (err) return err;
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                err = rejectCriminalCaseMutation(target, state.sessionOwnerLawyerId);
                if (err) return state;
                if (caseMaterialProcedureBlocked(target)) {
                    err = 'لا يمكن إضافة جلسة — الإضبارة مقفلة.';
                    return state;
                }
                const list = normalizeTrialSessions(target.trials);
                const scheduled = String(target.location.nextHearingDate ?? '').trim();
                const effectiveTrials = prunePhantomScheduledTrialSessions(list, scheduled);
                if (trialSessionsLocked(target)) {
                    err = 'الإضبارة محسومة — لا يمكن إضافة جلسات بعد صدور الحكم.';
                    return state;
                }
                if (hasEffectivePendingTrialSession(effectiveTrials, scheduled)) {
                    err = 'يوجد جلسة معلّقة — أكمل إجراءاتها قبل فتح جلسة جديدة.';
                    return state;
                }
                err = validateTrialSessionNumberUnique(effectiveTrials, String(sessionData.sessionNumber).trim());
                if (err) return state;
                const remandPivot = resolveCassationRemandRetrialPivotDate(
                    normalizeVerdictCards(target.verdictCards),
                );
                const session: TrialSession = {
                    id: createId(),
                    date: String(sessionData.date).trim(),
                    sessionNumber: String(sessionData.sessionNumber).trim(),
                    presenceStatus: sessionData.presenceStatus,
                    sessionNotes: String(sessionData.sessionNotes ?? '').trim(),
                    witnessesAndExperts: Array.isArray(sessionData.witnessesAndExperts)
                        ? sessionData.witnessesAndExperts.map((w) => ({ ...w }))
                        : undefined,
                    status: 'pending',
                    origin: 'user',
                    ...(remandPivot ? { trialRound: 'post_cassation_remand' as const } : {}),
                };
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, trials: [...effectiveTrials, session] },
                    },
                };
            });
            return err;
        },
        updateTrialSession: (caseId, sessionId, sessionData) => {
            let err: string | null = validateAddTrialSessionInput(sessionData);
            if (err) return err;
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                err = rejectCriminalCaseMutation(target, state.sessionOwnerLawyerId);
                if (err) return state;
                if (caseMaterialProcedureBlocked(target)) {
                    err = 'لا يمكن تعديل الجلسة — الإضبارة مقفلة.';
                    return state;
                }
                const list = normalizeTrialSessions(target.trials);
                if (trialSessionsLocked(target)) {
                    err = 'الإضبارة محسومة — لا يمكن تعديل الجلسات.';
                    return state;
                }
                const idx = list.findIndex((s) => s.id === sessionId);
                if (idx < 0) {
                    err = 'الجلسة غير موجودة.';
                    return state;
                }
                const current = list[idx]!;
                if (current.status !== 'pending') {
                    err = 'لا يمكن تعديل جلسة مغلقة.';
                    return state;
                }
                err = validateTrialSessionNumberUnique(
                    list,
                    String(sessionData.sessionNumber).trim(),
                    sessionId,
                );
                if (err) return state;
                const updated: TrialSession = {
                    ...current,
                    date: String(sessionData.date).trim(),
                    sessionNumber: String(sessionData.sessionNumber).trim(),
                    presenceStatus: sessionData.presenceStatus,
                    sessionNotes: String(sessionData.sessionNotes ?? '').trim(),
                    preparatoryDecision: current.preparatoryDecision,
                };
                const nextList = list.map((s, i) => (i === idx ? updated : s));
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, trials: nextList },
                    },
                };
            });
            return err;
        },
        documentTrialSessionPreparatoryDecision: (caseId, input) => {
            let err: string | null = validateAddTrialSessionInput(input.session);
            if (!err) err = validateTrialSessionPreparatoryInput(input.preparatory);
            if (err) return err;

            set((state) => {
                const target = state.casesById[caseId];
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                err = rejectCriminalCaseMutation(target, state.sessionOwnerLawyerId);
                if (err) return state;
                if (caseMaterialProcedureBlocked(target)) {
                    err = 'لا يمكن توثيق القرار — الإضبارة مقفلة.';
                    return state;
                }
                if (trialSessionsLocked(target)) {
                    err = 'الإضبارة محسومة — لا يمكن توثيق قرارات جديدة.';
                    return state;
                }

                let list = normalizeTrialSessions(target.trials);
                let sessionId = String(input.sessionId ?? '').trim();
                let sessionRow: TrialSession | null = null;

                if (sessionId) {
                    const idx = list.findIndex((s) => s.id === sessionId);
                    if (idx < 0) {
                        err = 'الجلسة غير موجودة.';
                        return state;
                    }
                    const current = list[idx]!;
                    if (current.status !== 'pending') {
                        err = 'لا يمكن توثيق قرار على جلسة مغلقة.';
                        return state;
                    }
                    if (current.preparatoryDecision?.judicialDecisionId) {
                        err = 'القرار الإعدادي مسجّل مسبقاً على هذه الجلسة.';
                        return state;
                    }
                    sessionRow = {
                        ...current,
                        date: String(input.session.date).trim(),
                        sessionNumber: String(input.session.sessionNumber).trim(),
                        presenceStatus: input.session.presenceStatus,
                        sessionNotes: String(input.session.sessionNotes ?? '').trim(),
                    };
                    list = list.map((s, i) => (i === idx ? sessionRow! : s));
                } else {
                    const scheduled = String(target.location.nextHearingDate ?? '').trim();
                    const effectiveList = prunePhantomScheduledTrialSessions(list, scheduled);
                    if (hasEffectivePendingTrialSession(effectiveList, scheduled)) {
                        err = 'يوجد جلسة معلّقة — أكمل إجراءاتها قبل فتح جلسة جديدة.';
                        return state;
                    }
                    list = effectiveList;
                    sessionRow = {
                        id: createId(),
                        date: String(input.session.date).trim(),
                        sessionNumber: String(input.session.sessionNumber).trim(),
                        presenceStatus: input.session.presenceStatus,
                        sessionNotes: String(input.session.sessionNotes ?? '').trim(),
                        witnessesAndExperts: Array.isArray(input.session.witnessesAndExperts)
                            ? input.session.witnessesAndExperts.map((w) => ({ ...w }))
                            : undefined,
                        status: 'pending',
                    };
                    list = [...list, sessionRow];
                    sessionId = sessionRow.id;
                }

                const caseStage = resolveCaseStageFromRecord(target);
                const nodeId = resolveCurrentJourneyNodeId(target.stageJourney);
                const judicialDecision = buildTrialSessionPreparatoryJudicialDecision(
                    sessionRow,
                    input.preparatory,
                    caseStage,
                    nodeId || undefined,
                );
                const preparatoryDecision = {
                    title: String(input.preparatory.title).trim(),
                    details: String(input.preparatory.details).trim(),
                    isBlockingSuit: input.preparatory.isBlockingSuit === true,
                    judicialDecisionId: judicialDecision.id,
                    sessionNumber: String(sessionRow.sessionNumber ?? '').trim(),
                    sessionId: sessionId,
                };
                const sessionWithPrep: TrialSession = {
                    ...sessionRow,
                    preparatoryDecision,
                };
                const nextTrials = list.map((s) => (s.id === sessionId ? sessionWithPrep : s));
                let nextCase = appendJudicialDecisionOnCase(
                    { ...target, trials: nextTrials },
                    judicialDecision,
                );
                const event = stampProceduralNodeId(
                    {
                        id: createId(),
                        date: sessionWithPrep.date,
                        type: 'decision',
                        category: 'قرار إعدادي — جلسة مرافعة',
                        title: preparatoryDecision.title,
                        description: preparatoryDecision.details,
                    },
                    nodeId,
                );
                nextCase = {
                    ...nextCase,
                    timelineEvents: [...(Array.isArray(nextCase.timelineEvents) ? nextCase.timelineEvents : []), event],
                };
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: nextCase,
                    },
                };
            });
            return err;
        },
        postponeTrialSession: (caseId, sessionId, nextDate, reason, prepNote) => {
            let err: string | null = null;
            const next = String(nextDate ?? '').trim();
            const why = String(reason ?? '').trim();
            const prep = String(prepNote ?? '').trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) return 'تاريخ الجلسة القادمة غير صالح.';
            const nextDateErr = validateTrialSessionIsoDate(next);
            if (nextDateErr) return nextDateErr;
            if (!why) return 'سبب التأجيل مطلوب.';
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                err = rejectCriminalCaseMutation(target, state.sessionOwnerLawyerId);
                if (err) return state;
                if (caseMaterialProcedureBlocked(target)) {
                    err = 'لا يمكن تأجيل الجلسة — الإضبارة مقفلة.';
                    return state;
                }
                const list = normalizeTrialSessions(target.trials);
                const idx = list.findIndex((s) => s.id === sessionId);
                if (idx < 0) {
                    err = 'الجلسة غير موجودة.';
                    return state;
                }
                const current = list[idx]!;
                if (current.status !== 'pending') {
                    err = 'قرار الجلسة مسجّل مسبقاً.';
                    return state;
                }
                const updated: TrialSession = {
                    ...current,
                    status: 'postponed',
                    postponementReason: why,
                    nextSessionDate: next,
                    preparationNote: prep || undefined,
                };
                const nextList = list.map((s, i) => (i === idx ? updated : s));
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, trials: nextList },
                    },
                };
            });
            return err;
        },
    };
}
