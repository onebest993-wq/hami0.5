/**
 * Verdict card / appeal / absentia actions — Wave 7h extract from criminalStoreTrialActions.
 */
import type { StoreApi } from 'zustand';
import type { CriminalCase } from './criminalCaseModel';
import {
    computeAppealDeadline,
    validateTrialSessionIsoDate,
} from './trialSessionsEngine';
import {
    inferDecisionCaseTypeFromStage,
    resolveAbsentiaObjectionDeadline,
} from './stageFinalDecisionEngine';
import {
    resolveCaseStageFromRecord,
} from './criminalStageRuntimeCore';
import {
    resolveCurrentJourneyNodeId,
} from './stageJourneyRuntimeCore';
import {
    mergeCorrectionAppealTrack,
    mergeInterventionAppealTrack,
    mergeOrdinaryAppealTrack,
    normalizeVerdictCards,
    patchVerdictCardInList,
    resolveVerdictCardsLifecycle,
    upsertVerdictCardFromConclusion,
} from './verdictCardsEngine';
import {
    applyVerdictCassationResultEffects,
    buildVerdictOrdinaryAppealPatch,
} from './verdictCassationResultEngine';
import {
    syncCaseSovereignContext,
} from './caseClassificationEngine';
import {
    applyStageFinalVerdictCardOnCase,
    prepareStageFinalDecisionOnCase,
} from './criminalStageFinalMutations';
import {
    appendJudicialDecisionOnCase,
    applyPersonalStagesFromConclusion,
    buildTrialVerdictStageConclusion,
    stampProceduralNodeId,
} from './criminalStoreCaseTransforms';
import { isCriminalCaseMutationBlocked, rejectCriminalCaseMutation, CRIMINAL_MUTATION_DENIED_MSG } from './criminalCaseMutationGuard';
import type { CriminalStoreState } from './criminalStoreState.types';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalTrialVerdictCardActions(set: SetFn, get: GetFn): Partial<CriminalStoreState> {
    return {
        updateVerdictCardDraft: (caseId, cardId, draft) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const cards = patchVerdictCardInList(normalizeVerdictCards(target.verdictCards), cardId, {
                    decisionDraft: String(draft ?? '').trim() || undefined,
                });
                return { casesById: { ...state.casesById, [caseId]: { ...target, verdictCards: cards } } };
            }),
        patchVerdictCardOrdinaryAppeal: (caseId, cardId, patch) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const cards = normalizeVerdictCards(target.verdictCards).map((c) => {
                    if (c.id !== cardId) return c;
                    const merged = mergeOrdinaryAppealTrack(c.ordinaryAppeal, patch);
                    const prevResult = String(c.ordinaryAppeal?.result ?? '').trim();
                    const nextResult = String(merged.result ?? '').trim();
                    if (nextResult && nextResult !== prevResult) {
                        const explicitRecordedAt = String(patch.resultRecordedAt ?? '').trim();
                        if (explicitRecordedAt) {
                            merged.resultRecordedAt = explicitRecordedAt;
                        } else if (
                            !String(merged.resultRecordedAt ?? c.ordinaryAppeal?.resultRecordedAt ?? '').trim()
                        ) {
                            merged.resultRecordedAt = new Date().toISOString().slice(0, 10);
                        }
                    }
                    const filingComplete = Boolean(String(merged.filedAt ?? '').trim());
                    return {
                        ...c,
                        ordinaryAppeal: merged,
                        cassationAppealFiled: filingComplete || c.cassationAppealFiled === true,
                    };
                });
                return { casesById: { ...state.casesById, [caseId]: { ...target, verdictCards: cards } } };
            }),
        recordVerdictCardCassationResult: (caseId, cardId, input) => {
            const target = get().casesById[caseId];
            if (!target) return 'الإضبارة غير موجودة.';
            if (rejectCriminalCaseMutation(target, get().sessionOwnerLawyerId)) return CRIMINAL_MUTATION_DENIED_MSG;
            const cards = normalizeVerdictCards(target.verdictCards);
            const card = cards.find((c) => c.id === cardId);
            if (!card) return 'بطاقة الحكم غير موجودة.';

            const outcome = applyVerdictCassationResultEffects(
                target,
                card,
                input,
                target.basics?.crimeType,
            );
            if (outcome.error) return outcome.error;

            const appealPatch = buildVerdictOrdinaryAppealPatch(input, card.ordinaryAppeal);
            const nextCards = cards.map((c) =>
                c.id === cardId
                    ? {
                          ...c,
                          ordinaryAppeal: appealPatch,
                          cassationAppealFiled: true,
                          ...(input.result === 'verdict_quash_modify_mitigate' ||
                          input.result === 'verdict_quash_modify_aggravate'
                              ? {
                                    decisionDraft:
                                        String(input.penaltyModificationText ?? '').trim() ||
                                        c.decisionDraft,
                                }
                              : {}),
                      }
                    : c,
            );

            const activeNodeId = resolveCurrentJourneyNodeId(outcome.caseRecord.stageJourney);
            const remappedCards = activeNodeId
                ? nextCards.map((c) =>
                      c.id === cardId ? { ...c, proceduralNodeId: activeNodeId } : c,
                  )
                : nextCards;

            let nextCase: CriminalCase = {
                ...outcome.caseRecord,
                verdictCards: remappedCards,
            };

            set((state) => ({
                casesById: {
                    ...state.casesById,
                    [caseId]: nextCase,
                },
            }));

            if (outcome.referralStage) {
                get().updateCaseStage(caseId, outcome.referralStage);
            }

            return null;
        },
        patchVerdictCardInterventionAppeal: (caseId, cardId, patch) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const cards = normalizeVerdictCards(target.verdictCards).map((c) =>
                    c.id === cardId
                        ? {
                              ...c,
                              interventionAppeal: mergeInterventionAppealTrack(c.interventionAppeal, patch),
                          }
                        : c,
                );
                return { casesById: { ...state.casesById, [caseId]: { ...target, verdictCards: cards } } };
            }),
        patchVerdictCardCorrectionAppeal: (caseId, cardId, patch) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const cards = normalizeVerdictCards(target.verdictCards).map((c) =>
                    c.id === cardId
                        ? {
                              ...c,
                              correctionAppeal: mergeCorrectionAppealTrack(c.correctionAppeal, patch),
                          }
                        : c,
                );
                return { casesById: { ...state.casesById, [caseId]: { ...target, verdictCards: cards } } };
            }),
        registerStageFinalDecision: (caseId, payload, meta) => {
            const target = get().casesById[caseId];
            if (!target) return 'الإضبارة غير موجودة.';
            if (rejectCriminalCaseMutation(target, get().sessionOwnerLawyerId)) return CRIMINAL_MUTATION_DENIED_MSG;
            const outcome = prepareStageFinalDecisionOnCase(target, payload, meta);
            if (outcome.error || !outcome.prepared) return outcome.error;
            const { prepared } = outcome;

            set((state) => ({
                casesById: {
                    ...state.casesById,
                    [caseId]: prepared.syncedCase,
                },
            }));

            const issueErr = get().issueStageDecision(caseId, prepared.conclusion);
            if (issueErr) return issueErr;

            set((state) => {
                const fresh = state.casesById[caseId];
                if (!fresh) return state;
                const nextCase = applyStageFinalVerdictCardOnCase(fresh, payload, prepared);
                if (nextCase === fresh) return state;
                return { casesById: { ...state.casesById, [caseId]: nextCase } };
            });
            return null;
        },
        recordVerdictAbsentiaPublication: (caseId, cardId, publicationDate) => {
            const pub = String(publicationDate ?? '').trim();
            if (!pub) return 'أدخل تاريخ التبليغ بالنشر.';
            let err: string | null = null;
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                err = rejectCriminalCaseMutation(target, state.sessionOwnerLawyerId);
                if (err) return state;
                const cards = normalizeVerdictCards(target.verdictCards);
                const card = cards.find((c) => c.id === cardId);
                if (!card) {
                    err = 'بطاقة الحكم غير موجودة.';
                    return state;
                }
                if (card.presenceType !== 'غيابي') {
                    err = 'التبليغ بالنشر يخص الأحكام الغيابية فقط.';
                    return state;
                }
                const caseType = card.caseCrimeType ?? inferDecisionCaseTypeFromStage(
                    target.caseStage ?? resolveCaseStageFromRecord(target),
                    target.basics?.crimeType,
                );
                const objectionDeadline = resolveAbsentiaObjectionDeadline(pub, caseType);
                const next = patchVerdictCardInList(cards, cardId, {
                    absentiaPublicationDate: pub,
                    absentiaObjectionDeadline: objectionDeadline,
                    caseCrimeType: caseType,
                });
                return { casesById: { ...state.casesById, [caseId]: { ...target, verdictCards: next } } };
            });
            return err;
        },
        recordVerdictAbsentiaObjection: (caseId, cardId) => {
            let err: string | null = null;
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                err = rejectCriminalCaseMutation(target, state.sessionOwnerLawyerId);
                if (err) return state;
                const cards = normalizeVerdictCards(target.verdictCards);
                const card = cards.find((c) => c.id === cardId);
                if (!card) {
                    err = 'بطاقة الحكم غير موجودة.';
                    return state;
                }
                if (card.presenceType !== 'غيابي') {
                    err = 'الاعتراض الغيابي يخص الأحكام الغيابية فقط.';
                    return state;
                }
                const next = patchVerdictCardInList(cards, cardId, { absentiaObjectionFiled: true });
                return { casesById: { ...state.casesById, [caseId]: { ...target, verdictCards: next } } };
            });
            return err;
        },
        refreshVerdictCardLifecycles: (caseId) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const before = normalizeVerdictCards(target.verdictCards);
                const after = resolveVerdictCardsLifecycle(before);
                const changed =
                    after.length !== before.length ||
                    after.some((card, index) => card !== before[index]);
                if (!changed) return state;
                return { casesById: { ...state.casesById, [caseId]: { ...target, verdictCards: after } } };
            }),
        ensureCaseSovereignContext: (caseId) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const synced = syncCaseSovereignContext(target);
                if (
                    synced.case_classification === target.case_classification &&
                    synced.misdemeanor_type === target.misdemeanor_type
                ) {
                    return state;
                }
                return { casesById: { ...state.casesById, [caseId]: synced } };
            }),
    };
}
