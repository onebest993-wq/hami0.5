/**
 * Legal Constants for Iraqi Legal System
 * ثوابت النظام القانوني العراقي
 * 
 * هذا الملف يحتوي على جميع الثوابت القانونية المستخدمة في التطبيق
 * لتجنب استخدام "magic strings" و "magic numbers"
 */

// ========================================
// PARTY ROLES (أدوار الأطراف)
// ========================================
export const PARTY_ROLES = {
    // الدعوى المدنية
    PLAINTIFF: 'المدعي',
    DEFENDANT: 'المدعى عليه',
    CLIENT: 'الموكل',
    OPPONENT: 'الخصم',
    
    // الاستئناف
    APPELLANT: 'المستأنف',
    APPELLEE: 'المستأنف عليه',
    
    // التمييز
    DISCRIMINATOR: 'المميز',
    DISCRIMINATED_AGAINST: 'المميز ضده',
    
    // إعادة المحاكمة
    RETRIAL_PETITIONER: 'طالب إعادة المحاكمة',
    RETRIAL_RESPONDENT: 'المطلوب إعادة محاكمته',
    
    // الاعتراض على الحكم الغيابي
    OBJECTOR: 'المعترض',
    OBJECTED_AGAINST: 'المعترض عليه',
    
    // التنفيذ
    CREDITOR: 'الدائن',
    DEBTOR: 'المدين',
    EXECUTOR: 'طالب التنفيذ',
    EXECUTEE: 'المنفذ عليه'
} as const;

// ========================================
// CASE STAGES (مراحل الدعوى)
// ========================================
export const CASE_STAGES = {
    FIRST_INSTANCE: 'البداءة',
    APPEAL: 'الاستئناف',
    CASSATION: 'التمييز',
    RETRIAL: 'إعادة المحاكمة',
    EXECUTION: 'التنفيذ'
} as const;

// ========================================
// CASE STATUS (حالات الدعوى)
// ========================================
export const CASE_STATUS = {
    ACTIVE: 'نشطة',
    DELAYED: 'مستأخرة',
    INTERRUPTED: 'منقطعة',
    COMPLETED: 'منتهية',
    FINAL: 'مكتسبة الدرجة القطعية',
    PAUSED: 'موقوفة'
} as const;

// ========================================
// LEGAL DEADLINES (المواعيد القانونية بالأيام)
// ========================================
export const LEGAL_DEADLINES = {
    // الاستئناف
    APPEAL_DEADLINE: 30,
    APPEAL_PRESENCE: 15, // موعد الحضور
    
    // التمييز
    CASSATION_DEADLINE: 30,
    
    // الاعتراض على الحكم الغيابي
    OBJECTION_DEADLINE: 10,
    
    // إعادة المحاكمة
    RETRIAL_DEADLINE: 30,
    
    // الطعن بقرار الحجز الاحتياطي
    ATTACHMENT_OBJECTION: 7,
    
    // التنفيذ الرضائي
    VOLUNTARY_EXECUTION: 10,
    
    // الطعن في تقرير الخبرة
    EXPERT_REPORT_OBJECTION: 5,
    
    // تقديم اللائحة الجوابية
    RESPONSE_BRIEF: 15
} as const;

// ========================================
// COURT TYPES (أنواع المحاكم)
// ========================================
export const COURT_TYPES = {
    // المحاكم المدنية
    CIVIL_COURT: 'محكمة البداءة',
    APPEAL_COURT: 'محكمة الاستئناف',
    CASSATION_COURT: 'محكمة التمييز',
    
    // المحاكم الشرعية
    SHARIA_COURT: 'محكمة الأحوال الشخصية',
    SHARIA_APPEAL: 'محكمة استئناف الأحوال الشخصية',
    
    // المحاكم الإدارية
    ADMIN_COURT: 'المحكمة الإدارية',
    
    // محاكم العمل
    LABOR_COURT: 'محكمة العمل',
    
    // المحاكم الجنائية
    CRIMINAL_COURT: 'محكمة الجنايات',
    MISDEMEANOR_COURT: 'محكمة الجنح'
} as const;

// ========================================
// JUDGMENT TYPES (أنواع الأحكام)
// ========================================
export const JUDGMENT_TYPES = {
    PRESENCE: 'حضوري',
    ABSENCE: 'غيابي',
    CONSIDERED_PRESENCE: 'بمثابة الحضوري',
    INTERLOCUTORY: 'تمهيدي',
    FINAL: 'قطعي',
    PROVISIONAL: 'مستعجل'
} as const;

// ========================================
// DOCUMENT CATEGORIES (فئات المستندات)
// ========================================
export const DOCUMENT_CATEGORIES = {
    PETITION: 'عريضة دعوى',
    CONTRACT: 'عقد',
    INVOICE: 'فاتورة',
    ID: 'هوية',
    CERTIFICATE: 'شهادة',
    POWER_OF_ATTORNEY: 'وكالة',
    JUDGMENT: 'حكم',
    EXPERT_REPORT: 'تقرير خبرة',
    WITNESS_STATEMENT: 'شهادة شهود',
    EVIDENCE: 'بينة',
    OTHER: 'أخرى'
} as const;

// ========================================
// EXECUTION ARTICLES (مواد قانون التنفيذ)
// ========================================
export const EXECUTION_ARTICLES = {
    ARTICLE_18: 'المادة 18', // الحجز الاحتياطي
    ARTICLE_20: 'المادة 20', // حجز المنقول
    ARTICLE_50: 'المادة 50', // تحديد موعد البيع
    ARTICLE_112: 'المادة 112' // التنفيذ على العقار
} as const;

// ========================================
// INCIDENTAL CASE TYPES (أنواع الدعاوى الفرعية)
// ========================================
export const INCIDENTAL_TYPES = {
    OBJECTION_TO_JUDGMENT: 'اعتراض على الحكم الغيابي',
    INTERLOCUTORY_APPEAL: 'استئناف تمهيدي',
    INTERVENTION: 'تدخل',
    COUNTERCLAIM: 'دعوى متقابلة',
    PROVISIONAL_MEASURES: 'تدابير مستعجلة',
    EXPERT_APPOINTMENT: 'تعيين خبير',
    ATTACHMENT_ORDER: 'أمر حجز احتياطي'
} as const;

// ========================================
// FINANCIAL CONSTANTS (الثوابت المالية)
// ========================================
export const FINANCIAL = {
    // رسوم المحكمة (نسب مئوية)
    COURT_FEES_PERCENTAGE: 0.02, // 2% من قيمة الدعوى
    APPEAL_FEES_PERCENTAGE: 0.03, // 3% من قيمة الحكم
    
    // الحد الأدنى والأقصى للرسوم
    MIN_COURT_FEES: 10000, // 10,000 دينار
    MAX_COURT_FEES: 5000000, // 5,000,000 دينار
    
    // أتعاب الخبراء
    EXPERT_FEES_MIN: 100000, // 100,000 دينار
    EXPERT_FEES_MAX: 2000000, // 2,000,000 دينار
    
    // رسوم التنفيذ
    EXECUTION_FEES_PERCENTAGE: 0.01, // 1% من المبلغ المنفذ
    
    // النفقة (حدود قانونية)
    ALIMONY_MIN_PERCENTAGE: 0.25, // 25% من الراتب
    ALIMONY_MAX_PERCENTAGE: 0.33 // 33% من الراتب
} as const;

// ========================================
// CASE TYPES (أنواع الدعاوى)
// ========================================
export const CASE_TYPES = {
    // المدنية
    DEBT: 'دين',
    CONTRACT: 'عقد',
    PROPERTY: 'عقار',
    COMMERCIAL: 'تجاري',
    LABOR: 'عمالي',
    
    // الشرعية
    DIVORCE: 'طلاق',
    ALIMONY: 'نفقة',
    CUSTODY: 'حضانة',
    INHERITANCE: 'ميراث',
    MARRIAGE: 'زواج',
    
    // الجنائية
    FELONY: 'جناية',
    MISDEMEANOR: 'جنحة',
    
    // الإدارية
    ADMINISTRATIVE: 'إداري',
    TAX: 'ضريبي'
} as const;

// ========================================
// INTERRUPTION REASONS (أسباب الانقطاع)
// ========================================
export const INTERRUPTION_REASONS = {
    DEATH: 'وفاة أحد الخصوم',
    INCOMPETENCE: 'فقدان الأهلية',
    BANKRUPTCY: 'إفلاس',
    COMPANY_DISSOLUTION: 'تصفية شركة',
    ATTORNEY_WITHDRAWAL: 'انسحاب الوكيل'
} as const;

// ========================================
// PAUSE REASONS (أسباب الإيقاف)
// ========================================
export const PAUSE_REASONS = {
    PENDING_CASE: 'بانتظار دعوى أخرى',
    EXPERT_REPORT: 'بانتظار تقرير الخبرة',
    CRIMINAL_CASE: 'بانتظار دعوى جزائية',
    ADMINISTRATIVE_DECISION: 'بانتظار قرار إداري',
    NEGOTIATION: 'بانتظار التفاوض'
} as const;

// ========================================
// APPEAL OUTCOMES (نتائج الطعن)
// ========================================
export const APPEAL_OUTCOMES = {
    ACCEPTED: 'قبول الطعن',
    REJECTED: 'رفض الطعن',
    PARTIALLY_ACCEPTED: 'قبول جزئي',
    REMAND: 'نقض وإعادة',
    DISMISSED: 'رد الطعن شكلاً'
} as const;

// ========================================
// NOTIFICATION TYPES (أنواع التبليغات)
// ========================================
export const NOTIFICATION_TYPES = {
    SUMMONS: 'تبليغ بالحضور',
    JUDGMENT: 'تبليغ بالحكم',
    ATTACHMENT: 'تبليغ بالحجز',
    EXECUTION: 'تبليغ بالتنفيذ',
    EXPERT_REPORT: 'تبليغ بتقرير الخبرة'
} as const;

// ========================================
// PRIORITY LEVELS (مستويات الأولوية)
// ========================================
export const PRIORITY_LEVELS = {
    URGENT: 'عاجل',
    HIGH: 'مهم',
    MEDIUM: 'متوسط',
    LOW: 'عادي'
} as const;

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * التحقق من صلاحية موعد الطعن
 */
export function isDeadlineValid(decisionDate: string, deadlineDays: number): boolean {
    const decision = new Date(decisionDate);
    const deadline = new Date(decision);
    deadline.setDate(deadline.getDate() + deadlineDays);
    
    return new Date() <= deadline;
}

/**
 * حساب الأيام المتبقية للموعد
 */
export function getDaysRemaining(decisionDate: string, deadlineDays: number): number {
    const decision = new Date(decisionDate);
    const deadline = new Date(decision);
    deadline.setDate(deadline.getDate() + deadlineDays);
    
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
}

/**
 * حساب رسوم المحكمة
 */
export function calculateCourtFees(claimAmount: number): number {
    const fees = claimAmount * FINANCIAL.COURT_FEES_PERCENTAGE;
    return Math.min(Math.max(fees, FINANCIAL.MIN_COURT_FEES), FINANCIAL.MAX_COURT_FEES);
}

/**
 * التحقق من صحة دور الطرف
 */
export function isValidPartyRole(role: string): boolean {
    return Object.values(PARTY_ROLES).includes(role as any);
}

/**
 * الحصول على الدور المقابل في الاستئناف (انقلاب المراكز)
 */
export function getReverseRole(role: string): string {
    const roleMap: Record<string, string> = {
        [PARTY_ROLES.PLAINTIFF]: PARTY_ROLES.APPELLEE,
        [PARTY_ROLES.DEFENDANT]: PARTY_ROLES.APPELLANT,
        [PARTY_ROLES.APPELLANT]: PARTY_ROLES.APPELLEE,
        [PARTY_ROLES.APPELLEE]: PARTY_ROLES.APPELLANT
    };
    
    return roleMap[role] || role;
}
