import type { FollowupSpecializationVisibility } from '@/app/utils/followupSpecializationVisibility';
import type { ExecutionFile } from '@/app/types/execution';
import type { PersonalCoerciveSubtype } from '@/app/utils/executorSeizureDecisionQueue';

export interface HiddenFollowupVisibilityInput extends FollowupSpecializationVisibility {
    /** هل تبويب التنفيذ الجبري الشخصي ظاهر في محضر المتابعة */
    showPersonalCoerciveFollowupTab: boolean;
    /** هل تُعرض بطاقات حجز الكفيل النشطة في تبويب حجز المدين (وليس طلب الكفيل) */
    showGuarantorInSeizureTab: boolean;
    /** قرارات المحاكم — أحوال شخصية / شرعي */
    isPersonalStatusExecutionClaim?: boolean;
    /** مطالبة نفقة (دون نفقة عدة / مهر) */
    isAlimonyClaim?: boolean;
    /** عرض الإضبارة في الطلبات المخفية — كاسب + مبلغ مالي قائم */
    showHiddenExecutiveDossierPresentation?: boolean;
    /** المدين الموظف — لا مفاتحة تحقيق ولا عرض إضبارة ولا حبس */
    activeDebtorIsEmployee?: boolean;
    /** تبويب التنفيذ الجبري الشخصي ظاهر لكن مقفول للموظف — الإجراءات تبقى في الطلبات المخفية */
    personalTabLockedForEmployee?: boolean;
    /** نزع حضانة — تُفعَّل الإجراءات الجبرية للموظف والكاسب */
    isCustodyRemovalClaim?: boolean;
}

export type HiddenPersonalCoerciveRequestKey =
    | 'forced_bring_in'
    | 'travel_ban'
    | 'arrest_warrant_investigation'
    | 'executive_dossier_presentation'
    | 'executive_detention_judge';

export type HiddenGuarantorRequestKey =
    | 'guarantor_request'
    | 'guarantor_seizure_salary'
    | 'guarantor_seizure_property'
    | 'guarantor_seizure_movable';

export interface HiddenPersonalCoerciveCatalogItem {
    key: HiddenPersonalCoerciveRequestKey;
    subtype: PersonalCoerciveSubtype | null;
    label: string;
    shortLabel: string;
    submitTitle?: string;
    submitBody?: string;
    isHidden: (flags: HiddenFollowupVisibilityInput) => boolean;
}

export interface HiddenGuarantorCatalogItem {
    key: HiddenGuarantorRequestKey;
    label: string;
    shortLabel: string;
    isHidden: (flags: HiddenFollowupVisibilityInput, ctx: HiddenGuarantorContext) => boolean;
}

export interface HiddenGuarantorContext {
    executionData: ExecutionFile | null | undefined;
    settlementBreachTriggeredAt?: string | null;
    ledgerPendingSettlement?: unknown;
    financialCenterTotalIqd: number;
    activeDebtorIsDeceased: boolean;
    /** المدين الموظف — طلب الكفيل الأولي في الطلبات المخفية لا في الحجز */
    activeDebtorIsEmployee?: boolean;
}

