import { SmartToast } from '@/app/components/ui/SmartToast';
import logger from '@/app/utils/logger';
import { SupabaseService, type ExecutionFileDTO_Supabase } from '@/app/services/SupabaseService';
import { deriveMonetaryClaimNature } from '@/app/domain/execution/summons/summoningImmunityEngine';
import { isEvictionClaim } from '@/app/utils/executionModuleStrategies';
import type { ExecutionArchiveFile } from '@/app/types/common';
import {
    aggregateSpecificDeliveryDebtExposure,
    applyIntakeDestroyedFinancialization,
    normalizeSpecificDeliveryItemsForSave,
    syncSpecificDeliveryLegacyFields,
    type SpecificDeliveryItem,
} from '@/app/utils/specificDeliveryItemsUtils';
import {
    findMissingRequiredMonetaryClaimAmount,
    findMissingPastAlimonyClaimFieldMessage,
    isFinancialClaimForPartySplit,
    parseMoneyInput,
    resolveDebtorAllocatedShares,
    resolveManualDebtorAllocatedShares,
    splitAmountEqually,
} from './executionFormUtils';
import { generateExecutionDossierId } from '@/app/utils/executionStorageKeys';
import type { VisitationScheduleConfig } from '@/app/types/visitationSchedule';
import { buildVisitationScheduleBundle } from '@/app/domain/execution/visitation/visitationScheduleEngine';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import {
    normalizeMaritalFurnitureItems,
    sumMaritalFurnitureTotal,
} from '@/app/utils/maritalFurniture';
import type { ForeignJudgmentData } from '../components/ForeignJudgmentSection';
import type {
    AdditionalCreditorDraft,
    AdditionalDebtorDraft,
    CreditorDraft,
    DebtorDraft,
    ExecutionDraftParty,
    ExecutionDraftRecord,
    ExecutionTargetOption,
} from '../types';
import type { AlimonyCalculationResult } from './useAlimonyCalculator';

function resolveSupabaseExecutionType(docType: string): ExecutionFileDTO_Supabase['executionType'] {
    if (docType === 'قرارات وأحكام المحاكم' || docType === 'الحجج الشرعية') return 'شرعي';
    if (docType === 'تسليم شيء معين') return 'التزام بعمل/تسليم';
    return 'مدني';
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
    onSave: (fileData: ExecutionArchiveFile) => void;
}

/**
 * يبني إضبارة التنفيذ من كامل حالة النموذج (فحص + تجميع + حفظ) — مستخرج من
 * ExecutionCreationView لتقليص حجم المكوّن الرئيسي (Phase-1 split).
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
        } = params;

        // Validation
        if (!directorate.trim()) {
            SmartToast.error('⚠️ يرجى كتابة اسم مديرية التنفيذ');
            return;
        }

        if (!fileNumber.trim()) {
            SmartToast.error('⚠️ يرجى إدخال رقم الإضبارة والسنة');
            return;
        }

        // ✅ PROMPT 2: Check if at least one party is marked as client
        const hasClient =
            creditors.some((c) => c.isClient) ||
            additionalCreditors.some((c) => c.isClient) ||
            debtors.some((d) => d.isClient) ||
            additionalDebtorsForm.some((d) => d.isClient);
        if (!hasClient) {
            SmartToast.error('⚠️ يرجى تحديد موكلك من خلال اختيار "موكلي" لأحد الأطراف على الأقل');
            return;
        }

        if (!creditors[0]?.name.trim()) {
            SmartToast.error('⚠️ يرجى إكمال اسم الدائن');
            return;
        }

        for (let i = 0; i < additionalCreditors.length; i++) {
            if (!additionalCreditors[i].name.trim()) {
                SmartToast.error(`⚠️ يرجى إكمال اسم ${i + 2}- دائن`);
                return;
            }
        }

        if (!debtors[0]?.name.trim()) {
            SmartToast.error('⚠️ يرجى إكمال اسم المدين');
            return;
        }

        if (!allowMultipleDebtors && additionalDebtorsForm.length > 0) {
            SmartToast.error('⚠️ مطالبات أحوال شخصية لا تقبل تعدد المدينين — احذف المدينين الإضافيين');
            return;
        }

        const pendingClaimTypes =
            activeClaimTypes.length > 0 ? activeClaimTypes : claimType ? [claimType] : [];
        const missingMonetaryClaim = findMissingRequiredMonetaryClaimAmount(
            pendingClaimTypes,
            claimType,
            claimAmountsByType,
            totalAmount,
            { pastAlimonyAccumulation: calculatedAlimonyNew?.pastAccumulation },
        );
        if (missingMonetaryClaim) {
            const message =
                missingMonetaryClaim === 'نفقة ماضية'
                    ? findMissingPastAlimonyClaimFieldMessage({
                          alimonyPastStartDate,
                          alimonyLawsuitDate,
                          pastWifeMonthly: pastWifeAlimonyAmount,
                          fallbackWifeMonthly: alimonyWifeMonthly,
                      })
                    : `يرجى إدخال المبلغ المطلوب — ${missingMonetaryClaim}`;
            SmartToast.error(`⚠️ ${message}`);
            return;
        }

        for (let i = 0; i < additionalDebtorsForm.length; i++) {
            if (!additionalDebtorsForm[i].name.trim()) {
                SmartToast.error(`⚠️ يرجى إكمال اسم المدين الإضافي ${i + 1}`);
                return;
            }
        }

        if (pendingClaimTypes.includes('تسليم شيء معين')) {
            if (specificDeliveryItems.length === 0) {
                SmartToast.error(
                    '⚠️ أضف شيئاً واحداً على الأقل وحدّد نوعه (منقول أو غير منقول)',
                );
                return;
            }
            for (const item of specificDeliveryItems) {
                if (!String(item.name || '').trim()) {
                    SmartToast.error(
                        item.nature === 'immovable'
                            ? '⚠️ أدخل رقم العقار لكل شيء غير منقول'
                            : '⚠️ أدخل وصف الشيء المنقول'
                    );
                    return;
                }
                if (item.declaredDestroyed && !(Math.trunc(Number(item.judgmentValueIqd) || 0) > 0)) {
                    SmartToast.error(
                        `⚠️ أدخل القيمة المحكوم بها للشيء الهالك: ${item.name.trim() || '—'}`,
                    );
                    return;
                }
            }
            const normalizedItems = normalizeSpecificDeliveryItemsForSave(specificDeliveryItems);
            if (normalizedItems.length === 0) {
                SmartToast.error(
                    '⚠️ أضف شيئاً واحداً على الأقل وحدّد نوعه (منقول أو غير منقول)',
                );
                return;
            }
        }

        if (isEvictionClaim(claimType)) {
            if (!evictionPropertyNumber.trim()) {
                SmartToast.error('⚠️ رقم العقار (أو رقم الدار) مطلوب لتخلية المأجور');
                return;
            }
            if (!evictionDistrict.trim()) {
                SmartToast.error('⚠️ المقاطعة مطلوبة');
                return;
            }
            if (!evictionPropertyType.trim()) {
                SmartToast.error('⚠️ نوع وجنس العقار مطلوب');
                return;
            }
            if (!evictionFullAddress.trim()) {
                SmartToast.error('⚠️ العنوان الكامل للعين مطلوب');
                return;
            }
        }

        // PHASE 17: Foreign judgment validation
        if (docType === 'تنفيذ الأحكام الأجنبية') {
            if (!foreignData.country.trim()) {
                SmartToast.error('⚠️ يرجى تحديد دولة إصدار الحكم الأجنبي');
                return;
            }
            if (!foreignData.court.trim()) {
                SmartToast.error('⚠️ يرجى تحديد اسم المحكمة المصدرة');
                return;
            }
        }

        // 🔍 TARGET FILTER A: Commercial Papers - Endorser Block
        if (docType === 'الأوراق التجارية' && executionTarget === 'المُظَهِّر') {
            SmartToast.error('🛑 يمنع القانون التنفيذ المباشر على المُظَهِّر. يجب إقامة دعوى تجارية في محكمة البداءة أولاً.');
            return;
        }

        // 🔍 TARGET FILTER B: Debt Acknowledgments - Non-Joint Guarantor Block
        if (docType === 'السندات المتضمنة إقراراً بدين' && executionTarget === 'كفيل غير متضامن') {
            SmartToast.error('🛑 لا يجوز التنفيذ المباشر. يجب التنفيذ على المدين الأصلي وتجريده من أمواله أولاً.');
            return;
        }

        // 🛑 REGULAR DOCUMENT BLOCKER: Hard Block
        if (isDocumentBlocked) {
            SmartToast.error('🛑 توقف: فقدَ هذا السند قوته التنفيذية المباشرة. يجب إقامة دعوى إثبات دين في محكمة البداءة.');
            return;
        }

        if (claimType === 'مشاهدة' || activeClaimTypes.includes('مشاهدة')) {
            const built = buildVisitationScheduleBundle(
                visitationScheduleDraft as VisitationScheduleConfig
            );
            if ('error' in built) {
                SmartToast.error(`⚠️ ${built.error}`);
                return;
            }
        }

        // Parse file number and year
        const fileParts = fileNumber.split('/');
        const extractedNumber = fileParts[0] || fileNumber;
        const extractedYear = fileParts.length > 1 ? fileParts[1] : new Date().getFullYear().toString();

        // Build execution data based on type (PHASE 17: Multi-party + تعدد الخصوم)
        const clientCreditors = [
            ...creditors.filter((c) => c.isClient),
            ...additionalCreditors.filter((c) => c.isClient),
        ];
        const representedParty = clientCreditors.length > 0 ? 'creditor' : 'debtor';

        const totalDebtorSlots = 1 + additionalDebtorsForm.length;
        const globalClaimTotal = resolveGlobalClaimTotalNumber();
        const applyPartySplit = isFinancialClaimForPartySplit(claimType) && totalDebtorSlots > 0;
        const debtorSolidaryFlags = [
            Boolean(debtors[0]?.isSolidaryLiability),
            ...additionalDebtorsForm.map((d) => Boolean(d.isSolidaryLiability)),
        ];
        const anySolidaryDebtor = debtorSolidaryFlags.some(Boolean);
        const hasIndependentDebtor = debtorSolidaryFlags.some((f) => !f);
        const manualBySlot = [
            parseMoneyInput(debtorManualDebtClaims[String(debtors[0]?.id ?? '')] ?? ''),
            ...additionalDebtorsForm.map((d) =>
                parseMoneyInput(debtorManualDebtClaims[String(d.id)] ?? ''),
            ),
        ];
        let debtorAllocatedShares: number[] = Array(totalDebtorSlots).fill(0);
        let solidaryRemainderDebt = 0;
        if (applyPartySplit && globalClaimTotal > 0) {
            if (hasIndependentDebtor || anySolidaryDebtor) {
                const resolved = resolveManualDebtorAllocatedShares(
                    globalClaimTotal,
                    debtorSolidaryFlags,
                    manualBySlot,
                );
                debtorAllocatedShares = resolved.shares;
                solidaryRemainderDebt = resolved.solidaryRemainder;
                if (resolved.independentSum > globalClaimTotal) {
                    SmartToast.error(
                        '⚠️ مجموع ديون المدينين المستقلين يتجاوز إجمالي المطالبة المالية',
                    );
                    return;
                }
            } else {
                debtorAllocatedShares = resolveDebtorAllocatedShares(
                    globalClaimTotal,
                    debtorSolidaryFlags,
                );
            }
        }

        const mappedCreditorsForFile: ExecutionDraftParty[] = [
            {
                id: creditors[0].id,
                name: creditors[0].name,
                phone: creditors[0].phone,
                address: creditors[0].address,
                occupation: creditors[0].occupation,
                isClient: creditors[0].isClient,
                role: 'creditor',
                type: 'individual',
                nationality: '',
            },
        ];

        const executionData: ExecutionDraftRecord = {
            id: generateExecutionDossierId(),
            type: classification === 'شرعي' ? 'sharia' : 'civil',
            title: claimType
                ? `${directorate} - ${claimType} - ${extractedNumber}/${extractedYear}`
                : `${directorate} - ${extractedNumber}/${extractedYear}`,
            directorate,
            fileNumber: extractedNumber.trim(),
            fileYear: extractedYear.trim(),
            representedParty,
            creditors: mappedCreditorsForFile,
            debtors: debtors as unknown as ExecutionDraftParty[],
            creditor: creditors[0] as unknown as ExecutionDraftParty,
            debtor: debtors[0] as unknown as ExecutionDraftParty,
            totalAmount: 0,
            docType,
            docNumber,
            judgmentDate,
            status: 'active',
            createdAt: new Date().toISOString(),
            debtorJob: debtors[0]?.occupation || 'كاسب',
        };

        // ✅ CRITICAL LOGIC: Add Commercial Paper Data (Cheque/Bill of Exchange)
        if (docType === 'الأوراق التجارية') {
            executionData.chequeBankName = chequeBankName;
            executionData.chequeIssueDate = chequeIssueDate;
            executionData.chequeNumber = chequeNumber;
            // Override docNumber with chequeNumber for consistency
            executionData.docNumber = chequeNumber;
        }

        // PHASE 17: Add foreign judgment data if applicable
        if (docType === 'تنفيذ الأحكام الأجنبية') {
            executionData.foreignData = foreignData;
        }

        // PHASE 49: Add Sharia Deed identification if applicable
        if (docType === 'الحجج الشرعية') {
            executionData.shariaDeedNumber = shariaDeedNumber;
            executionData.shariaRegisterNumber = shariaRegisterNumber;
            executionData.shariaIssueDate = shariaIssueDate;
            executionData.shariaIssuingCourt = shariaIssuingCourt;

            // MASTER PHASE: Sharia Deed Details (Will & Takharuj)
            if (['حجة وصية', 'حجة تخارج'].includes(claimType)) {
                executionData.shariaDeedDetails = shariaDeedDetails;
            }
        }

        // PHASE 29: Unified claim type logic (+ جمع مطالبات أحوال شخصية المرتبطة)
        const savedClaimTypes =
            activeClaimTypes.length > 0 ? activeClaimTypes : claimType ? [claimType] : [];
        executionData.claimType = savedClaimTypes[0] ?? claimType;
        if (savedClaimTypes.length > 0) {
            (executionData as Record<string, unknown>).claimTypes = savedClaimTypes;
        }
        const parsedClaimAmounts = Object.fromEntries(
            Object.entries(claimAmountsByType)
                .map(([k, v]) => [k, parseMoneyInput(v)] as const)
                .filter(([, n]) => n > 0)
        );
        if (Object.keys(parsedClaimAmounts).length > 0) {
            (executionData as Record<string, unknown>).claimAmountsByType = parsedClaimAmounts;
        }

        // ─── محرك الإحضار: استنتاج تلقائي من نوع المطالبة ومهنة المدين وهدف التنفيذ (دون حقول يدوية) ───
        const inferIsAlimonyClaim = (ct: string) =>
            Boolean(ct?.includes('نفقة') && !ct?.includes('نفقة عدة') && !ct?.includes('مهر'));
        const hasOngoingAlimonyClaim = savedClaimTypes.some((ct) => ct === 'نفقة' || ct === 'حجة نفقة اتفاقية');
        executionData.summoningClaimNature = deriveMonetaryClaimNature(claimType, null);
        executionData.isAlimony =
            hasOngoingAlimonyClaim || savedClaimTypes.some((ct) => inferIsAlimonyClaim(ct));
        const targetHasGuarantor =
            typeof executionTarget === 'string' && executionTarget.includes('كفيل');
        executionData.hasGuarantor = targetHasGuarantor;
        const firstDebtorOcc = debtors[0]?.occupation;
        /** بدون إدخال يدوي: نفترض تغطية الراتب عند موظف+نفقة حتى يُثبت العجز لاحقاً من الإضبارة */
        executionData.salaryCoversAlimony =
            firstDebtorOcc === 'موظف' && executionData.isAlimony === true;
        executionData.debtors = debtors.map((d, i) => {
            const emp = d.occupation === 'موظف';
            const debtorKey = String(d.id);
            const perDebtorLawyerFees = parseMoneyInput(debtorLawyerFeesClaims[debtorKey] ?? '');
            return {
                ...d,
                employmentType: d.occupation,
                isEmployee: emp,
                employmentInitialWasEmployee: emp,
                hasGuarantor: i === 0 ? targetHasGuarantor : false,
                isSolidaryLiability: Boolean(d.isSolidaryLiability),
                ...(includeLawyerFees && perDebtorLawyerFees > 0 && !d.isSolidaryLiability
                    ? { lawyerFeesClaimAmount: perDebtorLawyerFees }
                    : {}),
                ...(applyPartySplit
                    ? { allocated_debt: debtorAllocatedShares[i] ?? 0, paid_amount: 0 }
                    : {}),
            };
        }) as unknown as ExecutionArchiveFile['debtors'];
        if (executionData.debtor && executionData.debtors[0]) {
            executionData.debtor = executionData.debtors[0];
        }

        const additionalDebtorRecords = additionalDebtorsForm.map((d, i) => {
            const emp = d.occupation === 'موظف';
            const occ = d.occupation === 'موظف' ? 'موظف' : 'كاسب';
            const perDebtorLawyerFees = parseMoneyInput(debtorLawyerFeesClaims[String(d.id)] ?? '');
            return {
                id: String(d.id),
                name: d.name.trim(),
                phone: d.phone.trim() || undefined,
                address: d.address.trim() || undefined,
                occupation: occ,
                employmentType: occ,
                isEmployee: emp,
                employmentInitialWasEmployee: emp,
                status: 'Active' as const,
                isSolidaryLiability: Boolean(d.isSolidaryLiability),
                ...(includeLawyerFees && perDebtorLawyerFees > 0 && !d.isSolidaryLiability
                    ? { lawyerFeesClaimAmount: perDebtorLawyerFees }
                    : {}),
                allocated_debt: applyPartySplit ? debtorAllocatedShares[i + 1] ?? 0 : 0,
                paid_amount: 0,
            };
        });

        let trimmedAdditionalCreditors = additionalCreditors
            .filter((c) => c.name.trim())
            .map((c) => {
                const emp = c.occupation === 'موظف';
                const occ = c.occupation === 'موظف' ? 'موظف' : 'كاسب';
                return {
                    id: c.id,
                    name: c.name.trim(),
                    phone: c.phone.trim() || undefined,
                    address: c.address.trim() || undefined,
                    occupation: occ,
                    employmentType: occ,
                    isEmployee: emp,
                    isClient: c.isClient || false,
                    paid_amount: 0,
                };
            });

        const totalCreditorSlots = 1 + trimmedAdditionalCreditors.length;
        const creditorClaimTotal =
            globalClaimTotal > 0
                ? globalClaimTotal
                : parseMoneyInput(totalAmount) > 0
                  ? parseMoneyInput(totalAmount)
                  : parseMoneyInput(claimAmount);
        if (creditorClaimTotal > 0 && totalCreditorSlots >= 1) {
            const creditorShares = splitAmountEqually(creditorClaimTotal, totalCreditorSlots);
            const primaryCreditor = {
                ...executionData.creditors[0],
                allocated_debt: creditorShares[0] ?? 0,
                paid_amount: 0,
            };
            executionData.creditors = [primaryCreditor];
            executionData.creditor = primaryCreditor;
            trimmedAdditionalCreditors = trimmedAdditionalCreditors.map((c, i) => ({
                ...c,
                allocated_debt: creditorShares[i + 1] ?? 0,
            }));
        }

        if (trimmedAdditionalCreditors.length > 0 || additionalDebtorRecords.length > 0 || anySolidaryDebtor) {
            executionData.party_multiplicity = {
                additionalCreditors: trimmedAdditionalCreditors,
                additionalDebtors: additionalDebtorRecords,
                isSolidaryLiability: debtorSolidaryFlags.every(Boolean),
                ...(solidaryRemainderDebt > 0 ? { solidaryRemainderDebt } : {}),
            };
        }

        // PHASE 30: Financial amounts (expanded list + MASTER PHASE: All 3 Sharia Deeds)
        const aggregatedClaimTotal = resolveGlobalClaimTotalNumber();
        if (aggregatedClaimTotal > 0) {
            executionData.totalAmount = aggregatedClaimTotal;
        } else if (parseMoneyInput(totalAmount) > 0) {
            executionData.totalAmount = parseMoneyInput(totalAmount);
        } else if (parseMoneyInput(claimAmount) > 0) {
            executionData.totalAmount = parseMoneyInput(claimAmount);
        }

        // === 🎯 CRITICAL: SMART ALIMONY DATA SAVE (2026-03-12) ===
        if (hasOngoingAlimonyClaim || claimType === 'نفقة') {
            // النظام الذكي الجديد
            const parsedChildrenCount = Math.max(1, parseInt(alimonyChildrenCount, 10) || 1);
            const parsedWifeMonthly = parseFloat(alimonyWifeMonthly) || 0;
            const parsedChildrenMonthly = parseFloat(alimonyChildrenMonthly) || 0;

            executionData.alimony = {
                beneficiary: alimonyBeneficiary,
                lawsuitDate: alimonyLawsuitDate,
                executionDate: alimonyExecutionDate,
                wifeMonthly: alimonyWifeMonthly,
                childrenMonthly: alimonyChildrenMonthly,
                childrenCount: parsedChildrenCount,
                hasPastWife: alimonyIncludesPastCalc,
                pastLawSystem: alimonyPastLawSystem,
                pastStartDate: alimonyPastStartDate,
                pastWifeMonthly: pastWifeAlimonyAmount || alimonyWifeMonthly,
                calculated: calculatedAlimonyNew ? {
                    baseDurationMonths: calculatedAlimonyNew.baseDurationMonths,
                    baseDurationDays: calculatedAlimonyNew.baseDurationDays,
                    baseAccumulation: calculatedAlimonyNew.baseAccumulation,
                    wifeBaseAccumulation: calculatedAlimonyNew.wifeBaseAccumulation,
                    childrenBaseAccumulation: calculatedAlimonyNew.childrenBaseAccumulation,
                    pastDurationDays: calculatedAlimonyNew.pastDurationDays,
                    pastDurationMonths: calculatedAlimonyNew.pastDurationMonths,
                    pastDurationMonthsRaw: calculatedAlimonyNew.pastDurationMonthsRaw,
                    pastYearCapApplied: calculatedAlimonyNew.pastYearCapApplied,
                    pastAccumulation: calculatedAlimonyNew.pastAccumulation,
                    pastMonthlyUsed: calculatedAlimonyNew.pastMonthlyUsed,
                    totalAccumulated: calculatedAlimonyNew.totalAccumulated,
                    monthlyOngoing: calculatedAlimonyNew.monthlyOngoing,
                    legalCapApplied: calculatedAlimonyNew.legalCapApplied,
                    explanation: calculatedAlimonyNew.explanation,
                } : null,
            };

            executionData.monthlyAlimony = calculatedAlimonyNew?.monthlyOngoing || 0;
            executionData.monthlyWifeAlimony = parsedWifeMonthly;
            executionData.monthlyChildrenAlimony = parsedChildrenMonthly;
            executionData.childrenCount = parsedChildrenCount;
            if (alimonyIncludesPastCalc && calculatedAlimonyNew?.pastAccumulation) {
                executionData.pastWifeAlimony = Math.round(calculatedAlimonyNew.pastAccumulation);
            }
            if (alimonyIncludesPastCalc && (calculatedAlimonyNew?.pastAccumulation ?? 0) > 0) {
                (executionData as Record<string, unknown>).pastAlimonyClaim = {
                    pastLawSystem: alimonyPastLawSystem,
                    pastStartDate: alimonyPastStartDate,
                    lawsuitDate: alimonyLawsuitDate,
                    pastWifeMonthly: pastWifeAlimonyAmount || alimonyWifeMonthly,
                    amount: Math.round(calculatedAlimonyNew?.pastAccumulation ?? 0),
                    calculatedMonths: calculatedAlimonyNew?.pastDurationMonths ?? 0,
                    pastDurationDays: calculatedAlimonyNew?.pastDurationDays ?? 0,
                    pastYearCapApplied: calculatedAlimonyNew?.pastYearCapApplied ?? false,
                };
            }
            if (savedClaimTypes.length <= 1) {
                executionData.totalAmount = Math.max(
                    0,
                    Math.round(
                        savedClaimTypes.includes('نفقة ماضية')
                            ? (calculatedAlimonyNew?.pastAccumulation ?? 0)
                            : (calculatedAlimonyNew?.baseAccumulation ??
                              calculatedAlimonyNew?.totalAccumulated ??
                              0)
                    )
                );
            } else if (aggregatedClaimTotal > 0) {
                executionData.totalAmount = aggregatedClaimTotal;
            }
        }

        if (savedClaimTypes.includes('نفقة ماضية')) {
            const pastTotal =
                Math.round(calculatedAlimonyNew?.pastAccumulation ?? 0) ||
                parseMoneyInput(claimAmountsByType['نفقة ماضية'] ?? '');
            (executionData as Record<string, unknown>).pastAlimonyClaim = {
                pastLawSystem: alimonyPastLawSystem,
                pastStartDate: alimonyPastStartDate,
                lawsuitDate: alimonyLawsuitDate,
                pastWifeMonthly: pastWifeAlimonyAmount || alimonyWifeMonthly,
                amount: pastTotal,
                calculatedMonths: calculatedAlimonyNew?.pastDurationMonths ?? 0,
                pastDurationDays: calculatedAlimonyNew?.pastDurationDays ?? 0,
                pastYearCapApplied: calculatedAlimonyNew?.pastYearCapApplied ?? false,
            };
            if (pastTotal > 0) {
                executionData.pastWifeAlimony = pastTotal;
            }
            // مطالبة نفقة ماضية منفصلة — لقطة calculated للمركز المالي
            if (!hasOngoingAlimonyClaim && (pastTotal > 0 || calculatedAlimonyNew)) {
                executionData.alimony = {
                    beneficiary: alimonyBeneficiary || 'زوجة فقط',
                    lawsuitDate: alimonyLawsuitDate,
                    executionDate: alimonyExecutionDate,
                    hasPastWife: true,
                    pastLawSystem: alimonyPastLawSystem,
                    pastStartDate: alimonyPastStartDate,
                    pastWifeMonthly: pastWifeAlimonyAmount || alimonyWifeMonthly,
                    calculated: calculatedAlimonyNew
                        ? {
                              baseDurationMonths: 0,
                              baseDurationDays: 0,
                              baseAccumulation: 0,
                              wifeBaseAccumulation: 0,
                              childrenBaseAccumulation: 0,
                              pastDurationDays: calculatedAlimonyNew.pastDurationDays,
                              pastDurationMonths: calculatedAlimonyNew.pastDurationMonths,
                              pastDurationMonthsRaw: calculatedAlimonyNew.pastDurationMonthsRaw,
                              pastYearCapApplied: calculatedAlimonyNew.pastYearCapApplied,
                              pastAccumulation: pastTotal || calculatedAlimonyNew.pastAccumulation,
                              pastMonthlyUsed: calculatedAlimonyNew.pastMonthlyUsed,
                              totalAccumulated: pastTotal || calculatedAlimonyNew.pastAccumulation,
                              monthlyOngoing: 0,
                              legalCapApplied: calculatedAlimonyNew.legalCapApplied,
                              explanation: calculatedAlimonyNew.explanation,
                          }
                        : pastTotal > 0
                          ? {
                                baseDurationMonths: 0,
                                baseDurationDays: 0,
                                baseAccumulation: 0,
                                wifeBaseAccumulation: 0,
                                childrenBaseAccumulation: 0,
                                pastAccumulation: pastTotal,
                                totalAccumulated: pastTotal,
                                monthlyOngoing: 0,
                            }
                          : null,
                };
                if (savedClaimTypes.length <= 1 && pastTotal > 0) {
                    executionData.totalAmount = pastTotal;
                }
            }
        }

        // مشاهدة واستصحاب: جدولة + أسماء الأولاد
        if (savedClaimTypes.includes('مشاهدة') || claimType === 'مشاهدة') {
            const built = buildVisitationScheduleBundle(
                visitationScheduleDraft as VisitationScheduleConfig
            );
            if ('bundle' in built) {
                (executionData as Record<string, unknown>).visitationSchedule = built.bundle;
                executionData.includesSleepover =
                    visitationScheduleDraft.decisionMode === 'viewing_pickup_sleepover';
            }
            const trimmedChildNames = visitationChildrenNames.map((n) => n.trim()).filter(Boolean);
            if (trimmedChildNames.length > 0) {
                executionData.visitationChildrenNames = trimmedChildNames;
            }
        }

        if (savedClaimTypes.includes('تسليم ولد') || claimType === 'تسليم ولد') {
            const trimmedWards = custodyWardNames.map((n) => n.trim()).filter(Boolean);
            if (trimmedWards.length > 0) {
                executionData.custodyWardNames = trimmedWards;
            }
        }

        if (isEvictionClaim(claimType)) {
            executionData.property_number = evictionPropertyNumber.trim();
            executionData.district = evictionDistrict.trim();
            executionData.property_type = evictionPropertyType.trim();
            executionData.full_address = evictionFullAddress.trim();
            executionData.eviction_premises_use = evictionPremisesUse;
            executionData.eviction_lawyer_fee_waived_at_intake = !includeLawyerFees;
        }

        if (savedClaimTypes.includes('تسليم شيء معين')) {
            let normalizedItems = normalizeSpecificDeliveryItemsForSave(specificDeliveryItems);
            if (normalizedItems.length > 0) {
                normalizedItems = applyIntakeDestroyedFinancialization(normalizedItems);
                executionData.specificDeliveryItems = normalizedItems;
                Object.assign(executionData, syncSpecificDeliveryLegacyFields(normalizedItems));
            }
        }

        // Furniture details
        if (claimType === 'أثاث زوجية') {
            const normalizedFurniture = normalizeMaritalFurnitureItems(maritalFurnitureItems);
            executionData.maritalFurnitureItems = normalizedFurniture;
            executionData.furnitureValue = sumMaritalFurnitureTotal(normalizedFurniture);
            executionData.furnitureDetails = normalizedFurniture
                .map((row) => `${row.name} × ${row.quantity}`)
                .join('؛ ');
            executionData.debtAmount = 0;
            executionData.totalAmount = 0;
            (executionData as { total_remaining_balance?: number }).total_remaining_balance = 0;
            (executionData as { paidDebt?: number }).paidDebt = 0;
        }

        // PHASE 30: Iddah alimony now handled via totalAmount in financial claims section

        // Lawyer fees — أتعاب المحاماة المحكوم بها (بين السند المنفذ وأطراف الإضبارة)
        if (includeLawyerFees) {
            const globalLawyerFees = parseMoneyInput(lawyerFeesAmount);
            const independentLawyerFeesSum = [...debtors, ...additionalDebtorsForm]
                .filter((d) => !d.isSolidaryLiability)
                .reduce(
                    (sum, d) => sum + parseMoneyInput(debtorLawyerFeesClaims[String(d.id)] ?? ''),
                    0,
                );
            if (independentLawyerFeesSum > globalLawyerFees) {
                SmartToast.error(
                    '⚠️ مجموع حصص أتعاب المدينين المستقلين يتجاوز إجمالي الأتعاب المحكوم بها',
                );
                return;
            }
            executionData.includeLawyerFees = true;
            executionData.lawyerFeesAmount = globalLawyerFees;
        }

        // Commercial paper due date
        if (dueDate) {
            executionData.dueDate = dueDate;
        }

        // 🔍 Execution Target (للأوراق التجارية والسندات العادية)
        if (executionTarget) {
            executionData.executionTarget = executionTarget;
        }

        // PHASE 31: Sharia Deed specific data
        // ✅ UPDATED: Support new marriage deed types
        if (docType === 'الحجج الشرعية') {
            if (claimType === 'مهر مؤجل' || claimType === 'حجة زواج - مهر مؤجل') {
                executionData.dowryReason = dowryReason;
            }
            if (claimType === 'حجة وصاية' || claimType === 'حجة تخارج') {
                executionData.guardianshipDetails = guardianshipDetails;
            }
        }

        // ✅ PROMPT 2: Use representedParty derived from isClient flags (يشمل المدين الإضافي كموكل)
        const creditorClientRow =
            creditors.find((c) => c.isClient) ||
            additionalCreditors.find((c) => c.isClient) ||
            creditors[0];
        const debtorClientRow =
            [...debtors, ...additionalDebtorsForm].find((d) => d.isClient) || debtors[0];
        executionData.applicant =
            representedParty === 'creditor'
                ? creditorClientRow.name
                : debtorClientRow.name;
        executionData.respondent =
            representedParty === 'creditor'
                ? debtors[0]?.name ?? ''
                : creditors[0]?.name ?? '';
        executionData.initiatorRole = representedParty as string;

        if (
            (savedClaimTypes.some((ct) => isFinancialClaimForPartySplit(ct)) ||
                isFinancialClaimForPartySplit(claimType)) &&
            globalClaimTotal > 0
        ) {
            executionData.debtAmount = globalClaimTotal;
            executionData.total_remaining_balance = globalClaimTotal;
            executionData.paidDebt = 0;
        }

        if (savedClaimTypes.includes('تسليم شيء معين')) {
            const sdItems = executionData.specificDeliveryItems as SpecificDeliveryItem[] | undefined;
            const finTotal = sdItems?.length ? aggregateSpecificDeliveryDebtExposure(sdItems) : 0;
            if (finTotal > 0) {
                executionData.debtAmount = finTotal;
                executionData.totalAmount = finTotal;
                (executionData as { total_remaining_balance?: number }).total_remaining_balance =
                    finTotal;
                (executionData as { paidDebt?: number }).paidDebt = 0;
            }
        }

        // Add classification (from unified dropdown) — executionType للشريط الجوزي (ليس docType)
        if (classification && classification !== 'none') {
            executionData.classification = classification;
            executionData.executionType =
                classification === 'شرعي' ? 'شرعي / أحوال شخصية' : 'مدني';
        }

        // Add clientFeesAmount if it exists
        if (parseMoneyInput(clientFeesAmount) > 0) {
            executionData.clientFeesAmount = parseMoneyInput(clientFeesAmount);
        }

        try {
            const creditorData = executionData.creditor || executionData.creditors?.[0];
            const debtorData = executionData.debtor || executionData.debtors?.[0];

            try {
                const executionFileDto: ExecutionFileDTO_Supabase = {
                    id: executionData.id,
                    caseNo: executionData.fileNumber + '/' + executionData.fileYear,
                    executionType: resolveSupabaseExecutionType(String(executionData.docType ?? '')),
                    court: executionData.directorate,
                    executionBasis: executionData.executionBasis || '',
                    creditor: creditorData as unknown as Record<string, unknown>,
                    debtor: debtorData as unknown as Record<string, unknown>,
                    totalAmount: parseFloat(String(executionData.totalAmount || 0).replace(/,/g, '')),
                    status:
                        executionData.status === 'active' ||
                        executionData.status === 'archived' ||
                        executionData.status === 'completed'
                            ? executionData.status
                            : 'active',
                };
                await SupabaseService.saveExecutionFile(executionFileDto);
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

        // DON'T call onClose() here - handleAddExecutionFile will manage the flow
    };

    return { handleSubmit };
}
