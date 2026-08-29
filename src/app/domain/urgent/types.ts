/**
 * طبقة الدومين — القضاء المستعجل والحجج
 * يعيد تصدير أنواع البطاقة ويوسّعها لحقول التخزين/الإقرار.
 */
import type {
    UrgentCase,
    UrgentCaseStatus,
    UrgentCaseType,
    ActionPhase,
    LegalState,
    CaseNote,
    CaseAttachment,
    CaseFollowup,
    CaseHearing,
    CasePartyEntry,
    ExpertModule,
    InitialNotificationMethod,
} from '@/app/components/lawyer/Component_Urgent_Card';

export type {
    UrgentCase,
    UrgentCaseStatus,
    UrgentCaseType,
    ActionPhase,
    LegalState,
    CaseNote,
    CaseAttachment,
    CaseFollowup,
    CaseHearing,
    CasePartyEntry,
    ExpertModule,
    InitialNotificationMethod,
};

/** صف مخزَّن — قد يحمل حقولاً إضافية غير معرّفة بعد في UrgentCase */
export type UrgentCaseStorageRow = UrgentCase &
    Record<string, unknown> & {
        finalityReason?: string | null;
        iqrarDeedAuthenticated?: boolean;
        legalState?: string | null;
    };

/** حمولة نموذج Form_Urgent_Actions عند الحفظ */
export type UrgentFormSavePayload = Record<string, unknown>;
