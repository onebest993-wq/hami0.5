import type { GuarantorBailKind, GuarantorPerson, LawyerRequest } from '../criminalStore';
import type { InvestigationDefendantsPartyMix } from '../juvenileInvestigationRules';

/**
 * Local draft for a seized asset before persisting it into the criminal store.
 * Keeping this type outside the lazy UI component prevents boot graph coupling.
 */
export type SeizedAssetDraft = {
    localId: string;
    description: string;
    referenceNumber?: string;
    seizureDate?: string;
    notes?: string;
};

type RequestEntryLane = 'judicial' | 'lawyer' | '';

/** متهم هارب — تمثيل خفيف للقائمة الظاهرة في محرّر الحجز. */
export type AssetSeizureFugitive = {
    id: string;
    fullName: string;
};

export type RequestModalEntryLanesProps = {
    /**
     * المسار النشط للمودال — يحدّد أيّ حاوية تُرسَم:
     *  - `'judicial'`: حاوية قرارات القاضي فقط (افتراضي للزر «تقديم طلب إلى قرارات القاضي»).
     *  - `'lawyer'`: حاوية طلبات المحامي فقط (الزر الجديد «طلبات المحامي»).
     */
    activeLane: 'judicial' | 'lawyer';
    reqEntryLane: RequestEntryLane;
    reqTypeTemplate: string;
    reqCustomTypeName: string;
    /**
     * قيمة «قابل للتمييز» — افتراضياً غير مفعَّل؛ يُفعَّل فقط بنقرة المستخدم.
     * ويُمكن للمحامي إيقافه يدوياً عبر نقر العَلامة التَوضيحية.
     */
    reqIsAppealable?: boolean;
    reqStatus: LawyerRequest['status'];
    reqJudgeMargin: string;
    reqDecisionDate: string;
    reqDate: string;
    reqDetentionStartDate: string;
    reqDetentionEndDate: string;
    reqLegalArticleBasis: string;
    reqReferredCourtName: string;
    reqNeedsDetentionDateRange: boolean;
    /** مدة التوقيف تُدار في بطاقات مستقلة لكل طرف — إخفاء الحقول العامة. */
    hideGlobalDetentionFields?: boolean;
    /** تفاصيل الكفالة تُدار في بطاقات مستقلة لكل متهم — إخفاء الحقول العامة. */
    hideGlobalBailFields?: boolean;
    reqIsOrderEnforcementEntry: boolean;
    isRequestFinalStatus: boolean;
    reqDecisionBeforeRequest: boolean;
    /** مرحلة الجنح/الجنايات/الأحداث — إدخال يدوي فقط في كلا الحاويتين. */
    trialCourtManualOnly?: boolean;
    /** مرحلة التحقيق — إظهار قوالب غلق/صلح/تفريق في اليوميات. */
    isInvestigationPhase?: boolean;
    /** تركيبة المتهمين المعرّفين — تُصفّي مجموعات القرارات في التحقيق. */
    defendantsPartyMix?: InvestigationDefendantsPartyMix;
    /** مجموعة القائمة التي اختير منها القرار (بالغ/حدث) — لاستقدام/قبض في الإضبارة المختلطة. */
    reqJudicialEntryScope?: 'adult' | 'juvenile' | null;
    /** أسماء المتهمين ضمن نطاق القرار — للحاوية التوضيحية في الإضبارة المختلطة. */
    mixedInvestigationScopedDefendantNames?: readonly string[];
    /** توقيف حدث — مكان الإيداع محصور بدار الملاحظة. */
    reqJuvenileDetentionLocked?: boolean;
    /** كل المتهمين مجهولون — يُقيَّد قائمة القرارات القضائية. */
    isAllDefendantsUnknown?: boolean;
    /** حالات التوقيف/الحرية للمتهمين — تُصفّي قوالب القرارات عند الحاجة. */
    defendantCustodyStatuses?: readonly string[];
    /** بيانات «تكفيل المتهم» المهيكلة — جديد. */
    reqBailKind?: GuarantorBailKind | '';
    reqBailAmount?: string;
    reqBailGuarantors?: GuarantorPerson[];
    /**
     * بيانات «حجز الأموال» — تُمرَّر فقط حين يكون القالب النشط هو ASSET_SEIZURE_TEMPLATE.
     * - `assetSeizureFugitives`: قائمة المتهمين الهاربين الحاليين (مصدر اختيار من).
     * - `assetSeizureSelectedDefendantIds`: المتهمون المُختارون للحجز عليهم.
     *   حين يوجد هارب واحد فقط نخفي قائمة الاختيار ونُختاره ضمنياً.
     * - `assetSeizureDraftsByDefendant`: قائمة الأصناف المُسوَّدة لكل متهم مختار.
     */
    assetSeizureFugitives?: AssetSeizureFugitive[];
    assetSeizureSelectedDefendantIds?: string[];
    assetSeizureDraftsByDefendant?: Record<string, SeizedAssetDraft[]>;
    onAssetSeizureSelectedChange?: (ids: string[]) => void;
    onAssetSeizureDraftsChange?: (defendantId: string, drafts: SeizedAssetDraft[]) => void;
    onApplyJudicialTemplate: (template: string, groupScope?: 'adult' | 'juvenile' | null) => void;
    onApplyLawyerTemplate: (template: string) => void;
    onClearEntryLane: () => void;
    onCustomTypeNameChange: (value: string) => void;
    /** يَستقبل التَبديل اليدوي بين «قابل للتمييز» و«غير قابل للتمييز». */
    onAppealableChange?: (value: boolean) => void;
    onStatusChange: (status: LawyerRequest['status']) => void;
    onJudgeMarginChange: (value: string) => void;
    onDecisionDateChange: (value: string) => void;
    onDetentionStartChange: (value: string) => void;
    onDetentionEndChange: (value: string) => void;
    onLegalArticleBasisChange: (value: string) => void;
    onReferredCourtNameChange: (value: string) => void;
    onBailKindChange?: (kind: GuarantorBailKind | '') => void;
    onBailAmountChange?: (value: string) => void;
    onBailGuarantorsChange?: (list: GuarantorPerson[]) => void;
    /** قرار قضائي يدوي — «الأمر يخص من»: قرار عام أو طرف محدّد. */
    customJudicialConcernedParties?: { id: string; label: string }[];
    customJudicialConcernedPartyId?: string;
    onCustomJudicialConcernedPartyChange?: (partyId: string) => void;
};
