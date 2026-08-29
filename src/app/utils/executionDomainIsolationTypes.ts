/**
 * Domain isolation — shared types + communication journal helpers.
 */
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import type { DebtorEntityKind } from '@/app/utils/debtorEntityKindUtils';
import type { FollowupSpecializationVisibility } from '@/app/utils/followupSpecializationVisibility';

export type ExecutionClaimModule =
    | 'financial_debt'
    | 'visitation_personal'
    | 'matwaa'
    | 'marital_furniture'
    | 'eviction'
    | 'encroachment'
    | 'specific_delivery'
    | 'court_decisions_personal'
    | 'alimony'
    | 'general_civil'
    | 'unknown';

export type ExecutionJurisdictionDomain = 'civil' | 'sharia' | 'mixed';

export type ExecutorRequestKind =
    | 'seizure'
    | 'eviction_procedure'
    | 'lawyer_fee_payout'
    | 'case_expense'
    | 'trust_disburse'
    | 'unified_collection'
    | 'personal_coercive'
    | 'special_followup'
    | 'guarantor_request'
    | 'creditor_party_death'
    | 'debtor_party_death'
    | 'third_party_funds_received';

export interface ExecutionDomainContext {
    dossierId: string;
    primaryClaimModule: ExecutionClaimModule;
    claimModules: ExecutionClaimModule[];
    jurisdiction: ExecutionJurisdictionDomain;
    perspective: AppealUiPerspective;
    debtorEntityKind: DebtorEntityKind;
    isEmployeeDebtor: boolean;
    flags: FollowupSpecializationVisibility;
}

export interface DomainGateResult {
    allowed: boolean;
    reasonAr?: string;
}

/** عنوان قرار مخاطبة في سجل محضر المتابعة — يتجاوز بوابة special_followup للاختصاص */
export const COMMUNICATION_JOURNAL_TITLE_KEYWORD = 'إرسال كتاب / مخاطبة جهة';

export function isCommunicationJournalTitle(title: unknown): boolean {
    const t = String(title ?? '').trim();
    if (!t) return false;
    return t.includes(COMMUNICATION_JOURNAL_TITLE_KEYWORD) || /مخاطبة جهة/i.test(t);
}

export type ExecutorRequestGateMeta = {
    personalCoerciveSubtype?: string;
    executionData?: Record<string, unknown> | null;
    decisionTitle?: string;
    /** تسجيل مخاطبة في تبويب المخاطبات — مسموح لكل الاختصاصات */
    communicationJournal?: boolean;
    /** طلب من تبويب نماذج الطلبات — مسموح لكل الاختصاصات */
    adminRequestsTab?: boolean;
    /** تحركات الطرف الآخر — مسموح لكل الاختصاصات */
    otherPartyFollowup?: boolean;
    payloadJson?: string;
};

export function isCommunicationJournalGate(meta?: ExecutorRequestGateMeta): boolean {
    if (!meta) return false;
    if (meta.communicationJournal) return true;
    return isCommunicationJournalTitle(meta.decisionTitle);
}

export function isAdminRequestsTabGate(meta?: ExecutorRequestGateMeta): boolean {
    if (!meta) return false;
    if (meta.adminRequestsTab) return true;
    const raw = String(meta.payloadJson || '').trim();
    if (!raw) return false;
    try {
        const v = JSON.parse(raw) as { kind?: unknown };
        const kind = String(v?.kind ?? '').trim();
        return kind === 'manual_followup' || kind === 'admin_template';
    } catch {
        return false;
    }
}

export function isOtherPartyFollowupGate(meta?: ExecutorRequestGateMeta): boolean {
    if (!meta) return false;
    if (meta.otherPartyFollowup) return true;
    const title = String(meta.decisionTitle ?? '').trim();
    return /تحرك\s*الطرف\s*الآخر/i.test(title);
}

export type HiddenGuarantorCatalogKey =
    | 'guarantor_request'
    | 'guarantor_seizure_salary'
    | 'guarantor_seizure_property'
    | 'guarantor_seizure_movable';
