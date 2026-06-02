/** حالة المتهم داخل مرحلة التحقيق — نظام تصفية الخصوم (Defendant Purge). */
export type InvestigationDefendantStatus =
    | 'active'
    | 'closed_pending'
    | 'closed_final'
    | 'referred';

export const DEFAULT_INVESTIGATION_DEFENDANT_STATUS: InvestigationDefendantStatus = 'active';
