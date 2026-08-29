import type { GuarantorDetails } from './criminalGuarantorModel';
import type {
    CriminalCaseStage,
    JuvenileDetentionPlacement,
} from './criminalCasePartyTypes';

export type StatementHighlightColor = 'red' | 'blue' | 'yellow';

export interface StatementContentHighlight {
    start: number;
    end: number;
    color: StatementHighlightColor;
}

export interface Statement {
    id: string;
    date: string;
    giverType: 'complainant' | 'defendant' | 'witness' | 'informant';
    giverName: string;
    content: string;
    notes?: string;
    /** مقاطع مميزة داخل نص الإفادة (توضيح المحامي). */
    contentHighlights?: StatementContentHighlight[];
    proceduralNodeId?: string;
    isJudiciallyRatified?: boolean;
    /** مكان تدوين الإفادة — مرحلة التحقيق (ضابط تحقيق / محقق قضائي). */
    statementRecordingPlace?: 'investigation_officer' | 'judicial_investigator';
    /** اسم الشاهد الثلاثي — حقل سجل الإفادات فقط. */
    witnessName?: string;
    /** عمر / سكن / صلة قرابة — اختياري للشاهد. */
    witnessDetails?: string;
    /**
     * @deprecated KEEP — استُبدل بـ witnessPartySide + witnessPartyIds.
     * يُقرأ في `criminalStorePersistMigrateNormalize` + StatementLogCard / CriminalStatementModal للبيانات القديمة.
     *  - `prosecution`: شاهد إثبات (يَدعم الادعاء).
     *  - `defense`:     شاهد نفي  (يَدعم الدفاع).
     */
    witnessKind?: 'prosecution' | 'defense';
    /** جهة الشهادة — مشتكي أو متهم (لا يجتمع الطرفان). */
    witnessPartySide?: 'complainant' | 'defendant';
    /** الأطراف التي يخصّهم الشاهد — اختيار متعدد ضمن جهة واحدة. */
    witnessPartyIds?: string[];
    /** مُعَيَّن بعد الضم: مُعرّف الإضبارة الأصلية التي رُحِّلت منها هذه الإفادة. */
    mergedFromCaseId?: string;
    /** مُعَيَّن بعد الضم: الرقم الرسمي للإضبارة الأصلية (لشارة التتبّع). */
    mergedFromCaseNumber?: string;
}

export type OtherEvidenceItem = {
    id: string;
    evidenceType: string;
    isLinkedToDossier: boolean;
    attachmentDate?: string;
    notes: string;
    proceduralNodeId?: string;
    /** تاريخ الإنشاء — للترتيب عند غياب تاريخ الإرفاق. */
    createdAt?: string;
};

export interface TimelineEvent {
    id: string;
    date: string;
    type: 'investigation' | 'court_session' | 'decision';
    category: string;
    title: string;
    description: string;
    nextDate?: string;
    defendantIds?: string[];
    /**
     * ⚖️ مُعرّفات المشتكين المتقابلين (ازدواجية الصفة) المُرتبطين بهذا الحدث.
     * يُملأ حصراً عند تَفعيل الشكوى المتقابلة. يَسمح بِفلتَرة التايملاين بطَرف
     * من جانِبَي القضية دون نَقل أيّ كائن بين المَصفوفات.
     */
    complainantIds?: string[];
    appealedDecision?: string;
    postponementReason?: string;
    guarantorDetails?: GuarantorDetails;
    extensionDays?: number;
    socialWorkerPresent?: boolean;
    suspendedExecution?: boolean;
    probationYears?: number;
    transferredToStage?: CriminalCaseStage;
    notifiedDate?: string;
    notificationMethod?: string;
    summonsStatus?: 'served_valid' | 'not_served_invalid' | 'served_to_official';
    summonsDate?: string;
    summonsDocumentRef?: string;
    detentionPlacement?: JuvenileDetentionPlacement;
    isConfidential?: boolean;
    /** طرف مستهدف للإجراء المخصص (تحقيق) — null = إجراء غير شخصي. */
    targetDefendantId?: string | null;
    /** حقل عرض يُحقن في العرض الموحَّد لتايم لاين الأم (true إذا كان مُرحَّلاً). */
    isMerged?: boolean;
    /** يُكتب عند نَقل أحداث «تفريق الدعاوى» إلى الإضبارة التابعة (severance) — تتبّع دائم. */
    originCaseNumber?: string;
    originCaseId?: string;
    /** يُكتب عند تَرحيل الحدث من إضبارة مَضمومة إلى الإضبارة الأم (merge) — تتبّع دائم. */
    mergedFromCaseId?: string;
    mergedFromCaseNumber?: string;
    /** عقدة المسار النشطة عند إنشاء الحدث. */
    proceduralNodeId?: string;
    /** رقم الجلسة — محاكمة. */
    sessionNumber?: string;
    /** اسم القاضي / الهيئة — محاكمة. */
    judgeOrPanelName?: string;
    /** طلبات الجلسة القادمة — محاكمة. */
    nextSessionRequests?: string;
}
