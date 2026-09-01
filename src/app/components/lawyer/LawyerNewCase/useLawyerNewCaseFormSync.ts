import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { getLegalRole } from '../LawyerShared';
import { getPersonalStatusRoleForSide } from '../personal-status/personalStatusValidation';
import type { CaseType, Party } from './types';
import {
    computeOpeningDegreeOptions,
    snapOpeningStageToDegrees,
} from '@/app/domain/lawsuit/lawsuitStageOptions';
import {
    getBlockedWordsError,
    getRetrialTargetCourtMismatchErrors,
    getStageCourtMismatchErrors,
    isAbsentJudgmentObjectionStage,
    isExtraordinaryProcedureStage,
    isFixedFeeType,
} from './validation';
import type { IncidentalSpawnContextEnriched } from '@/app/domain/lawsuit/incidentalSpawnPrefill';
import type { LawyerNewCaseDetails } from './spawnInit';

type FormSyncDeps = {
    caseDetails: LawyerNewCaseDetails;
    setCaseDetails: Dispatch<SetStateAction<LawyerNewCaseDetails>>;
    setParties1: Dispatch<SetStateAction<Party[]>>;
    setParties2: Dispatch<SetStateAction<Party[]>>;
    setErrorMap: Dispatch<SetStateAction<Record<string, string>>>;
    setIsUndeterminedValue: Dispatch<SetStateAction<boolean>>;
    setIsFixedFee: Dispatch<SetStateAction<boolean>>;
    selectedType: CaseType;
    isPersonalCase: boolean;
    isFixedFee: boolean;
    isUndeterminedValue: boolean;
    applicableLaw: string;
    parties1Length: number;
    parties2Length: number;
    effectiveSpawnContext: IncidentalSpawnContextEnriched | null;
    mainCategory: string | null;
};

/** مزامنة تحقق/مرحلة/أدوار الأطراف — بدون JSX. */
export function useLawyerNewCaseFormSync({
    caseDetails,
    setCaseDetails,
    setParties1,
    setParties2,
    setErrorMap,
    setIsUndeterminedValue,
    setIsFixedFee,
    selectedType,
    isPersonalCase,
    isFixedFee,
    isUndeterminedValue,
    applicableLaw,
    parties1Length,
    parties2Length,
    effectiveSpawnContext,
    mainCategory,
}: FormSyncDeps): void {
    useEffect(() => {
        if (effectiveSpawnContext || isPersonalCase) return;
        if (!isExtraordinaryProcedureStage(caseDetails.stage)) return;
        setIsUndeterminedValue(false);
        setIsFixedFee(false);
        setCaseDetails((prev) => {
            let next = prev.claimValue ? { ...prev, claimValue: '' } : prev;
            if (
                isAbsentJudgmentObjectionStage(prev.stage) &&
                prev.retrialTargetStage?.includes('استئناف')
            ) {
                next = { ...next, retrialTargetStage: '' };
            }
            return next;
        });
    }, [
        caseDetails.stage,
        isPersonalCase,
        effectiveSpawnContext,
        setCaseDetails,
        setIsFixedFee,
        setIsUndeterminedValue,
    ]);

    useEffect(() => {
        if (effectiveSpawnContext || isPersonalCase) return;
        if (isExtraordinaryProcedureStage(caseDetails.stage)) return;
        setCaseDetails((prev) =>
            prev.retrialTargetStage ? { ...prev, retrialTargetStage: '' } : prev,
        );
    }, [caseDetails.stage, isPersonalCase, effectiveSpawnContext, setCaseDetails]);

    useEffect(() => {
        if (isPersonalCase) {
            const validationErrors: Record<string, string> = {};
            Object.assign(
                validationErrors,
                getBlockedWordsError(caseDetails.court, caseDetails.type, selectedType),
            );
            if (caseDetails.stage.includes('استئناف') || caseDetails.stage.includes('بداءة')) {
                validationErrors.stage =
                    'مرحلة غير متاحة في الأحوال الشخصية — اختر أحوال شخصية أو تمييز أو طعن استثنائي.';
            }
            setErrorMap((prev) => {
                const newMap: Record<string, string> = {};
                Object.keys(prev).forEach((key) => {
                    if (
                        !['court', 'type', 'stage', 'retrialTargetStage', 'applicableLaw', 'number'].includes(
                            key,
                        )
                    ) {
                        newMap[key] = prev[key]!;
                    }
                });
                Object.assign(newMap, validationErrors);
                return newMap;
            });
            return;
        }

        const validationErrors: Record<string, string> = {};
        const { court, type, stage, retrialTargetStage } = caseDetails;

        Object.assign(validationErrors, getStageCourtMismatchErrors(court, stage));
        if (isExtraordinaryProcedureStage(stage) && retrialTargetStage) {
            Object.assign(
                validationErrors,
                getRetrialTargetCourtMismatchErrors(court, retrialTargetStage),
            );
        }
        Object.assign(validationErrors, getBlockedWordsError(court, type, selectedType));

        if (isExtraordinaryProcedureStage(stage)) {
            setErrorMap((prev) => {
                const newMap: Record<string, string> = {};
                Object.keys(prev).forEach((key) => {
                    if (!['court', 'type', 'stage', 'retrialTargetStage'].includes(key)) {
                        newMap[key] = prev[key]!;
                    }
                });
                Object.keys(validationErrors).forEach((key) => {
                    newMap[key] = validationErrors[key]!;
                });
                return newMap;
            });
            return;
        }

        setErrorMap((prev) => {
            const newMap: Record<string, string> = {};
            Object.keys(prev).forEach((key) => {
                if (!['court', 'type', 'stage'].includes(key)) {
                    newMap[key] = prev[key]!;
                }
            });
            Object.keys(validationErrors).forEach((key) => {
                newMap[key] = validationErrors[key]!;
            });
            return newMap;
        });
    }, [
        caseDetails.court,
        caseDetails.type,
        caseDetails.stage,
        caseDetails.retrialTargetStage,
        selectedType,
        isPersonalCase,
        applicableLaw,
        setErrorMap,
    ]);

    useEffect(() => {
        if (effectiveSpawnContext || isPersonalCase) return;
        if (isExtraordinaryProcedureStage(caseDetails.stage)) return;
        if (!isFixedFeeType(caseDetails.type)) return;
        setIsFixedFee(true);
        setIsUndeterminedValue(false);
    }, [
        caseDetails.type,
        caseDetails.stage,
        isPersonalCase,
        effectiveSpawnContext,
        setIsFixedFee,
        setIsUndeterminedValue,
    ]);

    useEffect(() => {
        if (effectiveSpawnContext || isPersonalCase) return;

        setCaseDetails((prev) => {
            if (isExtraordinaryProcedureStage(prev.stage)) return prev;

            const claimValue =
                (isFixedFee || isUndeterminedValue) && prev.claimValue ? '' : prev.claimValue;
            const degrees = computeOpeningDegreeOptions({
                claimValue,
                isUndeterminedValue,
                isFixedFee,
                caseType: prev.type,
            });
            const nextStage = snapOpeningStageToDegrees(prev.stage, degrees);
            if (claimValue === prev.claimValue && nextStage === prev.stage) return prev;
            return { ...prev, claimValue, stage: nextStage };
        });
    }, [
        caseDetails.claimValue,
        caseDetails.type,
        isFixedFee,
        isUndeterminedValue,
        isPersonalCase,
        effectiveSpawnContext,
        setCaseDetails,
    ]);

    useEffect(() => {
        if (effectiveSpawnContext || isPersonalCase) return;

        const stage = caseDetails.stage;
        if (!stage) {
            setParties1((prev) => {
                const role = prev.length > 1 ? 'المدعين' : 'المدعي';
                if (prev.length > 0 && prev[0]!.status === role) return prev;
                return prev.map((p) => ({ ...p, status: role }));
            });
            setParties2((prev) => {
                const role = prev.length > 1 ? 'المدعى عليهم' : 'المدعى عليه';
                if (prev.length > 0 && prev[0]!.status === role) return prev;
                return prev.map((p) => ({ ...p, status: role }));
            });
            return;
        }

        setParties1((prev) => {
            const role = getLegalRole(stage, 1, prev.length);
            if (prev.length > 0 && prev[0]!.status === role) return prev;
            return prev.map((p) => ({ ...p, status: role }));
        });
        setParties2((prev) => {
            const role = getLegalRole(stage, 2, prev.length);
            if (prev.length > 0 && prev[0]!.status === role) return prev;
            return prev.map((p) => ({ ...p, status: role }));
        });
    }, [
        caseDetails.stage,
        parties1Length,
        parties2Length,
        isPersonalCase,
        effectiveSpawnContext,
        setParties1,
        setParties2,
    ]);

    useEffect(() => {
        if (effectiveSpawnContext) return;
        setParties1((prev) => prev.map((p) => ({ ...p, status: '' })));
        setParties2((prev) => prev.map((p) => ({ ...p, status: '' })));
    }, [mainCategory, effectiveSpawnContext, setParties1, setParties2]);

    // أحوال شخصية: أدوار الأطراف عند تغيير المرحلة
    useEffect(() => {
        if (effectiveSpawnContext || !isPersonalCase) return;
        const stage = caseDetails.stage;
        if (!stage) return;
        setParties1((prev) => {
            const role = getPersonalStatusRoleForSide(stage, 1, prev.length);
            if (prev.length > 0 && prev[0]!.status === role) return prev;
            return prev.map((p) => ({ ...p, status: role }));
        });
        setParties2((prev) => {
            const role = getPersonalStatusRoleForSide(stage, 2, prev.length);
            if (prev.length > 0 && prev[0]!.status === role) return prev;
            return prev.map((p) => ({ ...p, status: role }));
        });
    }, [
        caseDetails.stage,
        parties1Length,
        parties2Length,
        isPersonalCase,
        effectiveSpawnContext,
        setParties1,
        setParties2,
    ]);
}
