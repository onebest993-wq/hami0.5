import type { EvictionEarnerFeeCollectionSM } from '@/app/utils/evictionEarnerFeeCollectionMachine';
import type {
    ClaimType,
    ExecutionStatus,
    DossierLifecycleStatus,
    Currency,
    Directorate,
    Creditor,
    Debtor,
    PartyMultiplicityExtension,
    LedgerEntry,
    GhuramaDistributionLog,
    OtherPartyActionLogEntry,
    OtherPartyRequestTrackEntry,
    AlimonyData,
    DocumentType,
    DocumentDetails,
    ShariaDeedDetails,
    CommercialPaperDetails,
    TimelineEvent,
    CoerciveAction,
    SeizedAsset,
    SeizedProperty,
    SeizedMovable,
    ThirdPartySeizureAsset,
    ThirdPartySeizure,
    StandaloneExecutionMark,
    RealEstateSeizureAsset,
    PublicationNoticeDebtorState,
    EmployeeSummonsAssignmentState,
    ExecutionAICopilotResult,
} from './executionShared';

// Prefer named: re-export shared then define file
export * from './executionShared';

// ═══════════════════════════════════════════════════════════════════════════

export interface ExecutionFile {
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
    /** مساعد الذكاء الاصطناعي داخل الإضبارة */
    ai_copilot_enabled?: boolean;
    ai_copilot_mode?: 'hybrid' | 'manual' | 'always_on';
    ai_copilot_last_run_at?: string | null;
    ai_copilot_last_result?: ExecutionAICopilotResult | null;
    
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
    
    // State Machine
    gracePeriodActive?: boolean;
    gracePeriodEnded?: boolean;
    debtorNotificationDate?: string | null;
    /** آخر تبليغ للمدين — للشارة بجانب الاسم (تعديل/حذف) */
    debtor_summons_marker?: {
        id: string;
        date: string;
        purpose: string;
        recordedAt?: string;
        badgeHiddenAt?: string;
        periodEndedAt?: string;
    } | null;
    /** آخر تبليغ لكل مدين (ذمة مقسومة) */
    debtor_summons_marker_by_debtor?: Record<
        string,
        {
            id: string;
            date: string;
            purpose: string;
            recordedAt?: string;
            badgeHiddenAt?: string;
            periodEndedAt?: string;
        } | null
    >;
    /** عدد التبليغات لكل مدين */
    notification_count_by_debtor?: Record<string, number>;

    /**
     * تكليف بالحضور — مسار المدين الموظف بعد تسجيل مذكرة الإخبار بالتنفيذ (أي تنفيذ).
     * يُدار من تبويب «التكليف بالحضور» داخل مركز التبليغ.
     * @deprecated لصالح `employee_summons_assignments_by_debtor` — يُقرأ للتوافق مع الملفات القديمة فقط.
     */
    employee_summons_assignment?: EmployeeSummonsAssignmentState | null;
    /**
     * تكليف حضور لكل مدين (ذمة مقسومة) — المفتاح يطابق مفاتيح `debtorWorkspaceEntries`.
     */
    employee_summons_assignments_by_debtor?: Record<string, EmployeeSummonsAssignmentState>;

    /**
     * تبليغ بالنشر (جريدتان) — لكل مدين عند تعدد الخصوم؛ المفتاح يطابق مفاتيح مساحة عمل المدين.
     * المدة ١٥ يوماً تقويمياً من اليوم التالي لتاريخ النشر.
     */
    publication_notice_by_debtor?: Record<string, PublicationNoticeDebtorState>;
    /** تاريخ التبليغ الفعلي لكل مدين (ذمة مقسومة) */
    debtor_notification_date_by_debtor?: Record<string, string>;
    /** مرجع تاريخ مذكرة الإخبار لكل مدين (ذمة مقسومة) */
    execution_memo_anchor_date_by_debtor?: Record<string, string>;
    /** حالة مسار التبليغ/الإحضار لكل مدين (initial_notice | forced_attendance | arrest_warrant) */
    active_notice_state_by_debtor?: Record<string, string>;
    /** إعلان انتهاء المهلة الرضائية لكل مدين (غير تخلية) */
    notice_voluntary_period_end_declared_by_debtor?: Record<string, boolean>;
    /** إخفاء شارة عدم الحضور لكل مدين */
    debtor_absence_badge_dismissed_by_debtor?: Record<string, boolean>;

    /**
     * غير تخلية: تاريخ مذكرة الإخبار بالتنفيذ الفعلي (أول تسجيل أو إعادة تبليغ بالمذكرة).
     * يُستخدم لاحتساب 7 أيام تقويمية من اليوم التالي له — وليس من تاريخ الضغط.
     */
    execution_memo_anchor_date?: string | null;
    /**
     * غير تخلية: أعلن المحامي انتهاء مدة التنفيذ الرضائي (بعد 7 أيام تقويمية دون حضور).
     * يفتح مسار «تبليغ» لاحق دون اشتراط إجراء إكراهي.
     */
    notice_voluntary_period_end_declared?: boolean;

    /** محضر المتابعة — سجل تحركات الطرف الآخر (نص حر) */
    other_party_actions_log?: OtherPartyActionLogEntry[] | null;

    /** وكيل المدين — تتبع يدوي لطلبات الدائن وقرار المنفذ */
    other_party_request_tracks?: OtherPartyRequestTrackEntry[] | null;

    /** آلة حياة الإضبارة: نشطة | متوقفة | مستأخرة | انتهاء */
    dossier_lifecycle_status?: DossierLifecycleStatus;
    /** سبب الحالة عند عدم كون الإضبارة نشطة */
    dossier_status_reason?: string;
    /** تاريخ مرتبط بالحالة (YYYY-MM-DD) */
    dossier_status_date?: string;
    /** تاريخ آخر إجراء قاطع للتقادم (YYYY-MM-DD) — يُزامن مع رادار المادة 112 */
    dossier_last_action_date?: string;
    /** Legacy: يُستخدم في لوحة التنفيذ لحساب التقادم */
    lastActionDate?: string | null;

    /** وفاة المدين — للعرض والتوافق مع بيانات قديمة؛ لا يُستخدم لتعطيل الإجراءات */
    is_debtor_deceased?: boolean;
    /** صفة المدين الأساسي: طبيعي | معنوي */
    debtor_entity_kind?: 'natural_person' | 'legal_entity';
    /** @deprecated — استخدم debtor_entity_kind */
    debtor_entity_type?: string;
    /** صفة كل مدين في تعدّد الخصوم */
    debtor_entity_kind_by_debtor?: Record<string, 'natural_person' | 'legal_entity'>;
    /** وفاة الدائن — للعرض والتوافق */
    is_creditor_deceased?: boolean;
    /** ورثة مسجّلون — يُزامَن مع مسار الوفاة */
    dossier_heirs_list?: string[];
    /** اسم المدين عند تسجيل الوفاة (مرجع عرض) */
    deceased_debtor_legal_name_snapshot?: string;
    /** اسم الدائن عند تسجيل الوفاة (مرجع عرض) */
    deceased_creditor_legal_name_snapshot?: string;

    /** محضر المتابعة — التنفيذ الجبري الشخصي (طلبات المنفذ) */
    forced_bring_in_personal_outcome?: 'brought' | 'absconded' | null;
    /** سجّل مرة واحدة: مسودة مذكرة إحضار + مهمة ميدانية بعد موافقة المنفذ على طلب الإحضار */
    forced_bring_in_personal_followup_logged?: boolean;
    /** مفاتحة محكمة التحقيق لأمر قبض */
    personal_arrest_warrant_stage?: 'none' | 'pending_court' | 'issued' | null;
    /** شارة المدين: مطلوب بمذكرة قبض */
    debtor_wanted_arrest_warrant?: boolean;
    /** منع سفر فعّال (بعد موافقة المنفذ) */
    debtor_travel_ban_active?: boolean;
    /** منع سفر — لكل مدين في الذمة المقسومة */
    debtor_travel_ban_active_by_debtor?: Record<string, boolean>;
    /** تراجع عن منع سفر — لكل مدين */
    travel_ban_withdrawn_at_by_debtor?: Record<string, string>;
    /** تراجع عن دورة طلب منع سفر — لكل مدين */
    travel_ban_request_cycle_withdrawn_at_by_debtor?: Record<string, string>;
    /** حبس تنفيذي — تاريخ انتهاء المدة (YYYY-MM-DD) */
    executive_detention_until?: string | null;
    executive_detention_days_total?: number | null;
    debtor_executive_detention_active?: boolean;
    /** إخلاء سبيل / إغلاق دورة التنفيذ الجبري — إخفاء شارات الطلبات النشطة */
    personal_coercive_cycle_closed_at?: string | null;
    /** انتهاء مدة الحبس أو إغلاق مسار الحبس — إخفاء شارة «حبس تنفيذي» من القرارات */
    executive_detention_released_or_closed_at?: string | null;
    /** تراجع المحامي عن طلب منع السفر — إعادة الدورة */
    travel_ban_withdrawn_at?: string | null;
    /** تراجع عن دورة الطلب مع إبقاء إشارة المنع حتى سداد الدين */
    travel_ban_request_cycle_withdrawn_at?: string | null;
    /** تذكير قبل انتهاء الحبس بيومين */
    executive_detention_reminder_sent?: boolean;
    /** تأكيد يدوي: المدين حاضر أمام المنفذ (شرط طلب الحبس التنفيذي) */
    debtor_marked_present_for_detention?: boolean;
    /**
     * بعد إلقاء القبض فعلياً على المدين أو بدء حبس حضوري (غير غيابي) — تُخفى شارة «مذكرة قبض».
     * لا تُضبط عند الحبس الغيابي؛ تُعاد إلى false عند تسجيل «تم صدور أمر قبض» من جديد.
     */
    debtor_arrest_warrant_cleared_after_custody?: boolean;
    /** طلب الحبس التنفيذي بصفة غيابي — يُذكر في الطلب والشارة والسجل */
    executive_detention_request_in_absentia?: boolean;
    /**
     * بعد موافقة المنفذ على مفاتحة التحقيق: الجلسة مفتوحة حتى «تم حضور المدين» أو إكمال مسار القبض.
     * false يعيد إتاحة «إنشاء طلب مفاتحة» رغم بقاء صف موافَق عليه في التخزين.
     */
    personal_arrest_investigation_session_open?: boolean;
    /** بعد موافقة المنفذ على الحبس التنفيذي: موافقة أو رفض قاضي البداءة قبل تثبيت مدة الحبس */
    executive_detention_judge_outcome?: 'approved' | 'rejected' | null;
    /** معرّف صف قرار المنفذ الذي يُسمح بعده بتسجيل قرار قاضي البداءة (دورة واحدة) */
    executive_detention_judge_eligible_decision_id?: string | null;
    /** معرّف صف قرار قاضي البداءة المستقل عن طلب المنفذ */
    executive_detention_judge_decision_id?: string | null;
    /** سبب رفض قاضي البداءة لطلب الحبس التنفيذي عند تسجيله في المحضر */
    executive_detention_judge_rejection_reason?: string | null;
    /**
     * مرحلة مسار عرض الإضبارة/الحبس — منفصلة عن صفوف القرارات
     * idle: لا مسار | handed_to_judge: وافق المنفذ | judge_decided: سُجّل قرار القاضي | detention_active: المدة جارية
     */
    executive_dossier_phase?:
        | 'handed_to_judge'
        | 'judge_decided'
        | 'detention_active'
        | null;

    /** استئخار تنفيذ — تعطيل أدوات التنفيذ في الإضبارة */
    stay_of_execution?: {
        active: boolean;
        decision_number?: string;
        court_name?: string;
        next_hearing_date?: string;
    } | null;

    /** وفاة الدائن — مستقل عن وفاة المدين (يُفضّل على party_death_case القديم) */
    creditor_party_death_case?: {
        deceased_party: 'creditor';
        heir_certificate_file_name?: string | null;
        heir_names: string[];
        heir_details?: Array<{
            name: string;
            phone?: string;
            address?: string;
        }>;
        flow?: 'no_heirs' | 'heir_substitution' | 'death_only';
    } | null;
    /** وفاة المدين — مستقل عن وفاة الدائن */
    debtor_party_death_case?: {
        deceased_party: 'debtor';
        heir_certificate_file_name?: string | null;
        heir_names: string[];
        heir_details?: Array<{
            name: string;
            phone?: string;
            address?: string;
        }>;
        flow?: 'no_heirs' | 'heir_substitution' | 'death_only';
    } | null;
    /** وفاة طرف — مسار بلا ورثة (إغلاق إضبارة) أو إحلال ورثة */
    party_death_case?: {
        deceased_party: 'debtor' | 'creditor';
        /** قديم — لم يعد يُجمع من الواجهة */
        heir_certificate_file_name?: string | null;
        heir_names: string[];
        heir_details?: Array<{
            name: string;
            phone?: string;
            address?: string;
        }>;
        /** death_only: إبلاغ أول دون إحلال؛ ثم النافذة تصبح «طلب إحلال مورث» فقط */
        flow?: 'no_heirs' | 'heir_substitution' | 'death_only';
    } | null;
    /** مسار تبليغ الورثة بعد إحلالهم (خاص بوفاة المدين) */
    heirs_notification_workflow?: {
        hasReceivedInitialNotice: boolean;
        /**
         * تتبّع مستقل لكل وريث (كل وريث له دورة حياة خاصة به):
         * مذكرة الإخبار (7 أيام) ← التكليف بالحضور (3 أيام) ← مفاتحة التحقيق ← حضور الوريث.
         */
        byHeir?: Record<
            string,
            {
                heirName: string;
                memoDate?: string | null;
                memoStatus?: 'none' | 'active' | 'attended' | 'closed_manual';
                summonDate?: string | null;
                summonStatus?: 'none' | 'active' | 'expired';
                investigationRequestStatus?: 'none' | 'requested';
                investigationDecisionStatus?: 'none' | 'pending' | 'approved' | 'rejected';
                investigationDecisionId?: string | null;
                arrestWarrantStatus?: 'none' | 'issued';
                lastActionAt?: string | null;
            }
        >;
    } | null;

    /** إنهاء صفة موظف — اعتبار المدين كاسباً وإخفاء أداة حجز الراتب */
    debtor_kasab_termination?: {
        active: boolean;
        termination_date?: string;
    } | null;

    /**
     * إنهاء الحالة الوظيفية: اعتبار المدين كاسباً (بدون راتب).
     * بيانات قديمة قد تحتوي mode آخر — تُعامل كإنهاء فعلي عند القراءة فقط.
     */
    employment_termination?: {
        mode: 'no_salary';
        effective_date: string;
    } | null;

    /** وجهة مفاتحة حجز الراتب بعد التقاعد */
    garnishment_target?: 'employer' | 'national_retirement_board';

    /**
     * بعد موافقة المنفذ على طلب يصنَّف كـ «تبليغ/إخبار» في مركز القرارات —
     * يفتح مسارات الإجراءات الجبريّة المعتمدة على التبليغ (useDecisionDispatcher).
     */
    executor_coercive_unlock?: boolean;

    /** معرف الإضبارة الأم (في حالة التوحيد: parent-child relationship) */
    parentId?: string;
    /** رقم الإضبارة الأم المعروض (بعد التوحيد) */
    parentDisplayNumber?: string;

    transferPendingFileNumberChange?: boolean;

    /** رمز آمن لمشاركة الإضبارة (طلب توحيد الأضابير) */
    linkToken?: string;
    /** الأضابير الموحّدة مع هذه الإضبارة */
    linkedDossiers?: Array<{
        linkedId: string;
        type: 'own' | 'colleague';
        directorate?: string;
        fileNumber?: string;
        fileYear?: string;
        linkToken?: string;
        linkedAt: string;
    }>;

    /** سجل مخاطبات الإنابة (تبويب التحكم في الإضبارة) */
    inaba_correspondence_log?: Array<{
        id: string;
        subFileId: string;
        directorate: string;
        subject: string;
        requestDate: string;
        createdAt: string;
        status: 'pending_executor' | 'sent' | 'rejected';
        decisionRowId?: string;
        sentAt?: string;
    }>;

    /** جدول تقسيط شهري مبدئي لحجز الراتب بعد موافقة المنفذ على طلب الحجز */
    salary_garnishment_installment_schedule?: {
        executionDecisionId?: string;
        monthlyAmountIqd?: number;
        startDate?: string;
        notes?: string;
        createdAt: string;
    } | null;

    notificationCount?: number;
    executionFeeAdded?: boolean;
    isHolidayExtension?: boolean;
    
    // Documents
    documentDetails?: DocumentDetails | ShariaDeedDetails | CommercialPaperDetails;
    
    // Financial Ledger
    financialLedger?: LedgerEntry[];
    
    /** من نموذج فتح الإضبارة: مشاهدة واستصحاب */
    includesSleepover?: boolean;
    visitationChildrenNames?: string[];
    /** جدول مشاهدة واستصحاب — تأسيس + مواعيد سنة */
    visitationSchedule?: import('@/app/types/visitationSchedule').VisitationScheduleBundle;
    /** أثاث زوجية — قائمة القطع المحكوم بها */
    maritalFurnitureItems?: import('@/app/types/maritalFurniture').MaritalFurnitureItem[];
    /** موعد تسليم الأثاث الزوجية — من إجراء «تسليم أثاث» */
    maritalFurnitureDeliveryScheduleYmd?: string;
    maritalFurnitureDeliveryScheduleLabel?: string;
    maritalFurnitureDeliveryScheduledAt?: string;
    maritalFurnitureDeliveryRecordedAt?: string;
    /** نزع حضانة (قيمة المطالبة المخزّنة: تسليم ولد) */
    /** وفاة مستحقي النفقة المستمرة — تتبع جزئي دون إحلال ورثة */
    alimony_beneficiary_death?: {
        wife_deceased?: boolean;
        children_deceased_count?: number;
        last_report_at?: string;
    };
    custodyWardNames?: string[];
    /** مواعيد وتسليم المحضونين — نزع حضانة */
    custodyWardDelivery?: import('@/app/types/custodyWardDelivery').CustodyWardDeliveryBundle;
    /** تسليم شيء معين — وصف المحكوم به */
    specificDeliveryItemName?: string;
    /** تسليم شيء معين — منقول | غير منقول */
    specificDeliveryItemNature?: 'movable' | 'immovable';
    /** تسليم شيء معين — قائمة الأشياء المحكوم بتسليمها (متعددة) */
    specificDeliveryItems?: Array<{
        id: string;
        name: string;
        nature: 'movable' | 'immovable';
        status: 'pending' | 'financialized';
        financializedAmount?: number;
        financializedAt?: string;
        declaredDestroyed?: boolean;
        judgmentValueIqd?: number;
    }>;
    /** بعد تحويل المطالبة مالياً لتعذر التسليم */
    specificDeliveryFinancialized?: boolean;
    specificDeliveryConvertedAmount?: number;
    specificDeliveryFinancializedAt?: string;

    // ─── التبليغ والإحضار الجبري (محرك الحصانة) ───
    /** طبيعة المطالبة لغرض الإحضار؛ إن لم تُحدَّد تُستنتج من نوع الدعوى */
    summoningClaimNature?: 'مالي' | 'غير مالي';
    /** تعليم صريح: مطالبة نفقة (يُكمّل استنتاج claimType) */
    isAlimony?: boolean;
    /** هل راتب الموظف المحجوز يغطي النفقة المستحقة؟ */
    salaryCoversAlimony?: boolean;
    /** كفيل ضامن على مستوى الملف (يُكمّل بيانات المدين و executionTarget) */
    hasGuarantor?: boolean;
    /** طلب كفيل من محضر المتابعة — بيانات الكفيل تُكمَل في الملف بعد موافقة المنفذ */
    guarantor_followup?: {
        executor_approved: boolean;
        /** مصدر السجل — يمنع اختلاط الكفيل المالي مع التعهد الإجرائي */
        channel?: 'financial' | 'procedural';
        /** بعد موافقة المنفذ: لا تُعاد دورة الطلب حتى يُكمَل الحفظ هنا */
        details_saved?: boolean;
        guarantee_type?: 'amount' | 'attendance';
        guarantor_name?: string;
        guarantor_workplace?: string;
        /** راتب الكفيل الشهري (د.ع) إن وُجد */
        guarantor_salary_iqd?: number | null;
        /** مقدار الاستقطاع من راتب الكفيل (د.ع) إن وُجد */
        guarantor_deduction_iqd?: number | null;
        /** تعليم الدائن في الشارات بعد حفظ البيانات */
        creditor_notation_registered?: boolean;
    } | null;
    guarantor_followup_history?: Array<
        NonNullable<ExecutionFile['guarantor_followup']> & { archivedAt: string }
    >;
    /** كفالة/تعهد إجرائي عام — غير مرتبط بالمركز المالي أو نوع قرار محدد */
    procedural_guarantee?: {
        enabled: boolean;
        purpose?: string;
        guarantor_name?: string;
        pledge_amount_iqd?: number | null;
        deadline_ymd?: string | null;
        saved_at?: string;
        /** بعد الحفظ الناجح — تُغلق الحاوية وتُنقل البيانات لبطاقة الضامن */
        committed_to_followup?: boolean;
    } | null;
    procedural_guarantee_history?: Array<
        NonNullable<ExecutionFile['procedural_guarantee']> & { archivedAt: string }
    >;
    guarantor_notification?: {
        noticeDateYmd: string;
        reason: string;
        endedAt?: string | null;
        attendedAt?: string | null;
    } | null;
    forcedAttendanceIssued?: boolean;
    activeNoticeState?: string | null;
    debtorAttendedVoluntarily?: boolean;
    debtorEvaded?: boolean;
    arrestWarrantUnlocked?: boolean;
    executionTarget?: string;
    debtorArrested?: boolean;
    nonInterferenceIssued?: boolean;
    /** بعد أول إخبار = 1؛ يزيد مع كل إعادة إحالة بعد تحقق الغرض (تبليغ لاحق بلا مهلة) */
    summoningRound?: number;
    voluntaryAttendanceCount?: number;
    /** مسار الكاسب بعد مذكرة الإحضار الجبري */
    investigationCourtRequested?: boolean;
    /** تنازل صريح عن مسار مفاتحة التحقيق — تُخفى البطاقة حتى إعادة تسجيل «متخفي» */
    investigation_court_withdrawn_at?: string | null;
    investigationMemoIssued?: boolean;
    investigationPathDebtorPresent?: boolean;
    forcedPathAttendanceSecured?: boolean;

    /** تخلية مأجور / تسليم عقار — بيانات العين (إلزامية عند فتح الإضبارة بهذا النوع) */
    property_number?: string;
    /** المقاطعة */
    district?: string;
    property_type?: string;
    full_address?: string;

    /** تخلية: تجاري (لا مهلة تخلية سكنية) | سكني (مهلة تخلية بحد أقصى 90 يوماً) */
    eviction_premises_use?: 'commercial' | 'residential';
    /** تاريخ انتهاء مهلة التخلية التي يحددها المنفذ للعقار السكني (YYYY-MM-DD) */
    eviction_vacate_deadline?: string | null;
    /** أول يوم احتساب مدة مهلة التخلية السكنية (YYYY-MM-DD) — للعرض والسجل والتقويم */
    eviction_residential_grace_period_start?: string | null;
    /** سكني: موافقة المنفذ على منح المهلة (بعد تسجيل تاريخ انتهائها) */
    eviction_executor_vacate_grant_approved?: boolean;
    /** سكني: المحامي أنهى المهلة يدوياً قبل تاريخ الانتهاء (ISO) */
    eviction_residential_grace_manually_ended_at?: string | null;
    /** تخلية: القوة الجبرية (مرافقة جهة أمنية) — تظهر كشارة حتى الإتمام */
    eviction_police_assistance?: {
        decisionId: string;
        agencyName: string;
        dueYmd: string;
        savedAt: string;
        completedAt?: string | null;
    } | null;
    /** إظهار تبويب المحجوزات/الأموال في واجهة التخلية بعد طلب أتعاب أو مصاريف */
    eviction_assets_tab_unlocked?: boolean;
    /** مصاريف مباشرة على إضبارة التخلية (تتبع — لا تُدمج تلقائياً في المتبقي إلا إذا ربطت لاحقاً بدفعة) */
    eviction_case_expenses?: Array<{ id: string; amount: number; note: string; date: string }>;
    encroachment_case_expenses?: Array<{
        id: string;
        amount: number;
        note: string;
        date: string;
        requestTitle: string;
        workflowKey: string;
    }>;
    /** طُلِب صراحةً من المحامي صرف الأتعاب المحكومة (يشغّل احتساب رسم التحصيل 3% في مسار التخلية) */
    eviction_lawyer_fee_requested?: boolean;
    /** تاريخ أول إخبار بالتنفيذ — ثابت لحساب مهلة الـ7 أيام ولا يُستبدل بالتبليغات اللاحقة */
    eviction_first_notice_date?: string | null;
    /**
     * تخلية + كاسب — أول إخبار: هل أتعاب المحاماة مشمولة صراحةً في مذكرة الإخبار الأصلية.
     * false/غير مُحدَّد = مسار اعتيادي دون اعتبار الأتعاب جزءاً من صياغة المذكرة الأولى.
     */
    eviction_initial_notice_lawyer_fees_included?: boolean;
    /** آخر تبليغ لاحق (تخلية): هل عُيِّن صراحةً أن الغاية استحصال مؤيد من المنفذ */
    eviction_last_summons_for_collection?: boolean;
    /** عند تبليغ لاستحصال: فرع التبليغ العادي مقابل مسار الإحضار الجبري */
    eviction_last_collection_summons_branch?: 'ordinary' | 'coercive' | null;
    /** آلة حالات تبليغ الكاسب لاستحصال الأتعاب/المصاريف (واجهة التخلية) */
    eviction_earner_fee_collection_sm?: EvictionEarnerFeeCollectionSM;
    /** تخلية: عدم المطالبة بالأتعاب المحكومة عند فتح الإضبارة — إخفاء الأتعاب من الوعاء حتى التفعيل */
    eviction_lawyer_fee_waived_at_intake?: boolean;

    /**
     * تخلية: المحامي أعلن يدوياً انتهاء مدة التنفيذ الرضائي (بعد مرور 7 أيام تقويمية من اليوم التالي لتاريخ الإخبار الفعلي).
     * لا يُستبدل الاحتساب التلقائي بهذا الحقل إلا بعد الضغط على الزر المخصص.
     */
    eviction_voluntary_period_end_declared?: boolean;

    /** تخلية: تاريخ تبليغ الورثة (YYYY-MM-DD) — يضبطه المحامي دون إجبار */
    eviction_heirs_notification_date_ymd?: string | null;

    /**
     * حراس قضائيون — يدعم أكثر من حارس؛ كل سجل له اسم وراتب.
     */
    eviction_judicial_custodians?: Array<{
        id: string;
        fullName: string;
        salary: string;
        decisionId?: string;
        savedAt: string;
    }>;
    /** @deprecated يُستبدل بـ eviction_judicial_custodians — يُقرأ للتوافق مع ملفات قديمة */
    eviction_judicial_custodian?: {
        decisionId?: string;
        fullName: string;
        salary: string;
        savedAt: string;
    } | null;

    // ─── لوحة التنفيذ — حقول عرض/حالة (توافق نماذج قديمة وربط 1:1) ───
    creditorAttended?: boolean;
    /** إيقاف مؤقت للعرض — منفصل عن isPaused عند الحاجة */
    executionPaused?: boolean;
    debtorForcedToAttend?: boolean;
    executionFeeInjected?: boolean;
    executionNumber?: string;
    executionYear?: string;
    executionType?: string;
    classification?: string;
    lawyerFeesAmount?: number;
    clientFeesAmount?: number;
    monthlyAlimony?: number;
    accumulatedAlimony?: number;
    initiator?: string;
    representedParty?: string;
    daysSinceNotice?: number;
    isAlimonyCase?: boolean;
    lastPaymentDate?: string | null;
    shariaDeedNumber?: string;
    shariaRegisterNumber?: string;
    shariaIssueDate?: string;
    shariaIssuingCourt?: string;
    chequeBankName?: string;
    chequeIssueDate?: string;
    chequeNumber?: string;
    garnishmentAmount?: number;
    employeeSalary?: number;
    perDebtorSalaries?: Record<string, string>;
    perDebtorGarnishments?: Record<string, string>;
    pastWifeAlimony?: number;
    pastChildrenAlimony?: number;
    monthlyWifeAlimony?: number;
    monthlyChildrenAlimony?: number;
    childrenCount?: number;

    ghuramaDistributionLogs?: GhuramaDistributionLog[];
}

/** موافقة منفذ على الكفيل مع بيانات لم تُثبَّت بعد — حتى يُضغط «حفظ» صراحةً */
export function guarantorFollowupAwaitingDetailsSave(
    gf: ExecutionFile['guarantor_followup'] | null | undefined
): boolean {
    if (!gf?.executor_approved) return false;
    return gf.details_saved !== true;
}

/** إظهار شارة الكفيل لدى الدائن الأول بعد موافقة المنفذ (قبل أو بعد تثبيت البيانات) */
export function guarantorFollowupCreditorNotationActive(
    gf: ExecutionFile['guarantor_followup'] | null | undefined
): boolean {
    return gf?.executor_approved === true;
}

/** وصفية تبليغ لاحق في تخلية — كاسب */
export interface EvictionSubsequentSummonsMeta {
    forCollection: boolean;
    branch: 'ordinary' | 'coercive' | null;
}


