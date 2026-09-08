import { SmartToast } from '@/app/components/ui/SmartToast';
import logger from '@/app/utils/logger';
import { SupabaseService } from '@/app/services/SupabaseService';
import SecureStoreService from '@/app/services/SecureStoreService';
import { sanitizeProfilePlainText } from '@/app/services/profile/profileUrlSanitize';
import type { ExecutionArchiveFile } from '@/app/types/common';
import { useEffect, useRef } from 'react';
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

let executionCreationSubmitOpenCounter = 0;
let lastActiveCreationSubmitExecutionId: string | number = 0;
const executionCreationSubmitSessionIdRef_stub = { current: 0 };
const activeExecutionCreationSubmitSessionIdRef_stub = { current: 0 };

export function cleanupExecutionCreationSubmit(): void {
    activeExecutionCreationSubmitSessionIdRef_stub.current = 0;
}

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
    const executionCreationSessionIdRef = useRef(0);
    const activeExecutionCreationSessionIdRef = useRef(0);

    useEffect(() => {
        return () => {
            void import('@/app/services/execution/tearDownExecutionFloatingState')
                .then((m) => m.tearDownExecutionFloatingState({
                    targetSurface: 'execution-creation',
                    reason: 'unmount',
                }))
                .catch(() => { /* tearDown never throws */ });
            activeExecutionCreationSessionIdRef.current = 0;
        };
    }, []);

    const handleSubmit = async () => {
        // EXECUTION_OWNERSHIP_GUARD
        try { if (typeof SecureStoreService?.ensurePersistedReady === 'function') void SecureStoreService.ensurePersistedReady(); } catch {}
        const sessionCast = SecureStoreService as unknown as { _sessionUserId?: string | null };
        const userId = sessionCast?._sessionUserId ?? null;
        if (!userId) return;
        executionCreationSubmitOpenCounter += 1;
        const newSessionId = executionCreationSubmitOpenCounter;
        executionCreationSessionIdRef.current = newSessionId;
        activeExecutionCreationSessionIdRef.current = newSessionId;
        executionCreationSubmitSessionIdRef_stub.current = newSessionId;
        activeExecutionCreationSubmitSessionIdRef_stub.current = newSessionId;
        lastActiveCreationSubmitExecutionId = `submit-${Date.now()}`;

        if (executionCreationSessionIdRef.current !== activeExecutionCreationSessionIdRef.current) return;

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

        if (executionCreationSessionIdRef.current !== activeExecutionCreationSessionIdRef.current) return;
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

        if (executionCreationSessionIdRef.current !== activeExecutionCreationSessionIdRef.current) return;
        const confirmed = await params.confirmInSection(
            'هل كل المعلومات المدخلة صحيحة؟\n\nتنبيه: بعض البيانات (نوع السند والمطالبة) لا يمكن تعديلها بعد فتح الإضبارة.',
        );
        if (executionCreationSessionIdRef.current !== activeExecutionCreationSessionIdRef.current) return;
        if (!confirmed) return;

        if (executionCreationSessionIdRef.current !== activeExecutionCreationSessionIdRef.current) return;
        const allocation = resolveDebtorPartyAllocation({
            claimType,
            debtors,
            additionalDebtorsForm,
            debtorManualDebtClaims,
            resolveGlobalClaimTotalNumber,
        });
        if (executionCreationSessionIdRef.current !== activeExecutionCreationSessionIdRef.current) return;
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

        if (executionCreationSessionIdRef.current !== activeExecutionCreationSessionIdRef.current) return;
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
        try {
            const anyRec = executionData as unknown as Record<string, unknown>;
            if (typeof anyRec.directorate === 'string') anyRec.directorate = sanitizeProfilePlainText(anyRec.directorate, 160);
            if (typeof anyRec.classification === 'string') anyRec.classification = sanitizeProfilePlainText(anyRec.classification, 200);
            if (typeof anyRec.docNumber === 'string') anyRec.docNumber = sanitizeProfilePlainText(anyRec.docNumber, 200);
            if (typeof anyRec.clientName === 'string') anyRec.clientName = sanitizeProfilePlainText(anyRec.clientName, 120);
            if (typeof anyRec.opponentName === 'string') anyRec.opponentName = sanitizeProfilePlainText(anyRec.opponentName, 120);
            const partyArrays = ['creditors', 'debtors', 'parties', 'additionalCreditors', 'additionalDebtors'];
            for (const key of partyArrays) {
                const arr = (anyRec as unknown as Record<string, unknown>)[key];
                if (Array.isArray(arr)) {
                    for (const row of arr) {
                        if (row && typeof row === 'object') {
                            const rr = row as Record<string, unknown>;
                            if (typeof rr.name === 'string') rr.name = sanitizeProfilePlainText(rr.name, 120);
                            if (typeof rr.fullName === 'string') rr.fullName = sanitizeProfilePlainText(rr.fullName, 120);
                            if (typeof rr.address === 'string') rr.address = sanitizeProfilePlainText(rr.address, 400);
                        }
                    }
                }
            }
        } catch { /* sanitize never throws at boundary */ }

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

        if (executionCreationSessionIdRef.current !== activeExecutionCreationSessionIdRef.current) return;
        try {
            try {
                if (executionCreationSessionIdRef.current !== activeExecutionCreationSessionIdRef.current) return;
                const executionFileDto = buildSupabaseExecutionFileDto(executionData);
                try {
                    const dtoRec = executionFileDto as unknown as Record<string, unknown>;
                    const dtoScalars = ['directorate','classification','docNumber','fileNumber','fileYear','claimType','clientName','opponentName','property_number','district','property_type','full_address'];
                    const dtoLimits: Record<string, number> = { directorate:160, classification:200, docNumber:200, fileNumber:40, fileYear:4, claimType:80, clientName:120, opponentName:120, property_number:80, district:200, property_type:200, full_address:200 };
                    for (const k of dtoScalars) {
                        if (typeof dtoRec[k] === 'string') {
                            dtoRec[k] = sanitizeProfilePlainText(dtoRec[k] as string, dtoLimits[k] ?? 255);
                        }
                    }
                    const dtoPartyArrays = ['creditors','debtors','parties'];
                    for (const arrKey of dtoPartyArrays) {
                        const arr = dtoRec[arrKey];
                        if (Array.isArray(arr)) {
                            for (const row of arr) {
                                if (row && typeof row === 'object') {
                                    const rr = row as Record<string, unknown>;
                                    if (typeof rr.name === 'string') rr.name = sanitizeProfilePlainText(rr.name, 120);
                                    if (typeof rr.fullName === 'string') rr.fullName = sanitizeProfilePlainText(rr.fullName, 120);
                                }
                            }
                        }
                    }
                } catch { /* network outbound sanitize never throws at boundary */ }
                const { isLiveCloudSyncBucketEnabled } = await import(
                    '@/app/services/settings/cloudSyncBucket'
                );
                if (executionCreationSessionIdRef.current !== activeExecutionCreationSessionIdRef.current) return;
                if (isLiveCloudSyncBucketEnabled('execution')) {
                    await SupabaseService.saveExecutionFile(executionFileDto);
                }
            } catch {
                if (executionCreationSessionIdRef.current !== activeExecutionCreationSessionIdRef.current) return;
                SmartToast.warning('فُتحت الإضبارة محلياً — تعذّر المزامنة مع السحابة الآن');
            }

            if (executionCreationSessionIdRef.current !== activeExecutionCreationSessionIdRef.current) return;
            onSave(executionData);
            SmartToast.success('✅ تم فتح الإضبارة التنفيذية بنجاح');
        } catch (error) {
            if (executionCreationSessionIdRef.current !== activeExecutionCreationSessionIdRef.current) return;
            logger.error('❌ [ExecutionCreation] Save failed:', error);
            SmartToast.error('⚠️ فشل حفظ البيانات. يرجى المحاولة مرة أخرى.');
            return;
        }
    };

    return { handleSubmit };
}
