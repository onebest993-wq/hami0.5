import type { RefObject } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { LawyerNewCaseSavePayload } from '@/app/types/components';
import { hasLawyerClientMark } from './clientRepresentation';
import type { CaseType, MainCategory, Party, ThirdParty } from './types';
import type { LawyerNewCaseDetails } from './spawnInit';
import { validateForm } from './validation';
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
            let timedOut = false;
            const saveResult = await Promise.race([
                Promise.resolve(
                    onSave({
                        mainCategory: mainCategory || 'lawsuit',
                        selectedType: 'personal',
                        parties1,
                        parties2,
                        thirdParties,
                        applicableLaw,
                        details: { ...caseDetails, applicableLaw },
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
        const saveResult = await Promise.resolve(
            onSave({
                mainCategory: mainCategory || 'lawsuit',
                selectedType: selectedType || 'civil',
                parties1,
                parties2,
                thirdParties,
                isUndeterminedValue,
                isFixedFee,
                details: { ...caseDetails },
                incidentalSpawnMeta: effectiveSpawnContext
                    ? {
                          filingPartyId: incidentalFilingPartyId ?? undefined,
                          filingPartyName: filingCandidate?.name,
                          opposingPartyId: incidentalOpposingPartyId ?? undefined,
                          opposingPartyName: opposingCandidate?.name,
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
