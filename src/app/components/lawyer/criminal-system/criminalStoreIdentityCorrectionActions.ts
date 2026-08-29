/**
 * Display helpers, death, cassation, referral, identity corrections, stage — split from criminalStoreLifecycleActions.ts
 */
import type { StoreApi } from 'zustand';








import {
    createCriminalId as createId,
} from './criminalIdUtils';
import type {
    CriminalCase,
    CriminalCaseLocation,
    LegalArticleChange,
} from './criminalCaseModel';


import {
    resolveCaseStageFromRecord,
} from './criminalStageRuntimeCore';




















import {
    formatInvestigationDepositLocation,
} from './criminalStagePresentationCore';
import {
    caseIdentityCorrectionBlocked,
    caseHeaderMetadataEditBlocked,
    identityCorrectionTimelineDescription,
    validateDepositionCorrectionInput,
    validateIdentityCorrectionInput,
    validateIdentityCorrectionReason,
    validatePartyPhoneCorrection,
} from './caseIdentityCorrectionEngine';
import {
    syncCaseCourtNameCorrection,
    syncCaseLegalArticleCorrection,
    syncCasePartyNameCorrection,
} from './caseIdentitySyncEngine';


import {
    appendIdentityCorrectionTimelineEvent,
} from './criminalStoreCaseTransforms';
import {
    CRIMINAL_MUTATION_DENIED_MSG,
    isCriminalCaseMutationBlocked,
} from './criminalCaseMutationGuard';
import type { CriminalStoreState } from './criminalStoreState.types';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

/** Identity correction slice — extracted for ≤1000 budget. */
export function createCriminalIdentityCorrectionActions(set: SetFn, get: GetFn): Partial<CriminalStoreState> {
    return {
        correctCasePartyName: (caseId, payload) => {
            let err: string | null = null;
            set((state) => {
                const target = state.casesById[caseId];
                if (isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) {
                    err = CRIMINAL_MUTATION_DENIED_MSG;
                    return state;
                }
                if (caseIdentityCorrectionBlocked(target)) {
                    err = 'لا يمكن تصحيح البيانات — الإضبارة مقفلة أو مؤرشفة.';
                    return state;
                }
                const partyId = String(payload.partyId ?? '').trim();
                const reasonErr = validateIdentityCorrectionReason(payload.reason);
                if (reasonErr) {
                    err = reasonErr;
                    return state;
                }
                const why = String(payload.reason ?? '').trim();
                const nextName = String(payload.newFullName ?? '').trim();
                const nameValidation = validateIdentityCorrectionInput(nextName, why);
                if (nameValidation) {
                    err = nameValidation;
                    return state;
                }
                const nextAddress =
                    payload.newAddress !== undefined ? String(payload.newAddress ?? '').trim() : undefined;
                if (nextAddress !== undefined && nextAddress.length > 0 && nextAddress.length < 2) {
                    err = 'العنوان قصير جداً — تحقق من الإدخال.';
                    return state;
                }
                const nextPhone =
                    payload.partyKind === 'complainant' && payload.newPhone !== undefined
                        ? String(payload.newPhone ?? '').trim()
                        : undefined;
                if (nextPhone !== undefined && nextPhone.length > 0) {
                    const phoneValidation = validatePartyPhoneCorrection(nextPhone);
                    if (phoneValidation) {
                        err = phoneValidation;
                        return state;
                    }
                }

                if (payload.partyKind === 'complainant') {
                    const list = Array.isArray(target!.complainants) ? target!.complainants : [];
                    const hit = list.find((c) => c.id === partyId);
                    if (!hit) {
                        err = 'المشتكي غير موجود.';
                        return state;
                    }
                    const priorName = String(hit.fullName ?? '').trim();
                    const priorPhone = String(hit.phone ?? '').trim();
                    const priorAddress = String(hit.address ?? '').trim();
                    const addressValue = nextAddress ?? priorAddress;
                    const phoneValue = nextPhone ?? priorPhone;
                    const nameChanged = priorName !== nextName;
                    const phoneChanged = priorPhone !== phoneValue;
                    const addressChanged = priorAddress !== addressValue;
                    if (!nameChanged && !phoneChanged && !addressChanged) {
                        err = 'لا توجد تغييرات — البيانات مطابقة للحالية.';
                        return state;
                    }
                    const changeLines = [
                        nameChanged
                            ? identityCorrectionTimelineDescription('اسم المشتكي', priorName, nextName, '')
                            : '',
                        phoneChanged
                            ? identityCorrectionTimelineDescription(
                                  'هاتف المشتكي',
                                  priorPhone,
                                  phoneValue,
                                  '',
                              )
                            : '',
                        addressChanged
                            ? identityCorrectionTimelineDescription(
                                  'عنوان المشتكي',
                                  priorAddress,
                                  addressValue,
                                  '',
                              )
                            : '',
                    ].filter(Boolean);
                    const nextComplainants = list.map((c) =>
                        c.id === partyId
                            ? {
                                  ...c,
                                  fullName: nextName,
                                  phone: phoneValue,
                                  address: addressValue,
                              }
                            : c,
                    );
                    let nextCase = appendIdentityCorrectionTimelineEvent(
                        { ...target!, complainants: nextComplainants },
                        'تصحيح بيانات مشتكي',
                        [...changeLines, `السبب: ${why}`].join('\n'),
                    );
                    if (nameChanged) {
                        nextCase = syncCasePartyNameCorrection(nextCase, partyId, priorName, nextName);
                    }
                    return { casesById: { ...state.casesById, [caseId]: nextCase } };
                }
                const defs = Array.isArray(target!.defendants) ? target!.defendants : [];
                const victim = defs.find((d) => d.id === partyId);
                if (!victim) {
                    err = 'المتهم غير موجود.';
                    return state;
                }
                if ((victim as { isPartyRecordLocked?: boolean }).isPartyRecordLocked) {
                    err = 'سجل هذا المتهم مغلق — لا يمكن تعديل بياناته.';
                    return state;
                }
                const priorName = String(victim.fullName ?? '').trim();
                const priorAddress = String(victim.address ?? '').trim();
                const addressValue = nextAddress ?? priorAddress;
                const nameChanged = priorName !== nextName;
                const addressChanged = priorAddress !== addressValue;
                if (!nameChanged && !addressChanged) {
                    err = 'لا توجد تغييرات — البيانات مطابقة للحالية.';
                    return state;
                }
                const changeLines = [
                    nameChanged
                        ? identityCorrectionTimelineDescription('اسم المتهم', priorName, nextName, '')
                        : '',
                    addressChanged
                        ? identityCorrectionTimelineDescription(
                              'عنوان المتهم',
                              priorAddress,
                              addressValue,
                              '',
                          )
                        : '',
                ].filter(Boolean);
                const nextDefendants = defs.map((d) =>
                    d.id === partyId ? { ...d, fullName: nextName, address: addressValue } : d,
                );
                let nextCase = appendIdentityCorrectionTimelineEvent(
                    { ...target!, defendants: nextDefendants },
                    'تصحيح بيانات متهم',
                    [...changeLines, `السبب: ${why}`].join('\n'),
                );
                if (nameChanged) {
                    nextCase = syncCasePartyNameCorrection(nextCase, partyId, priorName, nextName);
                }
                return { casesById: { ...state.casesById, [caseId]: nextCase } };
            });
            return err;
        },
        correctCaseCourtName: (caseId, payload) => {
            let err: string | null = null;
            set((state) => {
                const target = state.casesById[caseId];
                if (isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) {
                    err = CRIMINAL_MUTATION_DENIED_MSG;
                    return state;
                }
                if (caseHeaderMetadataEditBlocked(target)) {
                    err = 'لا يمكن تصحيح البيانات — الإضبارة مؤرشفة أو مضمومة.';
                    return state;
                }
                const validation = validateIdentityCorrectionInput(payload.newCourtName, payload.reason);
                if (validation) {
                    err = validation;
                    return state;
                }
                const nextName = String(payload.newCourtName ?? '').trim();
                const why = String(payload.reason ?? '').trim();
                const prior =
                    payload.scope === 'investigation'
                        ? String(target!.location.investigationCourtName ?? '').trim()
                        : String(target!.location.courtName ?? '').trim();
                if (prior === nextName) {
                    err = 'اسم المحكمة مطابق للحالي.';
                    return state;
                }
                const nextLocation =
                    payload.scope === 'investigation'
                        ? { ...target!.location, investigationCourtName: nextName }
                        : { ...target!.location, courtName: nextName };
                const label =
                    payload.scope === 'investigation' ? 'محكمة التحقيق' : 'محكمة الموضوع';
                let nextCase = appendIdentityCorrectionTimelineEvent(
                    { ...target!, location: nextLocation },
                    `تصحيح ${label}`,
                    identityCorrectionTimelineDescription(label, prior, nextName, why),
                );
                nextCase = syncCaseCourtNameCorrection(nextCase, prior, nextName);
                return { casesById: { ...state.casesById, [caseId]: nextCase } };
            });
            return err;
        },
        correctCaseDepositionLocation: (caseId, payload) => {
            let err: string | null = null;
            set((state) => {
                const target = state.casesById[caseId];
                if (isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) {
                    err = CRIMINAL_MUTATION_DENIED_MSG;
                    return state;
                }
                if (caseHeaderMetadataEditBlocked(target)) {
                    err = 'لا يمكن تصحيح البيانات — الإضبارة مؤرشفة أو مضمومة.';
                    return state;
                }
                const validation = validateDepositionCorrectionInput(
                    payload.papersAt,
                    payload.entityName,
                    payload.reason,
                );
                if (validation) {
                    err = validation;
                    return state;
                }
                const papersAt = payload.papersAt;
                const entityName = String(payload.entityName ?? '').trim();
                const why = String(payload.reason ?? '').trim();
                const prior = formatInvestigationDepositLocation(target!.location);
                const nextLocation: CriminalCaseLocation =
                    papersAt === 'مكتب تحقيق قضائي'
                        ? {
                              ...target!.location,
                              investigationPapersAt: papersAt,
                              investigationOfficeName: entityName,
                          }
                        : {
                              ...target!.location,
                              investigationPapersAt: papersAt,
                              policeStationName: entityName,
                          };
                const nextLabel = formatInvestigationDepositLocation(nextLocation);
                if (prior === nextLabel) {
                    err = 'جهة الإيداع مطابقة للحالية.';
                    return state;
                }
                let nextCase = appendIdentityCorrectionTimelineEvent(
                    { ...target!, location: nextLocation },
                    'تصحيح جهة إيداع الإضبارة',
                    identityCorrectionTimelineDescription('جهة الإيداع', prior, nextLabel, why),
                );
                return { casesById: { ...state.casesById, [caseId]: nextCase } };
            });
            return err;
        },
        correctCaseLegalArticle: (caseId, payload) => {
            let err: string | null = null;
            set((state) => {
                const target = state.casesById[caseId];
                if (isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) {
                    err = CRIMINAL_MUTATION_DENIED_MSG;
                    return state;
                }
                if (caseHeaderMetadataEditBlocked(target)) {
                    err = 'لا يمكن تصحيح البيانات — الإضبارة مؤرشفة أو مضمومة.';
                    return state;
                }
                const validation = validateIdentityCorrectionInput(payload.newArticle, payload.reason);
                if (validation) {
                    err = validation;
                    return state;
                }
                const nextArticle = String(payload.newArticle ?? '').trim();
                const why = String(payload.reason ?? '').trim();
                const history = Array.isArray(target!.legalArticleHistory) ? target!.legalArticleHistory : [];
                const prior =
                    String(target!.basics?.legalArticle ?? '').trim() ||
                    String(history[history.length - 1]?.article ?? '').trim();
                if (prior === nextArticle) {
                    err = 'مادة الاتهام مطابقة للحالية.';
                    return state;
                }
                const caseStage = resolveCaseStageFromRecord(target!);
                const change: LegalArticleChange = {
                    id: createId(),
                    article: nextArticle,
                    changedAtDate: new Date().toISOString().slice(0, 10),
                    changedBy: caseStage === 'investigation' ? 'investigation_judge' : 'trial_court',
                };
                const trialPatch =
                    caseStage === 'misdemeanor' || caseStage === 'felony'
                        ? { currentAccusationArticle: nextArticle }
                        : {};
                const nextCase = syncCaseLegalArticleCorrection(
                    appendIdentityCorrectionTimelineEvent(
                        {
                            ...target!,
                            basics: { ...target!.basics, legalArticle: nextArticle },
                            legalArticleHistory: [...history, change],
                            ...trialPatch,
                        },
                        'تصحيح مادة الاتهام',
                        identityCorrectionTimelineDescription('مادة الاتهام', prior, nextArticle, why),
                    ),
                    prior,
                    nextArticle,
                );
                return { casesById: { ...state.casesById, [caseId]: nextCase } };
            });
            return err;
        },
        correctCaseReferenceNumbers: (caseId, payload) => {
            let err: string | null = null;
            set((state) => {
                const target = state.casesById[caseId];
                if (isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) {
                    err = CRIMINAL_MUTATION_DENIED_MSG;
                    return state;
                }
                if (caseHeaderMetadataEditBlocked(target)) {
                    err = 'لا يمكن تصحيح البيانات — الإضبارة مؤرشفة أو مضمومة.';
                    return state;
                }
                const why = String(payload.reason ?? '').trim();
                const priorCourtNum = String(
                    target!.courtCaseNumber ?? target!.location.caseNumber ?? '',
                ).trim();
                const priorPp = String(target!.location.publicProsecutionNumber ?? '').trim();
                const nextCourtNum =
                    payload.courtCaseNumber !== undefined
                        ? String(payload.courtCaseNumber ?? '').trim()
                        : priorCourtNum;
                const nextPp =
                    payload.publicProsecutionNumber !== undefined
                        ? String(payload.publicProsecutionNumber ?? '').trim()
                        : priorPp;
                const courtChanged = nextCourtNum !== priorCourtNum;
                const ppChanged = nextPp !== priorPp;
                if (!courtChanged && !ppChanged) {
                    err = 'أرقام الإضبارة مطابقة للحالية.';
                    return state;
                }
                const parts: string[] = [];
                if (courtChanged) {
                    parts.push(
                        identityCorrectionTimelineDescription(
                            'رقم الدعوى',
                            priorCourtNum || '—',
                            nextCourtNum || '—',
                            why,
                        ),
                    );
                }
                if (ppChanged) {
                    parts.push(
                        identityCorrectionTimelineDescription(
                            'رقم الادعاء العام',
                            priorPp || '—',
                            nextPp || '—',
                            why,
                        ),
                    );
                }
                let nextCase: CriminalCase = {
                    ...target!,
                    courtCaseNumber: nextCourtNum || undefined,
                    location: {
                        ...target!.location,
                        caseNumber: nextCourtNum,
                        publicProsecutionNumber: nextPp,
                    },
                };
                nextCase = appendIdentityCorrectionTimelineEvent(
                    nextCase,
                    'تصحيح أرقام الإضبارة',
                    parts.join('\n'),
                );
                return { casesById: { ...state.casesById, [caseId]: nextCase } };
            });
            return err;
        },
    };
}
