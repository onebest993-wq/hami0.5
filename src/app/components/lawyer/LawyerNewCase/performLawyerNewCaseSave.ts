import type { RefObject } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { LawyerNewCaseSavePayload } from '@/app/types/components';
import { hasLawyerClientMark } from './clientRepresentation';
import type { CaseType, MainCategory, Party, ThirdParty } from './types';
import type { LawyerNewCaseDetails } from './spawnInit';
import { validateForm } from './validation';
import { sanitizeProfilePlainText } from '@/app/services/profile/profileUrlSanitize';

const LEGAL_XSS_WHITELIST = /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9\s\,\.\-\(\)\u060C\u061B\u061F\u200C-\u200F]/g;
function whitelistPlain(raw: string): string {
    return String(raw ?? '').replace(LEGAL_XSS_WHITELIST, '');
}
function safeInboundPartyField(raw: unknown, maxLen: number): string {
    return whitelistPlain(sanitizeProfilePlainText(raw, maxLen));
}
function sanitizePartyForStorage(p: Party): Party {
    if (!p || typeof p !== 'object') return p;
    return {
        ...p,
        name: safeInboundPartyField(p.name, 200),
        role: safeInboundPartyField(p.role, 120),
        phone: safeInboundPartyField(p.phone, 40),
        address: safeInboundPartyField(p.address, 300),
        email: safeInboundPartyField(p.email, 160),
        nationalId: safeInboundPartyField(p.nationalId, 60),
        representative: p.representative ? { ...p.representative, name: safeInboundPartyField(p.representative.name, 200) } : p.representative,
    };
}
function sanitizeThirdPartyForStorage(tp: ThirdParty): ThirdParty {
    if (!tp || typeof tp !== 'object') return tp;
    return {
        ...tp,
        name: safeInboundPartyField(tp.name, 200),
        role: safeInboundPartyField(tp.role, 120),
    };
}
function sanitizeAllPartyArrays(p1: Party[], p2: Party[], tp: ThirdParty[]): { parties1: Party[]; parties2: Party[]; thirdParties: ThirdParty[] } {
    return {
        parties1: Array.isArray(p1) ? p1.map(sanitizePartyForStorage) : p1,
        parties2: Array.isArray(p2) ? p2.map(sanitizePartyForStorage) : p2,
        thirdParties: Array.isArray(tp) ? tp.map(sanitizeThirdPartyForStorage) : tp,
    };
}
import {
    validatePersonalStatusForm,
    collectPersonalPartyNameErrors,
    type PersonalApplicableLaw,
} from '../personal-status/personalStatusValidation';
import {
    validateIncidentalSpawnSave,
    type IncidentalSpawnContextEnriched,
    type IncidentalSpawnPartySelection,
    type IncidentalSpawnPrefill,
} from '@/app/domain/lawsuit/incidentalSpawnPrefill';

export type LawyerNewCaseSaveArgs = {
    isPersonalCase: boolean;
    errorMap: Record<string, string>;
    setErrorMap: (updater: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
    caseDetails: LawyerNewCaseDetails;
    applicableLaw: PersonalApplicableLaw | '';
    caseNumberError: string | null;
    parties1: Party[];
    parties2: Party[];
    thirdParties: ThirdParty[];
    mainCategory: MainCategory | null;
    selectedType: CaseType;
    isUndeterminedValue: boolean;
    isFixedFee: boolean;
    effectiveSpawnContext: IncidentalSpawnContextEnriched | null;
    incidentalPartySelection: IncidentalSpawnPartySelection;
    spawnPrefill: IncidentalSpawnPrefill | null;
    incidentalFilingPartyId: string | null;
    incidentalOpposingPartyId: string | null;
    onSave: (payload: LawyerNewCaseSavePayload) => void | boolean | Promise<void | boolean>;
    scrollToElement: (ref: RefObject<HTMLInputElement | HTMLButtonElement | null>) => void;
    courtRef: RefObject<HTMLInputElement | null>;
    typeRef: RefObject<HTMLInputElement | null>;
    stageRef: RefObject<HTMLButtonElement | null>;
    numberRef: RefObject<HTMLInputElement | null>;
    retrialTargetRef: RefObject<HTMLButtonElement | null>;
    setIsAnalyzing: (v: boolean) => void;
};

/** @returns true إذا استُدعي onSave بنجاح بعد اجتياز التحقق */
export async function performLawyerNewCaseSave(args: LawyerNewCaseSaveArgs): Promise<boolean> {
    try {
        const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
        if (typeof SecureStoreService?.ensurePersistedReady === 'function') void SecureStoreService.ensurePersistedReady();
    } catch { /* ignore */ }
    // LITIGATION_OWNERSHIP_GUARD
    let userId: string | null = null;
    try {
        const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
        userId = (SecureStoreService as unknown as {_sessionUserId?: string | null})._sessionUserId ?? null;
    } catch {}
    if (!userId) return false;
    const {
        isPersonalCase,
        errorMap,
        setErrorMap,
        caseDetails,
        applicableLaw,
        caseNumberError,
        parties1,
        parties2,
        thirdParties,
        mainCategory,
        selectedType,
        isUndeterminedValue,
        isFixedFee,
        effectiveSpawnContext,
        incidentalPartySelection,
        spawnPrefill,
        incidentalFilingPartyId,
        incidentalOpposingPartyId,
        onSave,
        scrollToElement,
        courtRef,
        typeRef,
        stageRef,
        numberRef,
        retrialTargetRef,
        setIsAnalyzing,
    } = args;

    if (isPersonalCase) {
        const personalFieldKeys = ['court', 'type', 'stage', 'retrialTargetStage', 'applicableLaw'];
        const hasValidationErrors = personalFieldKeys.some((key) => errorMap[key]);
        if (hasValidationErrors) {
            SmartToast.error('يرجى تصحيح الحقول المؤشرة باللون الأصفر.');
            if (errorMap.court) scrollToElement(courtRef);
            else if (errorMap.type) scrollToElement(typeRef);
            else if (errorMap.stage) scrollToElement(stageRef);
            else if (errorMap.retrialTargetStage) scrollToElement(retrialTargetRef);
            return false;
        }

        const personalErrors = validatePersonalStatusForm({
            court: caseDetails.court,
            type: caseDetails.type,
            stage: caseDetails.stage,
            applicableLaw,
            retrialTargetStage: caseDetails.retrialTargetStage,
        });
        const errors: Record<string, string> = { ...personalErrors };
        if (caseNumberError) errors.number = caseNumberError;
        if (!hasLawyerClientMark(parties1, parties2, thirdParties)) {
            errors.lawyer_client = 'يرجى تحديد الموكل — يجب اختيار طرف واحد على الأقل';
        }
        Object.assign(errors, collectPersonalPartyNameErrors(parties1, parties2));
        if (Object.keys(errors).length > 0) {
            setErrorMap((prev) => ({ ...prev, ...errors }));
            SmartToast.error('يرجى تصحيح الحقول المؤشرة باللون الأصفر.');
            return false;
        }

        setIsAnalyzing(true);
        try {
            /*
             * مهلة قصوى — إن علّق مسار الحفظ سابقاً على Crypto/IDB بقي الزر «جارٍ الحفظ…».
             * المسار الجديد متزامن؛ المهلة شبكة أمان فقط.
             */
            const { parties1: s1_p1, parties2: s1_p2, thirdParties: s1_tp } = sanitizeAllPartyArrays(parties1, parties2, thirdParties);
            let timedOut = false;
            const saveResult = await Promise.race([
                Promise.resolve(
                    onSave({
                        mainCategory: mainCategory || 'lawsuit',
                        selectedType: 'personal',
                        parties1: s1_p1,
                        parties2: s1_p2,
                        thirdParties: s1_tp,
                        applicableLaw: safeInboundPartyField(applicableLaw, 200),
                        details: { ...caseDetails, applicableLaw: safeInboundPartyField(applicableLaw, 200) },
                    }),
                ),
                new Promise<false>((resolve) => {
                    setTimeout(() => {
                        timedOut = true;
                        resolve(false);
                    }, 8_000);
                }),
            ]);
            if (saveResult === false) {
                if (timedOut) {
                    SmartToast.error('تعذّر إكمال الحفظ خلال المهلة — حاول مرة أخرى');
                }
                return false;
            }
            return true;
        } catch {
            SmartToast.error('تعذّر إكمال الحفظ — حاول مرة أخرى');
            return false;
        } finally {
            setIsAnalyzing(false);
        }
    }

    const validationErrors = ['court', 'type', 'stage', 'retrialTargetStage'];
    const hasValidationErrors = validationErrors.some((key) => errorMap[key]);

    if (hasValidationErrors) {
        SmartToast.error('يرجى تصحيح الحقول المؤشرة باللون الأصفر.');
        if (errorMap.court) scrollToElement(courtRef);
        else if (errorMap.type) scrollToElement(typeRef);
        else if (errorMap.stage) scrollToElement(stageRef);
        else if (errorMap.retrialTargetStage) scrollToElement(retrialTargetRef);
        return false;
    }

    const { errors, firstErrorField } = validateForm(
        caseDetails,
        errorMap,
        caseNumberError,
        parties1,
        parties2,
    );
    const refByField: Record<string, RefObject<HTMLInputElement | HTMLButtonElement | null>> = {
        court: courtRef,
        type: typeRef,
        stage: stageRef,
        number: numberRef,
        retrialTargetStage: retrialTargetRef,
    };
    const firstErrorRef = firstErrorField ? refByField[firstErrorField] ?? null : null;

    if (!hasLawyerClientMark(parties1, parties2, thirdParties)) {
        errors.lawyer_client = 'يرجى تحديد الموكل — يجب اختيار طرف واحد على الأقل';
    }

    if (Object.keys(errors).length > 0) {
        setErrorMap(errors);
        if (firstErrorRef) scrollToElement(firstErrorRef);
        SmartToast.error('يرجى تصحيح الحقول المؤشرة باللون الأصفر.');
        return false;
    }

    if (effectiveSpawnContext) {
        const incidentalErr = validateIncidentalSpawnSave(
            effectiveSpawnContext,
            incidentalPartySelection,
        );
        if (incidentalErr) {
            const key =
                incidentalErr.includes('المدعى عليه') || incidentalErr.includes('المدعي')
                    ? 'incidental_opposing_party'
                    : 'incidental_filing_party';
            setErrorMap((prev) => ({ ...prev, [key]: incidentalErr }));
            SmartToast.error(incidentalErr);
            return false;
        }
    }

    const filingCandidate = spawnPrefill?.filingPartyCandidates.find(
        (p) => p.id === incidentalFilingPartyId,
    );
    const opposingCandidate = spawnPrefill?.opposingPartyCandidates.find(
        (p) => p.id === incidentalOpposingPartyId,
    );

    try {
        const { parties1: s2_p1, parties2: s2_p2, thirdParties: s2_tp } = sanitizeAllPartyArrays(parties1, parties2, thirdParties);
        const saveResult = await Promise.resolve(
            onSave({
                mainCategory: mainCategory || 'lawsuit',
                selectedType: selectedType || 'civil',
                parties1: s2_p1,
                parties2: s2_p2,
                thirdParties: s2_tp,
                isUndeterminedValue,
                isFixedFee,
                details: { ...caseDetails },
                incidentalSpawnMeta: effectiveSpawnContext
                    ? {
                          filingPartyId: incidentalFilingPartyId ?? undefined,
                          filingPartyName: filingCandidate?.name ? safeInboundPartyField(filingCandidate.name, 200) : undefined,
                          opposingPartyId: incidentalOpposingPartyId ?? undefined,
                          opposingPartyName: opposingCandidate?.name ? safeInboundPartyField(opposingCandidate.name, 200) : undefined,
                      }
                    : undefined,
            }),
        );
        if (saveResult === false) return false;
        return true;
    } catch {
        SmartToast.error('تعذّر إكمال الحفظ — حاول مرة أخرى');
        return false;
    }
}
// language-server-cache-refresh-2
