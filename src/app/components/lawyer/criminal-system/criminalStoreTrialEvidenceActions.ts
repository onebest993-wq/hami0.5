/**
 * Trial depositions + charge modification — extracted from criminalStoreTrialActions (Wave 7g).
 */
import type { StoreApi } from 'zustand';
import type { TrialDeposition } from './trialDepositionsEngine';
import {
    createTrialDepositionId,
    normalizeTrialDeposition,
    normalizeTrialDepositions,
    validateAddTrialDepositionInput,
} from './trialDepositionsEngine';
import {
    buildChargeModificationEntry,
    normalizeChargeModifications,
    resolveCurrentAccusationArticleFromCase,
    resolveReferralArticleFromCase,
    validateModifyTrialChargeInput,
} from './trialChargeEngine';
import { caseMaterialProcedureBlocked } from './criminalStoreCaseTransforms';
import { rejectCriminalCaseMutation } from './criminalCaseMutationGuard';
import type { CriminalStoreState } from './criminalStoreState.types';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalTrialEvidenceActions(set: SetFn, _get: GetFn): Partial<CriminalStoreState> {
    return {
        addTrialDeposition: (caseId, input) => {
            let err: string | null = validateAddTrialDepositionInput(input);
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
                    err = 'لا يمكن إضافة إفادة — الإضبارة مقفلة.';
                    return state;
                }
                const content = String(input.content).trim();
                const deposition: TrialDeposition = {
                    id: createTrialDepositionId(),
                    sessionId: String(input.sessionId ?? '').trim() || undefined,
                    date: String(input.date).trim(),
                    giverType: input.giverType,
                    witnessName: String(input.witnessName).trim(),
                    witnessDetails: String(input.witnessDetails ?? '').trim() || undefined,
                    content,
                    contentHighlights: input.contentHighlights,
                    comparisons: Array.isArray(input.comparisons)
                        ? input.comparisons.map((c) => ({ ...c }))
                        : undefined,
                    crossExamination: Array.isArray(input.crossExamination)
                        ? input.crossExamination.map((q) => ({ ...q }))
                        : undefined,
                };
                const list = normalizeTrialDepositions(target.trialDepositions);
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, trialDepositions: [...list, deposition] },
                    },
                };
            });
            return err;
        },
        updateTrialDeposition: (caseId, depositionId, patch) => {
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
                    err = 'لا يمكن تعديل الإفادة — الإضبارة مقفلة.';
                    return state;
                }
                const list = normalizeTrialDepositions(target.trialDepositions);
                const idx = list.findIndex((d) => d.id === depositionId);
                if (idx < 0) {
                    err = 'الإفادة غير موجودة.';
                    return state;
                }
                const current = list[idx]!;
                const nextContent =
                    patch.content !== undefined ? String(patch.content).trim() : current.content;
                if (patch.content !== undefined && !nextContent) {
                    err = 'نص الإفادة مطلوب.';
                    return state;
                }
                const next: TrialDeposition = {
                    ...current,
                    ...patch,
                    id: current.id,
                    content: nextContent,
                    witnessName:
                        patch.witnessName !== undefined
                            ? String(patch.witnessName).trim()
                            : current.witnessName,
                    giverType: patch.giverType !== undefined ? patch.giverType : current.giverType,
                    witnessDetails:
                        patch.witnessDetails !== undefined
                            ? String(patch.witnessDetails).trim() || undefined
                            : current.witnessDetails,
                    date: patch.date !== undefined ? String(patch.date).trim() : current.date,
                    contentHighlights:
                        patch.contentHighlights !== undefined
                            ? patch.contentHighlights
                            : patch.content !== undefined
                              ? undefined
                              : current.contentHighlights,
                    comparisons:
                        patch.comparisons !== undefined
                            ? patch.comparisons.map((c) => ({ ...c }))
                            : current.comparisons,
                    crossExamination:
                        patch.crossExamination !== undefined
                            ? patch.crossExamination.map((q) => ({ ...q }))
                            : current.crossExamination,
                };
                const normalized = normalizeTrialDeposition(next);
                if (!normalized) {
                    err = 'بيانات الإفادة غير صالحة.';
                    return state;
                }
                const nextList = list.map((d, i) => (i === idx ? normalized : d));
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, trialDepositions: nextList },
                    },
                };
            });
            return err;
        },
        deleteTrialDeposition: (caseId, depositionId) => {
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
                    err = 'لا يمكن حذف الإفادة — الإضبارة مقفلة.';
                    return state;
                }
                const list = normalizeTrialDepositions(target.trialDepositions);
                const nextList = list.filter((d) => d.id !== depositionId);
                if (nextList.length === list.length) {
                    err = 'الإفادة غير موجودة.';
                    return state;
                }
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, trialDepositions: nextList },
                    },
                };
            });
            return err;
        },
        modifyTrialChargeDescription: (caseId, input) => {
            let err: string | null = validateModifyTrialChargeInput(input);
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
                    err = 'لا يمكن تعديل الوصف — الإضبارة مقفلة.';
                    return state;
                }
                const currentArticle = resolveCurrentAccusationArticleFromCase({
                    currentAccusationArticle: target.currentAccusationArticle,
                    chargeModifications: target.chargeModifications,
                    referralArticle: target.referralArticle,
                    legalArticleHistory: target.legalArticleHistory,
                    basicsLegalArticle: target.basics?.legalArticle,
                });
                if (!currentArticle) {
                    err = 'لا توجد مادة إحالة مسجّلة.';
                    return state;
                }
                const newArticle = String(input.newArticle ?? '').trim();
                if (newArticle === currentArticle) {
                    err = 'المادة الجديدة مطابقة لمادة الاتهام الحالية.';
                    return state;
                }
                const entry = buildChargeModificationEntry(currentArticle, input);
                const chargeModifications = [
                    ...normalizeChargeModifications(target.chargeModifications),
                    entry,
                ];
                const referralArticle =
                    String(target.referralArticle ?? '').trim() ||
                    resolveReferralArticleFromCase({
                        referralArticle: target.referralArticle,
                        legalArticleHistory: target.legalArticleHistory,
                        basicsLegalArticle: target.basics?.legalArticle,
                    }) ||
                    currentArticle;
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            referralArticle,
                            currentAccusationArticle: newArticle,
                            chargeModifications,
                        },
                    },
                };
            });
            return err;
        },
    };
}
