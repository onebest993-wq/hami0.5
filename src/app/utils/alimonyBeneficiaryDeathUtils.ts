import type { ExecutionFile } from '@/app/types/execution';
import {
    getEffectiveClaimTypes,
    hasCompositeNonOngoingClaimTypes,
} from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import { resolveAlimonyFinancialBreakdown } from '@/app/utils/alimonyFinancialBreakdown';

export interface AlimonyBeneficiaryDeathState {
    wife_deceased?: boolean;
    children_deceased_count?: number;
    last_report_at?: string;
}

export interface AlimonyBeneficiaryProfile {
    beneficiaryKind: AlimonyBeneficiaryKind;
    hasWifeBenefit: boolean;
    hasChildrenBenefit: boolean;
    childrenCount: number;
    wifeMonthly: number;
    childMonthly: number;
    deathState: AlimonyBeneficiaryDeathState;
    wifeAlive: boolean;
    childrenAlive: number;
    anyBeneficiaryAlive: boolean;
}

function parseMoneyInput(raw: unknown): number {
    const s = String(raw ?? '')
        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .replace(/,/g, '')
        .trim();
    const n = Math.round(parseFloat(s) || Number(s) || 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function readMoney(raw: unknown): number {
    return parseMoneyInput(raw);
}

export type AlimonyBeneficiaryKind = 'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد' | '';

export interface OngoingAlimonyMonthlyDisplay {
    total: number;
    beneficiaryKind: AlimonyBeneficiaryKind;
    detailLines: string[];
}

function readAlimonyBlob(ed: Record<string, unknown>) {
    const blob = ed.alimony;
    return blob && typeof blob === 'object' ? (blob as Record<string, unknown>) : null;
}

function readChildrenCount(ed: Record<string, unknown>, alimonyBlob: Record<string, unknown> | null): number {
    const raw =
        ed.childrenCount ??
        ed.children_count ??
        ed.alimonyChildrenCount ??
        alimonyBlob?.childrenCount;
    const n = Math.trunc(Number(raw) || 0);
    return Math.max(0, n);
}

function readBeneficiaryKind(
    alimonyBlob: Record<string, unknown> | null,
    ed: Record<string, unknown>
): AlimonyBeneficiaryKind {
    const fromBlob = String(alimonyBlob?.beneficiary ?? '').trim();
    if (fromBlob) return fromBlob as AlimonyBeneficiaryKind;
    const legacy = String(ed.alimonyBeneficiary ?? ed.alimony_beneficiary ?? '').trim();
    return legacy as AlimonyBeneficiaryKind;
}

function resolveBeneficiaryFlags(
    beneficiary: AlimonyBeneficiaryKind,
    wifeMonthly: number,
    childMonthly: number,
    childrenCount: number,
    calc?: {
        wifeBaseAccumulation?: number;
        childrenBaseAccumulation?: number;
        monthlyOngoing?: number;
    } | null
): { hasWifeBenefit: boolean; hasChildrenBenefit: boolean } {
    if (beneficiary === 'زوجة فقط') {
        return { hasWifeBenefit: true, hasChildrenBenefit: false };
    }
    if (beneficiary === 'أولاد فقط') {
        return {
            hasWifeBenefit: false,
            hasChildrenBenefit:
                childrenCount > 0 ||
                childMonthly > 0 ||
                Number(calc?.childrenBaseAccumulation) > 0,
        };
    }
    if (beneficiary === 'زوجة وأولاد') {
        return {
            hasWifeBenefit:
                wifeMonthly > 0 ||
                Number(calc?.wifeBaseAccumulation) > 0 ||
                Number(calc?.monthlyOngoing) > 0,
            hasChildrenBenefit:
                childrenCount > 0 &&
                (childMonthly > 0 || Number(calc?.childrenBaseAccumulation) > 0),
        };
    }

    let hasWifeBenefit = wifeMonthly > 0 || Number(calc?.wifeBaseAccumulation) > 0;
    let hasChildrenBenefit =
        (childMonthly > 0 && childrenCount > 0) || Number(calc?.childrenBaseAccumulation) > 0;

    if (!hasWifeBenefit && !hasChildrenBenefit && Number(calc?.monthlyOngoing) > 0) {
        hasWifeBenefit = true;
        hasChildrenBenefit = childrenCount > 0;
    }

    return { hasWifeBenefit, hasChildrenBenefit };
}

function deriveMissingMonthlyParts(
    beneficiary: AlimonyBeneficiaryKind,
    wifeMonthly: number,
    childMonthly: number,
    childrenCount: number,
    lumpOngoing: number
): { wifeMonthly: number; childMonthly: number } {
    let wife = wifeMonthly;
    let child = childMonthly;
    const lump = Math.max(0, Math.trunc(lumpOngoing));

    if (child <= 0 && childrenCount > 0) {
        if (wife > 0 && lump > wife) {
            child = Math.round((lump - wife) / childrenCount);
        } else if (lump > 0) {
            const split = splitLumpMonthlyOngoing(beneficiary, lump, childrenCount);
            if (child <= 0) child = split.childMonthly;
            if (wife <= 0) wife = split.wifeMonthly;
        } else if (wife > 0 && beneficiary === 'زوجة وأولاد') {
            const impliedTotal = Math.round(wife / 0.6);
            child = Math.round((impliedTotal * 0.4) / childrenCount);
        }
    } else if (wife <= 0 && lump > 0) {
        const split = splitLumpMonthlyOngoing(beneficiary, lump, childrenCount);
        wife = split.wifeMonthly;
        if (child <= 0) child = split.childMonthly;
    }

    return { wifeMonthly: wife, childMonthly: child };
}

function splitLumpMonthlyOngoing(
    beneficiary: AlimonyBeneficiaryKind,
    lump: number,
    childrenCount: number
): { wifeMonthly: number; childMonthly: number } {
    const ongoing = Math.max(0, Math.trunc(lump));
    if (ongoing <= 0) return { wifeMonthly: 0, childMonthly: 0 };
    if (beneficiary === 'زوجة فقط') return { wifeMonthly: ongoing, childMonthly: 0 };
    if (beneficiary === 'أولاد فقط' && childrenCount > 0) {
        return { wifeMonthly: 0, childMonthly: Math.round(ongoing / childrenCount) };
    }
    if (beneficiary === 'زوجة وأولاد' && childrenCount > 0) {
        const childMonthly = Math.round((ongoing * 0.4) / childrenCount);
        const wifeMonthly = Math.max(0, ongoing - childMonthly * childrenCount);
        return { wifeMonthly, childMonthly };
    }
    return { wifeMonthly: ongoing, childMonthly: 0 };
}

export function readAlimonyBeneficiaryDeathState(
    executionData: ExecutionFile | Record<string, unknown> | null | undefined
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
    executionData: ExecutionFile | Record<string, unknown> | null | undefined
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
        lumpOngoing ||
        readMoney(ed.monthlyAlimony) ||
        Number(calc?.monthlyOngoing) ||
        0;
    if ((wifeMonthly <= 0 || childMonthly <= 0) && lumpForDerive > 0 && childrenCount > 0) {
        const derived = deriveMissingMonthlyParts(
            beneficiary,
            wifeMonthly,
            childMonthly,
            childrenCount,
            lumpForDerive
        );
        wifeMonthly = derived.wifeMonthly;
        childMonthly = derived.childMonthly;
    }

    const { hasWifeBenefit, hasChildrenBenefit } = resolveBeneficiaryFlags(
        beneficiary,
        wifeMonthly,
        childMonthly,
        childrenCount,
        calc
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

        if (
            wifeAlive &&
            childrenAlive <= 0 &&
            wifeMonthly <= 0 &&
            persistedTotal > 0
        ) {
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

export interface AlimonyBeneficiaryDeathInput {
    wifeDeceased?: boolean;
    childrenDiedCount?: number;
}

/** إغلاق الإضبارة بعد استنفاد مستحقي النفقة — ما لم تبقَ مطالبات مركّبة بمبلغ متبقٍ */
export function shouldCloseDossierAfterAllAlimonyBeneficiariesDeceased(
    executionData: ExecutionFile | Record<string, unknown> | null | undefined,
    survivingTotalAmount: number
): boolean {
    if (!hasCompositeNonOngoingClaimTypes(executionData as Record<string, unknown>)) {
        return true;
    }
    return Math.max(0, Math.round(Number(survivingTotalAmount) || 0)) <= 0;
}

export function buildAlimonyBeneficiaryDeathMerge(
    executionData: ExecutionFile | Record<string, unknown> | null | undefined,
    input: AlimonyBeneficiaryDeathInput
): Record<string, unknown> | null {
    const profile = resolveAlimonyBeneficiaryProfile(executionData);
    if (!profile) return null;

    const wifeDeceased = Boolean(input.wifeDeceased) && profile.wifeAlive;
    const childrenDied = Math.max(
        0,
        Math.min(
            Math.trunc(Number(input.childrenDiedCount) || 0),
            profile.childrenAlive
        )
    );
    if (!wifeDeceased && childrenDied <= 0) return null;

    const prev = profile.deathState;
    const nextDeathState: AlimonyBeneficiaryDeathState = {
        wife_deceased: prev.wife_deceased || wifeDeceased,
        children_deceased_count: (prev.children_deceased_count ?? 0) + childrenDied,
        last_report_at: new Date().toISOString(),
    };

    const ed = executionData as Record<string, unknown>;
    const pastSeparate = getEffectiveClaimTypes(ed).includes('نفقة ماضية');
    const breakdown = resolveAlimonyFinancialBreakdown(executionData as ExecutionFile);
    let reduction = 0;
    if (wifeDeceased && breakdown) {
        reduction += breakdown.wifeBaseAccumulation;
        if (!pastSeparate) {
            reduction += breakdown.pastWifeAccumulation;
        }
    }
    if (childrenDied > 0 && breakdown && profile.childrenCount > 0) {
        const ongoingPerChild = breakdown.childrenBaseAccumulation / profile.childrenCount;
        const pastPerChild = pastSeparate
            ? 0
            : (breakdown.pastChildrenAccumulation || 0) / profile.childrenCount;
        reduction += (ongoingPerChild + pastPerChild) * childrenDied;
    }

    const nextChildrenCount = Math.max(0, profile.childrenAlive - childrenDied);
    const nextWifeMonthly =
        profile.hasWifeBenefit && !nextDeathState.wife_deceased ? profile.wifeMonthly : 0;
    const nextChildMonthly =
        profile.hasChildrenBenefit && nextChildrenCount > 0 ? profile.childMonthly : 0;

    const calc = (ed.alimony as { calculated?: Record<string, unknown> } | undefined)?.calculated;
    const nextCalculated = calc
        ? {
              ...calc,
              wifeBaseAccumulation: nextDeathState.wife_deceased
                  ? 0
                  : calc.wifeBaseAccumulation,
              childrenBaseAccumulation:
                  nextChildrenCount <= 0
                      ? 0
                      : Math.max(
                            0,
                            Math.round(
                                (Number(calc.childrenBaseAccumulation) || 0) -
                                    (childrenDied > 0 && profile.childrenCount > 0
                                        ? ((Number(calc.childrenBaseAccumulation) || 0) /
                                              profile.childrenCount) *
                                          childrenDied
                                        : 0)
                            )
                        ),
              baseAccumulation: Math.max(
                  0,
                  Math.round((Number(calc.baseAccumulation) || 0) - reduction)
              ),
              totalAccumulated: pastSeparate
                  ? Math.max(
                        0,
                        Math.round((Number(calc.baseAccumulation) || 0) - reduction)
                    )
                  : Math.max(
                        0,
                        Math.round((Number(calc.totalAccumulated) || 0) - reduction)
                    ),
          }
        : undefined;

    const prevTotal = readMoney(ed.totalAmount);
    const nextTotal = Math.max(0, prevTotal - reduction);

    const wifeAliveAfter =
        profile.hasWifeBenefit && !nextDeathState.wife_deceased;
    const childrenAliveAfter = profile.hasChildrenBenefit ? nextChildrenCount : 0;
    const nextMonthlyOngoing =
        (wifeAliveAfter ? nextWifeMonthly : 0) +
        (childrenAliveAfter > 0 ? nextChildMonthly * childrenAliveAfter : 0);
    const allDeceased = !wifeAliveAfter && childrenAliveAfter <= 0;

    const prevAlimony =
        typeof ed.alimony === 'object' && ed.alimony ? (ed.alimony as Record<string, unknown>) : {};
    const nextCalculatedWithOngoing = nextCalculated
        ? { ...nextCalculated, monthlyOngoing: nextMonthlyOngoing }
        : nextMonthlyOngoing > 0
          ? { monthlyOngoing: nextMonthlyOngoing }
          : undefined;

    const merge: Record<string, unknown> = {
        alimony_beneficiary_death: nextDeathState,
        monthlyWifeAlimony: nextWifeMonthly,
        monthly_wife_alimony: nextWifeMonthly,
        monthlyChildrenAlimony: nextChildMonthly,
        monthly_children_alimony: nextChildMonthly,
        monthlyAlimony: nextMonthlyOngoing,
        childrenCount: nextChildrenCount,
        children_count: nextChildrenCount,
        alimonyChildrenCount: String(nextChildrenCount),
        totalAmount: nextTotal,
        alimony: {
            ...prevAlimony,
            ...(profile.beneficiaryKind ? { beneficiary: profile.beneficiaryKind } : {}),
            wifeMonthly: nextWifeMonthly > 0 ? String(nextWifeMonthly) : '0',
            childrenMonthly: nextChildMonthly > 0 ? String(nextChildMonthly) : '0',
            childrenCount: nextChildrenCount,
            ...(nextCalculatedWithOngoing ? { calculated: nextCalculatedWithOngoing } : {}),
        },
    };

    if (allDeceased) {
        merge.is_creditor_deceased = true;
        if (shouldCloseDossierAfterAllAlimonyBeneficiariesDeceased(ed, nextTotal)) {
            Object.assign(merge, {
                dossier_lifecycle_status: 'finished',
                dossier_status_reason: 'وفاة جميع مستحقي النفقة — إغلاق الإضبارة',
                dossier_status_date: new Date().toISOString().slice(0, 10),
            });
        }
    }

    return merge;
}

/** إخفاء حاوية النفقة المستمرة في المركز المالي — حصراً عند وفاة المدين */
export function shouldSuppressOngoingAlimonyMonthlyUi(debtorDeceased: boolean): boolean {
    return Boolean(debtorDeceased);
}

/** عرض ديناميكي — يحترم نوع المستحق من الإضبارة (زوجة / أولاد / كلاهما) */
export function resolveOngoingAlimonyMonthlyDisplay(
    executionData: ExecutionFile | Record<string, unknown> | null | undefined
): OngoingAlimonyMonthlyDisplay {
    const profile = resolveAlimonyBeneficiaryProfile(executionData);
    if (!profile || !profile.anyBeneficiaryAlive) {
        return { total: 0, beneficiaryKind: '', detailLines: [] };
    }

    const detailLines: string[] = [];
    if (profile.hasWifeBenefit && profile.wifeAlive && profile.wifeMonthly > 0) {
        detailLines.push(`الزوجة: ${profile.wifeMonthly.toLocaleString('ar-IQ')} د.ع/شهر`);
    }
    if (profile.hasChildrenBenefit && profile.childrenAlive > 0 && profile.childMonthly > 0) {
        if (profile.childrenAlive === 1) {
            detailLines.push(`الطفل: ${profile.childMonthly.toLocaleString('ar-IQ')} د.ع/شهر`);
        } else {
            detailLines.push(
                `${profile.childrenAlive} أولاد × ${profile.childMonthly.toLocaleString('ar-IQ')} د.ع = ${(profile.childMonthly * profile.childrenAlive).toLocaleString('ar-IQ')} د.ع/شهر`
            );
        }
    }

    const total =
        (profile.hasWifeBenefit && profile.wifeAlive ? profile.wifeMonthly : 0) +
        (profile.hasChildrenBenefit
            ? profile.childMonthly * Math.max(0, profile.childrenAlive)
            : 0);

    return {
        total,
        beneficiaryKind: profile.beneficiaryKind,
        detailLines,
    };
}

/** النفقة الشهرية للمستحقين الأحياء فقط (بعد وفاة مستحقين — لا تُخفى الحاوية) */
export function resolveSurvivorOngoingMonthlyAlimonyIqd(
    executionData: ExecutionFile | Record<string, unknown> | null | undefined
): number {
    return resolveOngoingAlimonyMonthlyDisplay(executionData).total;
}

/** عدد مستحقي النفقة المستمرة المتبقين على قيد الحياة */
export function countAliveAlimonyBeneficiaries(profile: AlimonyBeneficiaryProfile): number {
    return (profile.wifeAlive ? 1 : 0) + Math.max(0, profile.childrenAlive);
}

/** أكثر من مستحق حي — يُعرض محدّد «من توفّى» */
export function shouldShowAlimonyBeneficiaryDeathPicker(profile: AlimonyBeneficiaryProfile): boolean {
    return countAliveAlimonyBeneficiaries(profile) > 1;
}

/** آخر مستحق حي — إبلاغ مباشر دون نافذة الاختيار */
export function buildSoleSurvivorDeathInput(
    profile: AlimonyBeneficiaryProfile
): AlimonyBeneficiaryDeathInput | null {
    if (countAliveAlimonyBeneficiaries(profile) !== 1) return null;
    if (profile.wifeAlive) return { wifeDeceased: true, childrenDiedCount: 0 };
    if (profile.childrenAlive > 0) return { wifeDeceased: false, childrenDiedCount: 1 };
    return null;
}
