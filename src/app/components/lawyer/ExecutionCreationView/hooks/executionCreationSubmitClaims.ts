import { isEvictionClaim } from '@/app/utils/executionModuleStrategies';
import {
    aggregateSpecificDeliveryDebtExposure,
    applyIntakeDestroyedFinancialization,
    normalizeSpecificDeliveryItemsForSave,
    syncSpecificDeliveryLegacyFields,
    type SpecificDeliveryItem,
} from '@/app/utils/specificDeliveryItemsUtils';
import type { VisitationScheduleConfig } from '@/app/types/visitationSchedule';
import { buildVisitationScheduleBundle } from '@/app/domain/execution/visitation/visitationScheduleEngine';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import {
    normalizeMaritalFurnitureItems,
    sumMaritalFurnitureTotal,
} from '@/app/utils/maritalFurniture';
import type {
    AdditionalDebtorDraft,
    DebtorDraft,
    ExecutionDraftRecord,
} from '../types';
import type { AlimonyCalculationResult } from './useAlimonyCalculator';
import { parseMoneyInput } from './executionFormUtils';

function hasOngoingAlimonyInClaims(savedClaimTypes: string[]): boolean {
    return savedClaimTypes.some((ct) => ct === 'نفقة' || ct === 'حجة نفقة اتفاقية');
}

export function applyAlimonyClaimFields(
    executionData: ExecutionDraftRecord,
    input: {
        claimType: string;
        savedClaimTypes: string[];
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
        aggregatedClaimTotal: number;
    },
): void {
    const {
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
    } = input;

    const hasOngoingAlimonyClaim = hasOngoingAlimonyInClaims(savedClaimTypes);
    if (!(hasOngoingAlimonyClaim || claimType === 'نفقة')) return;

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
        calculated: calculatedAlimonyNew
            ? {
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
              }
            : null,
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
                      0),
            ),
        );
    } else if (aggregatedClaimTotal > 0) {
        executionData.totalAmount = aggregatedClaimTotal;
    }
}

export function applyPastAlimonyClaimFields(
    executionData: ExecutionDraftRecord,
    input: {
        savedClaimTypes: string[];
        alimonyBeneficiary: 'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد';
        alimonyLawsuitDate: string;
        alimonyExecutionDate: string;
        alimonyWifeMonthly: string;
        alimonyPastLawSystem: 'قانون الأحوال الشخصية 1959' | 'الفقه الجعفري';
        alimonyPastStartDate: string;
        pastWifeAlimonyAmount: string;
        claimAmountsByType: Record<string, string>;
        calculatedAlimonyNew: AlimonyCalculationResult | null | undefined;
    },
): void {
    const {
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
    } = input;

    if (!savedClaimTypes.includes('نفقة ماضية')) return;

    const hasOngoingAlimonyClaim = hasOngoingAlimonyInClaims(savedClaimTypes);
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

export function applyVisitationClaimFields(
    executionData: ExecutionDraftRecord,
    input: {
        savedClaimTypes: string[];
        claimType: string;
        visitationScheduleDraft: Partial<VisitationScheduleConfig>;
        visitationChildrenNames: string[];
    },
): void {
    const { savedClaimTypes, claimType, visitationScheduleDraft, visitationChildrenNames } =
        input;
    if (!(savedClaimTypes.includes('مشاهدة') || claimType === 'مشاهدة')) return;

    const built = buildVisitationScheduleBundle(
        visitationScheduleDraft as VisitationScheduleConfig,
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

export function applyCustodyClaimFields(
    executionData: ExecutionDraftRecord,
    input: {
        savedClaimTypes: string[];
        claimType: string;
        custodyWardNames: string[];
    },
): void {
    const { savedClaimTypes, claimType, custodyWardNames } = input;
    if (!(savedClaimTypes.includes('تسليم ولد') || claimType === 'تسليم ولد')) return;
    const trimmedWards = custodyWardNames.map((n) => n.trim()).filter(Boolean);
    if (trimmedWards.length > 0) {
        executionData.custodyWardNames = trimmedWards;
    }
}

export function applyEvictionClaimFields(
    executionData: ExecutionDraftRecord,
    input: {
        claimType: string;
        evictionPropertyNumber: string;
        evictionDistrict: string;
        evictionPropertyType: string;
        evictionFullAddress: string;
        evictionPremisesUse: 'commercial' | 'residential';
        includeLawyerFees: boolean;
    },
): void {
    const {
        claimType,
        evictionPropertyNumber,
        evictionDistrict,
        evictionPropertyType,
        evictionFullAddress,
        evictionPremisesUse,
        includeLawyerFees,
    } = input;
    if (!isEvictionClaim(claimType)) return;
    executionData.property_number = evictionPropertyNumber.trim();
    executionData.district = evictionDistrict.trim();
    executionData.property_type = evictionPropertyType.trim();
    executionData.full_address = evictionFullAddress.trim();
    executionData.eviction_premises_use = evictionPremisesUse;
    executionData.eviction_lawyer_fee_waived_at_intake = !includeLawyerFees;
}

export function applySpecificDeliveryItemsFields(
    executionData: ExecutionDraftRecord,
    input: {
        savedClaimTypes: string[];
        specificDeliveryItems: SpecificDeliveryItem[];
    },
): void {
    const { savedClaimTypes, specificDeliveryItems } = input;
    if (!savedClaimTypes.includes('تسليم شيء معين')) return;

    let normalizedItems = normalizeSpecificDeliveryItemsForSave(specificDeliveryItems);
    if (normalizedItems.length > 0) {
        normalizedItems = applyIntakeDestroyedFinancialization(normalizedItems);
        executionData.specificDeliveryItems = normalizedItems;
        Object.assign(executionData, syncSpecificDeliveryLegacyFields(normalizedItems));
    }
}

/** يُستدعى بعد ضبط الدين المالي العام حتى تتجاوز قيمة التسليم الهالك/المالي. */
export function applySpecificDeliveryDebtExposureFields(
    executionData: ExecutionDraftRecord,
    savedClaimTypes: string[],
): void {
    if (!savedClaimTypes.includes('تسليم شيء معين')) return;
    const sdItems = executionData.specificDeliveryItems as SpecificDeliveryItem[] | undefined;
    const finTotal = sdItems?.length ? aggregateSpecificDeliveryDebtExposure(sdItems) : 0;
    if (finTotal > 0) {
        executionData.debtAmount = finTotal;
        executionData.totalAmount = finTotal;
        (executionData as { total_remaining_balance?: number }).total_remaining_balance = finTotal;
        (executionData as { paidDebt?: number }).paidDebt = 0;
    }
}

export function applyMaritalFurnitureClaimFields(
    executionData: ExecutionDraftRecord,
    input: {
        claimType: string;
        maritalFurnitureItems: MaritalFurnitureItem[];
    },
): void {
    if (input.claimType !== 'أثاث زوجية') return;
    const normalizedFurniture = normalizeMaritalFurnitureItems(input.maritalFurnitureItems);
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

export function applyShariaDeedClaimExtras(
    executionData: ExecutionDraftRecord,
    input: {
        docType: string;
        claimType: string;
        dowryReason: 'طلاق' | 'وفاة';
        guardianshipDetails: string;
    },
): void {
    const { docType, claimType, dowryReason, guardianshipDetails } = input;
    if (docType !== 'الحجج الشرعية') return;
    if (claimType === 'مهر مؤجل' || claimType === 'حجة زواج - مهر مؤجل') {
        executionData.dowryReason = dowryReason;
    }
    if (claimType === 'حجة وصاية' || claimType === 'حجة تخارج') {
        executionData.guardianshipDetails = guardianshipDetails;
    }
}

/** @returns رسالة خطأ إن تجاوزت حصص الأتعاب المستقلة الإجمالي؛ وإلا null. */
export function applyLawyerFeesClaimFields(
    executionData: ExecutionDraftRecord,
    input: {
        includeLawyerFees: boolean;
        lawyerFeesAmount: string;
        debtors: DebtorDraft[];
        additionalDebtorsForm: AdditionalDebtorDraft[];
        debtorLawyerFeesClaims: Record<string, string>;
    },
): string | null {
    const {
        includeLawyerFees,
        lawyerFeesAmount,
        debtors,
        additionalDebtorsForm,
        debtorLawyerFeesClaims,
    } = input;
    if (!includeLawyerFees) return null;

    const globalLawyerFees = parseMoneyInput(lawyerFeesAmount);
    const independentLawyerFeesSum = [...debtors, ...additionalDebtorsForm]
        .filter((d) => !d.isSolidaryLiability)
        .reduce(
            (sum, d) => sum + parseMoneyInput(debtorLawyerFeesClaims[String(d.id)] ?? ''),
            0,
        );
    if (independentLawyerFeesSum > globalLawyerFees) {
        return '⚠️ مجموع حصص أتعاب المدينين المستقلين يتجاوز إجمالي الأتعاب المحكوم بها';
    }
    executionData.includeLawyerFees = true;
    executionData.lawyerFeesAmount = globalLawyerFees;
    return null;
}
