import type { OrderEnforcementTracking } from '@/app/types/criminal';
import type { GuarantorBailKind, GuarantorPerson } from './criminalGuarantorModel';
import type { SeizedAsset } from './criminalSeizedAssetModel';

export interface LegalArticleChange {
    id: string;
    article: string;
    changedAtDate: string;
    changedBy: 'police' | 'investigation_judge' | 'trial_court';
}

export type ExhibitLifecycleStatus = 'seized_at_station' | 'sent_to_lab' | 'lab_result_received';

export interface InvestigationLog {
    id: string;
    date: string;
    category: 'official_letter' | 'forensic_report' | 'site_inspection' | 'exhibit_seizure' | 'other';
    title: string;
    details: string;
    status: 'awaiting_response' | 'response_received' | 'returned_for_revision';
    attachmentRef?: string;
    defendantIds?: string[];
    /** ربط إجباري بالخصم — معرّف الطرف في الإضبارة. */
    linkedPartyId?: string;
    /** رقم محضر الضبط — عند تصنيف «ضبط مبرز». */
    seizureRecordNumber?: string;
    /** رقم وتاريخ كتاب الطب العدلي — عند تصنيف «طب عدلي». */
    forensicLetterRef?: string;
    /** وصف المبرز الدقيق. */
    exhibitDescription?: string;
    /** الكمية / العدد. */
    exhibitQuantity?: string;
    /** دورة حياة المبرز — خزانة الأدلة فقط. */
    exhibitLifecycle?: ExhibitLifecycleStatus;
    /** تاريخ ورود الجواب — مخاطبات (تحديث أمامي فقط). */
    responseReceivedAt?: string;
    responseNotes?: string;
    /** يُكتب عند ترحيل السجل من إضبارة مَضمومة إلى الأم (merge) — تتبّع دائم. */
    mergedFromCaseId?: string;
    mergedFromCaseNumber?: string;
}

export interface LawyerRequest {
    id: string;
    requestDate: string;
    type: string;
    lawyerNote: string;
    status: 'pending' | 'approved' | 'rejected' | 'executed';
    judgeMargin?: string;
    decisionDate?: string;
    defendantIds?: string[];
    /** قفل نهائي — لا تعديل بعد التأكيد. */
    isLocked?: boolean;
    /**
     * @deprecated KEEP — يُحوَّل إلى isLocked في `criminalStorePersistMigrateNormalize`.
     * ما زال يُقرأ حيّاً في lawyerRequestStatusMachine / lawyerRequestsEngine حتى اكتمال الترحيل.
     */
    decisionArchived?: boolean;
    proceduralNodeId?: string;
    /** قالب نوع الطلب من القائمة (بما فيها «إجراء مخصص»). */
    proceduralTemplate?: string;
    /** للإجراء المخصص — قابلية الطعن التمييزي. */
    isAppealable?: boolean;
    /** تاريخ انتهاء التوقيف/التمديد عند اختيار نوع توقيف. */
    detentionStartDate?: string;
    detentionEndDate?: string;
    /** هوامش ومتابعات إجرائية متسلسلة على الطلب (منفصلة عن هامش القاضي الختامي). */
    margins?: { id: string; date: string; text: string }[];
    /** مرفقات موثقة (محاكاة رفع — اسم المستند فقط). */
    attachments?: { id: string; name: string }[];
    /** تمييز قرار/طلب مصيري في الواجهة. */
    isStarred?: boolean;
    /** المادة القانونية المستند عليها — استقدام/قبض. */
    legalArticleBasis?: string;
    /** متابعة تنفيذ أمر الاستقدام/القبض. */
    orderEnforcement?: OrderEnforcementTracking;
    /** المحكمة المحال إليها — إحالة الشكوى إلى محكمة أخرى. */
    referredCourtName?: string;
    /** بيانات قرار «تكفيل المتهم» المهيكلة — مالية أو شخص ضامن. */
    defendantBail?: {
        kind: GuarantorBailKind;
        bailAmount?: string;
        guarantors?: GuarantorPerson[];
    };
    /**
     * بيانات قرار «حجز الأموال» المهيكلة — قائمة أموال محجوزة لكل طَرَف هارب مُستهدف.
     *
     * 🛈 ملاحظة دلالية: حقل `defendantId` تَراثياً يَحوي مُعرّف متهم؛ لكن في حالة
     *    الشكوى المتقابلة (isMutualComplaint أو isCrossComplaint) يَجوز أن يَحمل
     *    مُعرّف مشتكٍ مُتقابل (الحجز يَكتب على `complainant.accusedSeizedAssets`).
     *    تَفسير المُعرّف يَتمّ ديناميكياً عبر مُطابقته مع `defendants[].id` ثم
     *    `complainants[].id`. أيّ كود مُستقبلي يَفترض «مُعرّف متهم حَتماً» سَيُخطئ.
     */
    assetSeizure?: {
        perDefendant: Array<{
            /** مُعرّف الطَرَف المُستهدف (متهم أصلي، أو مشتكٍ متقابل في القَضايا المُتقابلة). */
            defendantId: string;
            assets: SeizedAsset[];
        }>;
    };
    /** يُكتب عند ترحيل الطلب من إضبارة مَضمومة إلى الأم (merge) — تتبّع دائم. */
    mergedFromCaseId?: string;
    mergedFromCaseNumber?: string;
}
