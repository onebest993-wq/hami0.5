import type { ExecutionFile } from '@/app/types/execution';
import type {
    AlimonyBeneficiaryDeathInput,
    AlimonyBeneficiaryProfile,
    OngoingAlimonyMonthlyDisplay,
} from '@/app/utils/alimonyBeneficiaryDeathTypes';
import { resolveAlimonyBeneficiaryProfile } from '@/app/utils/alimonyBeneficiaryDeathProfile';

/** إخفاء حاوية النفقة المستمرة في المركز المالي — حصراً عند وفاة المدين */
export function shouldSuppressOngoingAlimonyMonthlyUi(debtorDeceased: boolean): boolean {
    return Boolean(debtorDeceased);
}

/** عرض ديناميكي — يحترم نوع المستحق من الإضبارة (زوجة / أولاد / كلاهما) */
export function resolveOngoingAlimonyMonthlyDisplay(
    executionData: ExecutionFile | Record<string, unknown> | null | undefined,
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
                `${profile.childrenAlive} أولاد × ${profile.childMonthly.toLocaleString('ar-IQ')} د.ع = ${(profile.childMonthly * profile.childrenAlive).toLocaleString('ar-IQ')} د.ع/شهر`,
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
    executionData: ExecutionFile | Record<string, unknown> | null | undefined,
): number {
    return resolveOngoingAlimonyMonthlyDisplay(executionData).total;
}

/** عدد مستحقي النفقة المستمرة المتبقين على قيد الحياة */
export function countAliveAlimonyBeneficiaries(profile: AlimonyBeneficiaryProfile): number {
    return (profile.wifeAlive ? 1 : 0) + Math.max(0, profile.childrenAlive);
}

/** أكثر من مستحق حي — يُعرض محدّد «من توفّى» */
export function shouldShowAlimonyBeneficiaryDeathPicker(
    profile: AlimonyBeneficiaryProfile,
): boolean {
    return countAliveAlimonyBeneficiaries(profile) > 1;
}

/** آخر مستحق حي — إبلاغ مباشر دون نافذة الاختيار */
export function buildSoleSurvivorDeathInput(
    profile: AlimonyBeneficiaryProfile,
): AlimonyBeneficiaryDeathInput | null {
    if (countAliveAlimonyBeneficiaries(profile) !== 1) return null;
    if (profile.wifeAlive) return { wifeDeceased: true, childrenDiedCount: 0 };
    if (profile.childrenAlive > 0) return { wifeDeceased: false, childrenDiedCount: 1 };
    return null;
}
