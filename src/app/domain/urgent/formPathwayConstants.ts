import { PETITION_ORDERS_DROPDOWN_OPTIONS, URGENT_JUDICIARY_DROPDOWN_OPTIONS } from './procedureCategory';

/** Phase 39 — نوعان مرجعيان (بيانات قديمة فقط) */
export const URGENT_PETITION_PRIMARY = 'أمر ولائي / قضاء مستعجل';
export const JUDICIAL_ACKNOWLEDGMENT_PRIMARY = 'إقرار قضائي / حجة إقرار';

const LEGACY_STATE_ORDER = [
    'وضع إشارة عدم تصرف/إشارة دعوى',
    'إيقاف الإجراءات التنفيذية/المزايدة',
    'إيقاف صرف مبالغ/خطاب ضمان',
    'الاستئخار المؤقت',
];

const LEGACY_URGENT_DISCOVERY = [
    'الكشف العقاري',
    'تثبيت حالة',
    'رفع التجاوز',
    'طرد الغاصب المستعجل',
    'الحراسة القضائية',
];

const LEGACY_ACKNOWLEDGMENT = ['إقرار الملكية', 'إقرار الدين', 'إقرار العقد'];

export const actionTypeOptions = {
    state_order: [...PETITION_ORDERS_DROPDOWN_OPTIONS, ...LEGACY_STATE_ORDER],
    urgent_discovery: [...URGENT_JUDICIARY_DROPDOWN_OPTIONS, ...LEGACY_URGENT_DISCOVERY],
    acknowledgment: [...LEGACY_ACKNOWLEDGMENT],
};

export type PathwayType = 'state_order' | 'urgent_discovery' | 'acknowledgment';

/** أنواع الإقرار القديمة فقط — لا يشمل استكتاب السندات بالبصمة */
export function isIqrarRequest(selectedType: string): boolean {
    const t = String(selectedType ?? '').trim();
    if (!t || t === URGENT_PETITION_PRIMARY) return false;
    if (t === JUDICIAL_ACKNOWLEDGMENT_PRIMARY) return true;
    return actionTypeOptions.acknowledgment.includes(t);
}

export function resolveStoredPathwayType(resolvedSpecificActionType: string): PathwayType {
    const t = String(resolvedSpecificActionType ?? '').trim();
    if (isIqrarRequest(t)) return 'acknowledgment';
    if (actionTypeOptions.urgent_discovery.includes(t)) return 'urgent_discovery';
    return 'state_order';
}
