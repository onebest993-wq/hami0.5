/**
 * تمييز مسار التبليغ/الإحضار والتنفيذ الجبري:
 * - موظف + مطالبة مالية (مبلغ محكوم و/أو أتعاب ضمن إضبارة «مالية»): إخبار بالتنفيذ ثم حصر الإكراه بحجز الراتب.
 * - هجين: التزام غير مالي بلا مبلغ محكوم + أتعاب محكومة للمحامي — أتعاب كمسار مالي، أصل المطالبة كمسار كاسب (إحضار/قبض…).
 * - كاسب + تنفيذ مالي صارم: لا إحضار جبري؛ حصر أدوات الحجز (راتب/عقار/مركبة) دون سفر/حبس/قبض.
 */

import { isEvictionClaim } from '@/app/utils/executionModuleStrategies';

export type DebtorSummonsProfile = 'employee_monetary' | 'earner_like' | 'hybrid_fees_non_monetary';

/** أتعاب محكومة مع أصل مطالبة غير مالي ودون مبلغ محكوم في الموضوع */
export function isHybridFeesNonMonetaryPrincipal(input: {
    isNonFinancialClaim: boolean;
    parsedDebtAmount: number;
    parsedLawyerFees: number;
}): boolean {
    const { isNonFinancialClaim, parsedDebtAmount, parsedLawyerFees } = input;
    return isNonFinancialClaim && parsedDebtAmount <= 0 && parsedLawyerFees > 0;
}

/**
 * تنفيذ يتضمن مالاً (محكوماً أو أتعاباً) فيُطبَّق مسار الإخبار بالتنفيذ وحصر أدوات الحجز —
 * ما عدا الهجين حيث يُفصل أصل المطالبة عن الأتعاب.
 */
export function executionMonetaryStrictPath(input: {
    parsedDebtAmount: number;
    parsedLawyerFees: number;
    isHybridFeesNonMonetary: boolean;
}): boolean {
    if (input.isHybridFeesNonMonetary) return false;
    return input.parsedDebtAmount > 0 || input.parsedLawyerFees > 0;
}

export function getDebtorSummonsProfile(input: {
    isGovernmentEmployee: boolean;
    parsedDebtAmount: number;
    parsedLawyerFees: number;
    claimType: string;
    isNonFinancialClaim: boolean;
}): DebtorSummonsProfile {
    const { isGovernmentEmployee, parsedDebtAmount, parsedLawyerFees, claimType, isNonFinancialClaim } = input;

    if (isHybridFeesNonMonetaryPrincipal({ isNonFinancialClaim, parsedDebtAmount, parsedLawyerFees })) {
        return 'hybrid_fees_non_monetary';
    }

    if (!isGovernmentEmployee) return 'earner_like';

    const ct = claimType || '';
    /**
     * مطالبة «غير مالية» في لوحة التنفيذ تشمل التخلية — وكانت تُصنِّف الموظف كـ earner_like فيظهر زر مذكرة الإحضار الجبري.
     * التخلية + موظف/متقاعد: يبقى المسار الموظفي (حجز راتب / واجهة التبليغ ثم المحضر) لا مسار الكاسب.
     */
    if (isNonFinancialClaim && isEvictionClaim(ct)) {
        return 'employee_monetary';
    }
    if (isNonFinancialClaim) return 'earner_like';

    const moneyInPrincipal = parsedDebtAmount > 0;
    if (!moneyInPrincipal && parsedLawyerFees <= 0) return 'earner_like';
    if (ct.includes('تسليم') && !ct.includes('ولد')) return 'earner_like';
    if (ct.includes('أثاث')) return 'earner_like';
    return 'employee_monetary';
}

/** إظهار أداة إدخال/حجز الراتب: للموظف في المسار المالي دائماً؛ وإلا فقط لتسليم شيء / أثاث / أتعاب محكوم بها */
/** موظف + مطالبة مالية: لا إحضار جبري ولا قبض — يُكتفى بحجز الخُمس من الراتب */
export function isEmployeeMonetaryFinancialPath(profile: DebtorSummonsProfile): boolean {
    return profile === 'employee_monetary';
}

/** مسار يُفعَّل فيه إحضار جبري/مفاتحة/قبض (كاسب أو هجين أصل غير مالي) */
export function isEarnerLikeSummonsBranch(profile: DebtorSummonsProfile): boolean {
    return profile === 'earner_like' || profile === 'hybrid_fees_non_monetary';
}

export function shouldShowEmployeeSalaryCapture(input: {
    profile: DebtorSummonsProfile;
    claimType: string;
    parsedLawyerFees: number;
}): boolean {
    if (input.profile === 'employee_monetary' || input.profile === 'hybrid_fees_non_monetary') return true;
    const ct = input.claimType || '';
    if (input.parsedLawyerFees > 0) return true;
    if (ct.includes('تسليم') && !ct.includes('ولد')) return true;
    if (ct.includes('أثاث')) return true;
    return false;
}

export interface DebtorStatusChip {
    key: string;
    label: string;
    className: string;
}

/**
 * شارات إضافية بجانب المدين: تُقتصر على ما لا يُعرَض في الشارة الوحيدة.
 * لا تُكرّر التبليغ/المسار/الحضور — ذلك للسجل الزمني أو للشارة الرئيسية فقط.
 */
export function buildDebtorStatusChips(ctx: {
    hasGuarantor: boolean;
    remainingDebt: number;
}): DebtorStatusChip[] {
    const indigo =
        'backdrop-blur-sm bg-indigo-500/20 text-indigo-200 px-2 py-0.5 rounded-lg text-[9px] border border-indigo-400/30 font-bold';

    if (ctx.remainingDebt <= 0) return [];
    const chips: DebtorStatusChip[] = [];
    if (ctx.hasGuarantor) {
        chips.push({ key: 'guarantor', label: '⚖️ كفيل ضامن', className: indigo });
    }
    return chips;
}
