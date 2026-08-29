import type { CriminalDefendant } from './criminalStore';
import { filterSeveranceSelectableDefendants } from './investigationDefendantPurge';

export const INVESTIGATION_DOSSIER_SEVERANCE_HINT =
    'يُنشئ إضبارة تحقيق جديدة ويُزيل المتهمين المفرّقين من الأم مع ترحيل ما يخصّهم حصرياً من الطلبات والقرارات والإفادات.';

/** تجزئة مسار هارب — إحالة موازية دون ملف مستقل (`case_split_fugitive_referral`). */
export const INVESTIGATION_FUGITIVE_PARALLEL_SPLIT_LABEL =
    'تجزئة مسار: إحالة غير الهاربين + استمرار التحقيق بحق الهارب';

/** يُعرَض عند محاولة الإحالة قبل تفريق إضبارة مختلطة (حدث + بالغ). */
export const INVESTIGATION_MIXED_JUVENILE_ADULT_REFERRAL_BLOCKED_MESSAGE =
    'لا يمكن إحالة المتهم الحدث مع المتهم البالغ في قرار واحد — استخدم «تفريق الإضبارة» أولاً.';

/** يُعرَض في مودال التفريق عند وجود حدث وبالغ في نفس الإضبارة. */
export const INVESTIGATION_MIXED_JUVENILE_ADULT_SEVERANCE_GUIDANCE =
    'لا يمكن إحالة أحداث وبالغين معاً — يجب تفريق الإضبارة: حدّد المتهمين المراد شطرهم (أحداث أو بالغين) إلى إضبارة مستقلة، ثم أكمل الإحالة لكل إضبارة على حدة.';

/** يُعرَض عند محاولة الإحالة قبل كشف هوية المجهول أو تفريقه عن المعلوم. */
export const INVESTIGATION_MIXED_UNKNOWN_IDENTIFIED_REFERRAL_BLOCKED_MESSAGE =
    'لا يمكن إحالة المتهم المجهول مع المتهم المعلوم — يجب كشف هوية المجهول أو تفريق الإضبارة أولاً.';

/** يُعرَض في مودال التفريق عند وجود مجهول ومعلوم في نفس الإضبارة. */
export const INVESTIGATION_MIXED_UNKNOWN_IDENTIFIED_SEVERANCE_GUIDANCE =
    'لا يمكن إحالة مجهول ومعلوم معاً — إمّا كشف هوية المجهول أو تفريق الإضبارة: حدّد المجهولين أو المعلومين المراد شطرهم إلى إضبارة مستقلة، ثم أكمل الإحالة لكل إضبارة على حدة.';

/** إضبارة جديدة — كل المتهمين مجهولون. */
export const NEW_CASE_ALL_UNKNOWN_INVESTIGATION_ONLY_MESSAGE =
    'عندما يكون كل المتهمين مجهولين تقتصر الإضبارة على مرحلة التحقيق حتى ظهور هوية أحد المتهمين.';

/** إضبارة جديدة — متهم مجهول مع متهم معلوم ومحاولة اختيار مرحلة غير التحقيق. */
export const NEW_CASE_MIXED_UNKNOWN_IDENTIFIED_STAGE_BLOCKED_MESSAGE =
    'لا يمكن تسجيل الإضبارة بمرحلة محكمة (جنح/جنايات/تمييز…) مع وجود متهم مجهول ومتهم معلوم — تبقى الإضبارة في مرحلة التحقيق حتى كشف هوية المجهول أو تفريق الإضبارة.';

export function hasFugitiveDefendant(defendants: CriminalDefendant[] | undefined): boolean {
    return (Array.isArray(defendants) ? defendants : []).some(
        (d) => String(d.status ?? '').trim() === 'هارب',
    );
}

/** يتطلب متهماً هارباً ومتهماً آخر على الأقل لإحالة الفرع الموازي. */
export function caseAllowsFugitiveParallelSplit(defendants: CriminalDefendant[] | undefined): boolean {
    if (!hasFugitiveDefendant(defendants)) return false;
    return filterSeveranceSelectableDefendants(defendants).length >= 2;
}
