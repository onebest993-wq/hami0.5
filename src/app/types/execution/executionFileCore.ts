/**
 * ExecutionFile domain slice: ExecutionFileCore.
 */
import type { ClaimType, Currency, Directorate, ExecutionStatus } from './core';
import type { Creditor, Debtor, PartyMultiplicityExtension } from './party';
import type { AlimonyData } from './alimony';
import type { DocumentType } from './document';
import type { TimelineEvent } from './timeline';
import type { CoerciveAction } from './coercive';
import type {
  RealEstateSeizureAsset,
  SeizedAsset,
  SeizedMovable,
  SeizedProperty,
  StandaloneExecutionMark,
  ThirdPartySeizure,
  ThirdPartySeizureAsset,
} from './seizure';

export interface ExecutionFileCore {
    // Basic Info
    id: string;
    directorate: Directorate;
    fileNumber: string;
    /** سنة الإضبارة في العرض (مثل 1540/2026) */
    fileYear?: string;
    executionDate: string;
    submissionDate: string;
    
    // Claim Info
    claimType: ClaimType;
    documentType: DocumentType;
    documentDate: string;
    
    // Parties
    creditors: Creditor[];
    debtors: Debtor[];
    /** قائمة موحّدة اختيارية (إنابة / نسخ من الأصل) — المصدر التشغيلي يبقى creditors / debtors */
    parties?: import('./party').Party[];
    /**
     * تعدّد الخصوم والتضامن — امتداد اختياري؛ الأطراف الأساسية تبقى في creditors / debtors.
     */
    party_multiplicity?: PartyMultiplicityExtension;
    
    // Financial
    debtAmount: number;
    currency: Currency;
    courtFees: number;
    directorateFees: number;
    lawyerFees: number;
    clientFees: number;
    executionFee: number;
    
    // Payments
    paidDebt: number;
    paidCourtFees: number;
    paidDirectorateFees: number;
    paidClientFees: number;
    /**
     * الرصيد المتبقي العام للإضبارة (مسار الذمم الفردية).
     * عند الغياب يُشتق من debtAmount − paidDebt في منطق المخزن.
     */
    total_remaining_balance?: number;
    /** اسم قديم/وارد من واجهات أخرى للرصيد المتبقي — يُفضَّل `total_remaining_balance` */
    remainingDebt?: number;
    
    status: ExecutionStatus;
    isPaused: boolean;

    /** أسماء بديلة تستخدمها بعض الشاشات (legacy / UI) */
    totalAmount?: number;
    paidAmount?: number;
    docType?: string;
    docNumber?: string;
    judgmentDate?: string;
    notificationDate?: string;
    pauseReason?: string;
    
    // Timeline
    timelineEvents: TimelineEvent[];
    /** ملاحظات محفوظة من أدوات الإضبارة (لا تُدرَج المهام غير المنجزة هنا) */
    caseNotesLog?: Array<{
        id: string;
        title: string;
        body: string;
        createdAt: string;
        trashedAt?: string;
        /** تثبيت في درج الملاحظات داخل «سجل الملاحظات والمهام» */
        pinned?: boolean;
    }>;
    /** مهام معلّقة من «سجل الملاحظات» — تظهر في الشريط العلوي حتى الإنجاز */
    caseTasksPending?: Array<{
        id: string;
        title: string;
        body: string;
        dueDate: string;
        createdAt: string;
        trashedAt?: string;
        /** قائمة خطوات المهمة (مثل خطة عمل مرقّمة) */
        steps?: Array<{
            id: string;
            text: string;
            order: number;
            dueDate?: string;
            status: 'pending' | 'done' | 'failed';
        }>;
        /** هل المهمة مثبّتة (تظهر أسفل بطاقة المدين) */
        pinned?: boolean;
    }>;
    /** المهام المثبّتة أسفل بطاقة المدين (نسخة من المهمة الأصلية) */
    pinnedTasks?: Array<{
        id: string;
        taskId: string;
        title: string;
        body: string;
        createdAt: string;
        steps?: Array<{ id: string; text: string; order: number; dueDate?: string; status: 'pending' | 'done' | 'failed'; }>;
    }>;
    // Coercive Actions
    coerciveActions?: CoerciveAction[];
    /** مفاتيح إجراءات إكراهية نشطة في الواجهة / التخزين المحلي (مثلاً salary) */
    activeCoerciveActions?: string[];
    seizedAssets?: SeizedAsset[];
    /** طلبات حجز بانتظار موافقة المنفذ — المفتاح هو معرّف صف القرار */
    seizureDraftsByDecisionId?: Record<string, SeizedAsset>;
    seizedProperties?: SeizedProperty[];
    seizedMovables?: SeizedMovable[];
    /** سجل حجوزات العقار (منفصل عن seizedAssets لضمان عدم التداخل) */
    realEstateSeizureAssets?: RealEstateSeizureAsset[];
    /** حجز مال المدين لدى الغير (منفصل عن أنواع الحجز الأخرى) */
    thirdPartySeizureAssets?: ThirdPartySeizureAsset[];
    thirdPartySeizures?: ThirdPartySeizure[];
    /** شارة تنفيذية مستقلة/تعميمات (إداري فقط بلا أي منطق مالي) */
    standaloneExecutionMarks?: StandaloneExecutionMark[];
    
    // Alimony (if applicable)
    alimony?: AlimonyData;
    
    // Metadata
    createdAt: string;
    updatedAt: string;
    notes?: string;

    /** تاريخ نقل الإضبارة إلى سلة المهملات (ISO) — غيابه = غير محذوفة */
    executionTrashDeletedAt?: string | null;

    /** تاريخ أرشفة الإضبارة (ISO) — غيابه = غير مؤرشفة */
    executionArchivedAt?: string | null;

    /** أخفى المحامي إشارة «عدم حضور المدين» يدوياً (بعد إعلان انتهاء المدة دون حضور) */
    debtor_absence_badge_dismissed?: boolean;
}
