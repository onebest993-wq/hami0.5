
export function splitAmountEqually(total: number, parts: number): number[] {
    if (parts <= 0) return [];
    const t = Math.max(0, Math.round(total));
    if (t === 0) return Array(parts).fill(0);
    const base = Math.floor(t / parts);
    let rem = t - base * parts;
    const out = Array(parts).fill(base);
    for (let i = 0; i < rem; i++) out[i] += 1;
    return out;
}

/** حصة كل مدين: المتضامنون يحملون الذمة كاملة؛ غير المتضامنين يتقاسمون بالتساوي */
export function resolveDebtorAllocatedShares(
    globalClaimTotal: number,
    debtorSolidaryFlags: boolean[],
): number[] {
    if (debtorSolidaryFlags.length === 0) return [];
    if (globalClaimTotal <= 0) return debtorSolidaryFlags.map(() => 0);
    const nonSolidaryCount = debtorSolidaryFlags.filter((f) => !f).length;
    const nonSolidaryShares =
        nonSolidaryCount > 0 ? splitAmountEqually(globalClaimTotal, nonSolidaryCount) : [];
    let nonSolidaryIdx = 0;
    return debtorSolidaryFlags.map((solidary) => {
        if (solidary) return globalClaimTotal;
        return nonSolidaryShares[nonSolidaryIdx++] ?? 0;
    });
}

/**
 * توزيع يدوي: المدين المستقل = مبلغ مُدخل؛ الضامنون = الباقي (ذمة متضامنة لكل منهم).
 * manualBySlot[i] — مبلغ الدين للمدين المستقل في الموضع i (يُتجاهل للضامن).
 */
export function resolveManualDebtorAllocatedShares(
    globalClaimTotal: number,
    debtorSolidaryFlags: boolean[],
    manualBySlot: number[],
): { shares: number[]; independentSum: number; solidaryRemainder: number } {
    if (debtorSolidaryFlags.length === 0) {
        return { shares: [], independentSum: 0, solidaryRemainder: 0 };
    }
    const independentSum = debtorSolidaryFlags.reduce((sum, solidary, i) => {
        if (solidary) return sum;
        return sum + Math.max(0, Math.round(manualBySlot[i] ?? 0));
    }, 0);
    const solidaryRemainder = Math.max(0, Math.round(globalClaimTotal) - independentSum);
    const shares = debtorSolidaryFlags.map((solidary, i) => {
        if (solidary) return solidaryRemainder;
        return Math.max(0, Math.round(manualBySlot[i] ?? 0));
    });
    return { shares, independentSum, solidaryRemainder };
}

/** إجمالي الدين للعرض المالي — لا يُجمع ذمم الضامنين المكررة */
export function resolveExecutionPrincipalDebtTotal(
    globalClaimTotal: number,
    debtorSolidaryFlags: boolean[],
    manualBySlot: number[],
): number {
    if (globalClaimTotal > 0) return Math.round(globalClaimTotal);
    const { independentSum, solidaryRemainder } = resolveManualDebtorAllocatedShares(
        0,
        debtorSolidaryFlags,
        manualBySlot,
    );
    return independentSum + (debtorSolidaryFlags.some(Boolean) ? solidaryRemainder : 0);
}
