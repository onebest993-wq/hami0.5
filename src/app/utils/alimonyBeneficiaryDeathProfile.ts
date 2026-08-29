import type { ExecutionFile } from '@/app/types/execution';
import type {
    AlimonyBeneficiaryDeathState,
    AlimonyBeneficiaryProfile,
} from '@/app/utils/alimonyBeneficiaryDeathTypes';
import {
    deriveMissingMonthlyParts,
    parseMoneyInput,
    readAlimonyBlob,
    readBeneficiaryKind,
    readChildrenCount,
    readMoney,
    resolveBeneficiaryFlags,
    splitLumpMonthlyOngoing,
} from '@/app/utils/alimonyBeneficiaryDeathProfileHelpers';

export function readAlimonyBeneficiaryDeathState(
    executionData: ExecutionFile | Record<string, unknown> | null | undefined,
): AlimonyBeneficiaryDeathState {
    const raw = (executionData as { alimony_beneficiary_death?: AlimonyBeneficiaryDeathState })
        ?.alimony_beneficiary_death;
    return {
        wife_deceased: Boolean(raw?.wife_deceased),
        children_deceased_count: Math.max(0, Math.trunc(Number(raw?.children_deceased_count) || 0)),
        last_report_at: raw?.last_report_at,
    };
}

export function resolveAlimonyBeneficiaryProfile(
    executionData: ExecutionFile | Record<string, unknown> | null | undefined,
): AlimonyBeneficiaryProfile | null {
    if (!executionData) return null;
    const ed = executionData as Record<string, unknown>;
    const alimonyBlob = readAlimonyBlob(ed);
    const calc = (alimonyBlob?.calculated ?? null) as {
        wifeBaseAccumulation?: number;
        childrenBaseAccumulation?: number;
        monthlyOngoing?: number;
    } | null;

    const beneficiary = readBeneficiaryKind(alimonyBlob, ed);
    const deathState = readAlimonyBeneficiaryDeathState(ed);

    let childrenCount = readChildrenCount(ed, alimonyBlob);
    if (
        childrenCount <= 0 &&
        beneficiary.includes('أولاد') &&
        !(deathState.children_deceased_count && deathState.children_deceased_count > 0)
    ) {
        childrenCount = Math.max(1, Math.trunc(Number(alimonyBlob?.childrenCount) || 1));
    }

    let wifeMonthly =
        readMoney(ed.monthlyWifeAlimony) ||
        readMoney(ed.monthly_wife_alimony) ||
        parseMoneyInput(alimonyBlob?.wifeMonthly) ||
        readMoney(alimonyBlob?.wifeAmount) ||
        readMoney((ed.alimony as { wifeAmount?: number })?.wifeAmount);

    let childMonthly =
        readMoney(ed.monthlyChildrenAlimony) ||
        readMoney(ed.monthly_children_alimony) ||
        parseMoneyInput(alimonyBlob?.childrenMonthly) ||
        readMoney(alimonyBlob?.childAmount) ||
        readMoney((ed.alimony as { childAmount?: number })?.childAmount);

    if (wifeMonthly <= 0 && beneficiary === 'زوجة فقط') {
        const lumpWife = readMoney(ed.monthlyAlimony);
        if (lumpWife > 0) wifeMonthly = lumpWife;
    }

    const lumpOngoing =
        wifeMonthly <= 0 && childMonthly <= 0
            ? readMoney(ed.monthlyAlimony) || Number(calc?.monthlyOngoing) || 0
            : 0;
    if (wifeMonthly <= 0 && childMonthly <= 0 && lumpOngoing > 0) {
        const split = splitLumpMonthlyOngoing(beneficiary, lumpOngoing, childrenCount);
        wifeMonthly = split.wifeMonthly;
        childMonthly = split.childMonthly;
    }

    const lumpForDerive =
        lumpOngoing || readMoney(ed.monthlyAlimony) || Number(calc?.monthlyOngoing) || 0;
    if ((wifeMonthly <= 0 || childMonthly <= 0) && lumpForDerive > 0 && childrenCount > 0) {
        const derived = deriveMissingMonthlyParts(
            beneficiary,
            wifeMonthly,
            childMonthly,
            childrenCount,
            lumpForDerive,
        );
        wifeMonthly = derived.wifeMonthly;
        childMonthly = derived.childMonthly;
    }

    const { hasWifeBenefit, hasChildrenBenefit } = resolveBeneficiaryFlags(
        beneficiary,
        wifeMonthly,
        childMonthly,
        childrenCount,
        calc,
    );
    if (!hasWifeBenefit && !hasChildrenBenefit) return null;

    const wifeAlive = hasWifeBenefit && !deathState.wife_deceased;
    const childrenDeceased = deathState.children_deceased_count ?? 0;
    const childrenAlive = hasChildrenBenefit
        ? childrenDeceased > 0
            ? Math.max(0, childrenCount)
            : Math.max(0, childrenCount - childrenDeceased)
        : 0;

    if (deathState.wife_deceased || childrenDeceased > 0) {
        const persistedWife =
            readMoney(ed.monthlyWifeAlimony) || readMoney(ed.monthly_wife_alimony);
        const persistedChild =
            readMoney(ed.monthlyChildrenAlimony) || readMoney(ed.monthly_children_alimony);
        const persistedTotal = readMoney(ed.monthlyAlimony);

        if (wifeAlive && persistedWife > 0) wifeMonthly = persistedWife;
        else if (!wifeAlive) wifeMonthly = 0;

        if (childrenAlive > 0 && persistedChild > 0) childMonthly = persistedChild;
        else childMonthly = 0;

        if (wifeAlive && childrenAlive <= 0 && wifeMonthly <= 0 && persistedTotal > 0) {
            wifeMonthly = persistedTotal;
        }
    }

    return {
        beneficiaryKind: beneficiary,
        hasWifeBenefit,
        hasChildrenBenefit,
        childrenCount,
        wifeMonthly,
        childMonthly,
        deathState,
        wifeAlive,
        childrenAlive,
        anyBeneficiaryAlive: wifeAlive || childrenAlive > 0,
    };
}
