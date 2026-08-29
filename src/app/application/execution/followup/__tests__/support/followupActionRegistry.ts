import type {
    HiddenGuarantorRequestKey,
    HiddenPersonalCoerciveRequestKey,
} from '@/app/components/lawyer/ExecutionDashboard/components/hiddenFollowupRequestsUtils';

/** سطح عرض الإجراء داخل محضر المتابعة */
export type FollowupActionSurface =
    | 'hidden_toggle'
    | 'hidden_personal_coercive'
    | 'hidden_guarantor'
    | 'hidden_break_inventory'
    | 'personal_tab'
    | 'coercive_tab'
    | 'seizure_tab';

export type FollowupRegistryActionId =
    | 'hidden:toggle'
    | 'hidden:break_inventory'
    | `hidden_personal:${HiddenPersonalCoerciveRequestKey}`
    | `hidden_guarantor:${HiddenGuarantorRequestKey}`;

export type FollowupRegistryActionDefinition = {
    id: FollowupRegistryActionId;
    surface: FollowupActionSurface;
    labelAr: string;
    /** مفتاح الكتالوج الأصلي في hiddenFollowupRequestsUtils */
    catalogKey?: HiddenPersonalCoerciveRequestKey | HiddenGuarantorRequestKey;
};

const HIDDEN_PERSONAL_LABELS: Record<HiddenPersonalCoerciveRequestKey, string> = {
    forced_bring_in: 'إحضار جبري',
    travel_ban: 'منع سفر',
    arrest_warrant_investigation: 'مفاتحة التحقيق',
    executive_dossier_presentation: 'عرض الإضبارة',
    executive_detention_judge: 'قرار القاضي',
};

const HIDDEN_GUARANTOR_LABELS: Record<HiddenGuarantorRequestKey, string> = {
    guarantor_request: 'طلب الكفيل',
    guarantor_seizure_salary: 'حجز راتب الكفيل',
    guarantor_seizure_property: 'حجز عقار الكفيل',
    guarantor_seizure_movable: 'حجز منقول الكفيل',
};

/**
 * سجل إجراءات محضر المتابعة — مرجع ثابت للمفاتيح والأسطح.
 * منطق الإظهار يبقى في hiddenFollowupRequestsUtils؛ هذا السجل يوحّد التسمية للمصفوفة والاختبارات.
 */
export const FOLLOWUP_ACTION_REGISTRY: readonly FollowupRegistryActionDefinition[] = [
    { id: 'hidden:toggle', surface: 'hidden_toggle', labelAr: 'الطلبات المخفية' },
    { id: 'hidden:break_inventory', surface: 'hidden_break_inventory', labelAr: 'طلب كسر الأقفال' },
    ...(Object.keys(HIDDEN_PERSONAL_LABELS) as HiddenPersonalCoerciveRequestKey[]).map(
        (key): FollowupRegistryActionDefinition => ({
            id: `hidden_personal:${key}`,
            surface: 'hidden_personal_coercive',
            labelAr: HIDDEN_PERSONAL_LABELS[key],
            catalogKey: key,
        }),
    ),
    ...(Object.keys(HIDDEN_GUARANTOR_LABELS) as HiddenGuarantorRequestKey[]).map(
        (key): FollowupRegistryActionDefinition => ({
            id: `hidden_guarantor:${key}`,
            surface: 'hidden_guarantor',
            labelAr: HIDDEN_GUARANTOR_LABELS[key],
            catalogKey: key,
        }),
    ),
];

export const FOLLOWUP_REGISTRY_ACTION_IDS = FOLLOWUP_ACTION_REGISTRY.map((entry) => entry.id);

export function registryIdForHiddenPersonalKey(
    key: HiddenPersonalCoerciveRequestKey,
): FollowupRegistryActionId {
    return `hidden_personal:${key}`;
}

export function registryIdForHiddenGuarantorKey(key: HiddenGuarantorRequestKey): FollowupRegistryActionId {
    return `hidden_guarantor:${key}`;
}
