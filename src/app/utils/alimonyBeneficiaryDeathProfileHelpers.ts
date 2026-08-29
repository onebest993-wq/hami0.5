import type { AlimonyBeneficiaryKind } from '@/app/utils/alimonyBeneficiaryDeathTypes';

export function parseMoneyInput(raw: unknown): number {
    const s = String(raw ?? '')
        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .replace(/,/g, '')
        .trim();
    const n = Math.round(parseFloat(s) || Number(s) || 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

export function readMoney(raw: unknown): number {
    return parseMoneyInput(raw);
}

export function readAlimonyBlob(ed: Record<string, unknown>) {
    const blob = ed.alimony;
    return blob && typeof blob === 'object' ? (blob as Record<string, unknown>) : null;
}

export function readChildrenCount(
    ed: Record<string, unknown>,
    alimonyBlob: Record<string, unknown> | null,
): number {
    const raw =
        ed.childrenCount ??
        ed.children_count ??
        ed.alimonyChildrenCount ??
        alimonyBlob?.childrenCount;
    const n = Math.trunc(Number(raw) || 0);
    return Math.max(0, n);
}

export function readBeneficiaryKind(
    alimonyBlob: Record<string, unknown> | null,
    ed: Record<string, unknown>,
): AlimonyBeneficiaryKind {
    const fromBlob = String(alimonyBlob?.beneficiary ?? '').trim();
    if (fromBlob) return fromBlob as AlimonyBeneficiaryKind;
    const legacy = String(ed.alimonyBeneficiary ?? ed.alimony_beneficiary ?? '').trim();
    return legacy as AlimonyBeneficiaryKind;
}

export function resolveBeneficiaryFlags(
    beneficiary: AlimonyBeneficiaryKind,
    wifeMonthly: number,
    childMonthly: number,
    childrenCount: number,
    calc?: {
        wifeBaseAccumulation?: number;
        childrenBaseAccumulation?: number;
        monthlyOngoing?: number;
    } | null,
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

export function splitLumpMonthlyOngoing(
    beneficiary: AlimonyBeneficiaryKind,
    lump: number,
    childrenCount: number,
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

export function deriveMissingMonthlyParts(
    beneficiary: AlimonyBeneficiaryKind,
    wifeMonthly: number,
    childMonthly: number,
    childrenCount: number,
    lumpOngoing: number,
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
