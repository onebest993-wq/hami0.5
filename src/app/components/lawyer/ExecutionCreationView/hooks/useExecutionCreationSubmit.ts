import { SmartToast } from '@/app/components/ui/SmartToast';
import logger from '@/app/utils/logger';
import { SupabaseService } from '@/app/services/SupabaseService';
import type { ExecutionArchiveFile } from '@/app/types/common';
import type { SpecificDeliveryItem } from '@/app/utils/specificDeliveryItemsUtils';
import type { VisitationScheduleConfig } from '@/app/types/visitationSchedule';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import type { ForeignJudgmentData } from '../components/ForeignJudgmentSection';
import type {
    AdditionalCreditorDraft,
    AdditionalDebtorDraft,
    CreditorDraft,
    DebtorDraft,
    ExecutionTargetOption,
} from '../types';
import type { AlimonyCalculationResult } from './useAlimonyCalculator';
import {
    applyAggregatedFinancialTotal,
    applyApplicantRespondentFields,
    applyClaimTypeFields,
    applyClosingFinancialAndMetaFields,
    applyInstrumentIdentityFields,
    applySummoningAndDebtorMaps,
    buildAdditionalPartyRecords,
    buildBaseExecutionDraft,
    buildSupabaseExecutionFileDto,
    resolveDebtorPartyAllocation,
} from './executionCreationSubmitBuilders';
import {
    applyAlimonyClaimFields,
    applyCustodyClaimFields,
    applyEvictionClaimFields,
    applyLawyerFeesClaimFields,
    applyMaritalFurnitureClaimFields,
    applyPastAlimonyClaimFields,
    applyShariaDeedClaimExtras,
    applySpecificDeliveryDebtExposureFields,
    applySpecificDeliveryItemsFields,
    applyVisitationClaimFields,
} from './executionCreationSubmitClaims';
import { validateExecutionCreationSubmit } from './validateExecutionCreationSubmit';

export interface UseExecutionCreationSubmitParams {
    directorate: string;
    fileNumber: string;
    creditors: CreditorDraft[];
    debtors: DebtorDraft[];
    additionalCreditors: AdditionalCreditorDraft[];
    additionalDebtorsForm: AdditionalDebtorDraft[];
    debtorManualDebtClaims: Record<string, string>;
    debtorLawyerFeesClaims: Record<string, string>;
    allowMultipleDebtors: boolean;
    docType: string;
    docNumber: string;
    judgmentDate: string;
    classification: string;
    claimType: string;
    activeClaimTypes: string[];
    claimAmountsByType: Record<string, string>;
    totalAmount: string;
    claimAmount: string;
    foreignData: ForeignJudgmentData;
    visitationChildrenNames: string[];
    visitationScheduleDraft: Partial<VisitationScheduleConfig>;
    custodyWardNames: string[];
    maritalFurnitureItems: MaritalFurnitureItem[];
    evictionPropertyNumber: string;
    evictionDistrict: string;
    evictionPropertyType: string;
    evictionFullAddress: string;
    evictionPremisesUse: 'commercial' | 'residential';
    specificDeliveryItems: SpecificDeliveryItem[];
    dueDate: string;
    executionTarget: ExecutionTargetOption;
    chequeBankName: string;
    chequeIssueDate: string;
    chequeNumber: string;
    isDocumentBlocked: boolean;
    dowryReason: 'طلاق' | 'وفاة';
    guardianshipDetails: string;
    shariaDeedNumber: string;
    shariaRegisterNumber: string;
    shariaIssueDate: string;
    shariaIssuingCourt: string;
    shariaDeedDetails: string;
    includeLawyerFees: boolean;
    lawyerFeesAmount: string;
    clientFeesAmount: string;
    alimonyBeneficiary: 'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد';
    alimonyLawsuitDate: string;
    alimonyExecutionDate: string;
    alimonyWifeMonthly: string;
    alimonyChildrenMonthly: string;
    alimonyChildrenCount: string;
    alimonyIncludesPastCalc: boolean;
    alimonyPastLawSystem: 'قانون الأحوال الشخصية 1959' | 'الفقه الجعفري';
    alimonyPastStartDate: string;
    pastWifeAlimonyAmount: string;
    calculatedAlimonyNew: AlimonyCalculationResult | null | undefined;
    resolveGlobalClaimTotalNumber: () => number;
    confirmInSection: (message: string) => Promise<boolean>;
    onSave: (fileData: ExecutionArchiveFile) => void;
    intakeLegalSnapshot?: {
        warnings: string[];
        requiredAttachments: string[];
        legalTips: string[];
        statuteMessage?: string | null;
        notificationPeriodMessage?: string | null;
    };
}

/**
 * يبني إضبارة التنفيذ من كامل حالة النموذج (فحص + تجميع + حفظ) — مستخرج من
 * ExecutionCreationView لتقليص حجم المكوّن الرئيسي (Phase-1 split).
 * Wave 4: المنطق النقي في builders/claims؛ التحقق في validateExecutionCreationSubmit.
 */
export function useExecutionCreationSubmit(
    params: UseExecutionCreationSubmitParams,
): { handleSubmit: () => Promise<void> } {
    const handleSubmit = async () => {
        const {
            directorate,
            fileNumber,
            creditors,
            debtors,
            additionalCreditors,
            additionalDebtorsForm,
            debtorManualDebtClaims,
            debtorLawyerFeesClaims,
            allowMultipleDebtors,
            docType,
            docNumber,
            judgmentDate,
            classification,
            claimType,
            activeClaimTypes,
            claimAmountsByType,
            totalAmount,
            claimAmount,
            foreignData,
            visitationChildrenNames,
            visitationScheduleDraft,
            custodyWardNames,
            maritalFurnitureItems,
            evictionPropertyNumber,
            evictionDistrict,
            evictionPropertyType,
            evictionFullAddress,
            evictionPremisesUse,
            specificDeliveryItems,
            dueDate,
            executionTarget,
            chequeBankName,
            chequeIssueDate,
            chequeNumber,
            isDocumentBlocked,
            dowryReason,
            guardianshipDetails,
            shariaDeedNumber,
            shariaRegisterNumber,
            shariaIssueDate,
            shariaIssuingCourt,
            shariaDeedDetails,
            includeLawyerFees,
            lawyerFeesAmount,
            clientFeesAmount,
            alimonyBeneficiary,
            alimonyLawsuitDate,
            alimonyExecutionDate,
            alimonyWifeMonthly,
            alimonyChildrenMonthly,
            alimonyChildrenCount,
            alimonyIncludesPastCalc,
            alimonyPastLawSystem,
            alimonyPastStartDate,
            pastWifeAlimonyAmount,
            calculatedAlimonyNew,
            resolveGlobalClaimTotalNumber,
            onSave,
            intakeLegalSnapshot,
        } = params;

        const validation = validateExecutionCreationSubmit({
            directorate,
            fileNumber,
            creditors,
            debtors,
            additionalCreditors,
            additionalDebtorsForm,
            allowMultipleDebtors,
            docType,
            claimType,
            activeClaimTypes,
            claimAmountsByType,
            totalAmount,
            foreignData,
            visitationScheduleDraft,
            custodyWardNames,
            evictionPropertyNumber,
            evictionDistrict,
            evictionPropertyType,
            evictionFullAddress,
            specificDeliveryItems,
            executionTarget,
            isDocumentBlocked,
            alimonyLawsuitDate,
            alimonyWifeMonthly,
            alimonyPastStartDate,
            pastWifeAlimonyAmount,
            calculatedAlimonyNew,
            debtorManualDebtClaims,
        });
        if (!validation.ok) return;

        const confirmed = await params.confirmInSection(
            'هل كل المعلومات المدخلة صحيحة؟\n\nتنبيه: بعض البيانات (نوع السند والمطالبة) لا يمكن تعديلها بعد فتح الإضبارة.',
        );
        if (!confirmed) return;

        const allocation = resolveDebtorPartyAllocation({
            claimType,
            debtors,
            additionalDebtorsForm,
            debtorManualDebtClaims,
            resolveGlobalClaimTotalNumber,
        });
        if (!allocation.ok) {
            SmartToast.error(allocation.error);
            return;
        }
        const {
            debtorAllocatedShares,
            solidaryRemainderDebt,
            anySolidaryDebtor,
            debtorSolidaryFlags,
            applyPartySplit,
            globalClaimTotal,
        } = allocation;

        const { executionData, representedParty } = buildBaseExecutionDraft({
            directorate,
            fileNumber,
            classification,
            claimType,
            creditors,
            debtors,
            additionalCreditors,
            docType,
            docNumber,
            judgmentDate,
        });

        applyInstrumentIdentityFields(executionData, {
            docType,
            claimType,
            chequeBankName,
            chequeIssueDate,
            chequeNumber,
            foreignData,
            shariaDeedNumber,
            shariaRegisterNumber,
            shariaIssueDate,
            shariaIssuingCourt,
            shariaDeedDetails,
        });

        const savedClaimTypes = applyClaimTypeFields(executionData, {
            activeClaimTypes,
            claimType,
            claimAmountsByType,
        });

        applySummoningAndDebtorMaps(executionData, {
            claimType,
            savedClaimTypes,
            executionTarget,
            debtors,
            includeLawyerFees,
            debtorLawyerFeesClaims,
            applyPartySplit,
            debtorAllocatedShares,
        });

        buildAdditionalPartyRecords({
            additionalDebtorsForm,
            additionalCreditors,
            includeLawyerFees,
            debtorLawyerFeesClaims,
            applyPartySplit,
            debtorAllocatedShares,
            anySolidaryDebtor,
            debtorSolidaryFlags,
            solidaryRemainderDebt,
            executionData,
            globalClaimTotal,
            totalAmount,
            claimAmount,
        });

        const aggregatedClaimTotal = applyAggregatedFinancialTotal(executionData, {
            resolveGlobalClaimTotalNumber,
            totalAmount,
            claimAmount,
        });

        applyAlimonyClaimFields(executionData, {
            claimType,
            savedClaimTypes,
            alimonyBeneficiary,
            alimonyLawsuitDate,
            alimonyExecutionDate,
            alimonyWifeMonthly,
            alimonyChildrenMonthly,
            alimonyChildrenCount,
            alimonyIncludesPastCalc,
            alimonyPastLawSystem,
            alimonyPastStartDate,
            pastWifeAlimonyAmount,
            calculatedAlimonyNew,
            aggregatedClaimTotal,
        });

        applyPastAlimonyClaimFields(executionData, {
            savedClaimTypes,
            alimonyBeneficiary,
            alimonyLawsuitDate,
            alimonyExecutionDate,
            alimonyWifeMonthly,
            alimonyPastLawSystem,
            alimonyPastStartDate,
            pastWifeAlimonyAmount,
            claimAmountsByType,
            calculatedAlimonyNew,
        });

        applyVisitationClaimFields(executionData, {
            savedClaimTypes,
            claimType,
            visitationScheduleDraft,
            visitationChildrenNames,
        });

        applyCustodyClaimFields(executionData, {
            savedClaimTypes,
            claimType,
            custodyWardNames,
        });

        applyEvictionClaimFields(executionData, {
            claimType,
            evictionPropertyNumber,
            evictionDistrict,
            evictionPropertyType,
            evictionFullAddress,
            evictionPremisesUse,
            includeLawyerFees,
        });

        applySpecificDeliveryItemsFields(executionData, {
            savedClaimTypes,
            specificDeliveryItems,
        });

        applyMaritalFurnitureClaimFields(executionData, {
            claimType,
            maritalFurnitureItems,
        });

        const lawyerFeesError = applyLawyerFeesClaimFields(executionData, {
            includeLawyerFees,
            lawyerFeesAmount,
            debtors,
            additionalDebtorsForm,
            debtorLawyerFeesClaims,
        });
        if (lawyerFeesError) {
            SmartToast.error(lawyerFeesError);
            return;
        }

        applyShariaDeedClaimExtras(executionData, {
            docType,
            claimType,
            dowryReason,
            guardianshipDetails,
        });

        applyApplicantRespondentFields(executionData, {
            representedParty,
            creditors,
            additionalCreditors,
            debtors,
            additionalDebtorsForm,
        });

        applyClosingFinancialAndMetaFields(executionData, {
            savedClaimTypes,
            claimType,
            globalClaimTotal,
            classification,
            clientFeesAmount,
            dueDate,
            executionTarget,
            intakeLegalSnapshot,
        });

        applySpecificDeliveryDebtExposureFields(executionData, savedClaimTypes);

        try {
            try {
                const executionFileDto = buildSupabaseExecutionFileDto(executionData);
                const { isLiveCloudSyncBucketEnabled } = await import(
                    '@/app/services/settings/cloudSyncBucket'
                );
                if (isLiveCloudSyncBucketEnabled('execution')) {
                    await SupabaseService.saveExecutionFile(executionFileDto);
                }
            } catch {
                SmartToast.warning('فُتحت الإضبارة محلياً — تعذّر المزامنة مع السحابة الآن');
            }

            onSave(executionData);
            SmartToast.success('✅ تم فتح الإضبارة التنفيذية بنجاح');
        } catch (error) {
            logger.error('❌ [ExecutionCreation] Save failed:', error);
            SmartToast.error('⚠️ فشل حفظ البيانات. يرجى المحاولة مرة أخرى.');
            return;
        }
    };

    return { handleSubmit };
}
