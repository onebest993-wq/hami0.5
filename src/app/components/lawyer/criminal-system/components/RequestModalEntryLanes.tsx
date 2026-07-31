import type { GuarantorBailKind, GuarantorPerson, LawyerRequest } from '../criminalStore';
import {
    CUSTOM_LAWYER_MOTION_TYPE,
    formatJudicialTemplateDisplayLabel,
    isAssetSeizureTemplate,
    isComplaintCourtReferralTemplate,
    isCustomJudicialTemplate,
    isDefendantBailTemplate,
    isJuvenileJudgeCassationAppealableTemplate,
} from '../proceduralRequestTypes';
import { LAWYER_REQUEST_STATUS_OPTIONS } from '../lawyerRequestStatusMachine';
import { ModalIsoDateInput } from './ModalIsoDateInput';
import {
    buildInvestigationJudicialTemplateGroups,
    decodeInvestigationJudicialSelectValue,
    ADULT_JUDGE_DECISION_OPTGROUP_LABEL,
    COMMON_JUDICIAL_OPTGROUP_LABEL,
    JUVENILE_INVESTIGATION_DETENTION_AUTHORITY,
    JUVENILE_JUDGE_DECISION_OPTGROUP_LABEL,
    resolveInvestigationJudicialEntryScope,
    type InvestigationDefendantsPartyMix,
} from '../juvenileInvestigationRules';
import { JudicialPartyScopeNotice } from './JudicialPartyScopeNotice';

export type RequestEntryLane = 'judicial' | 'lawyer' | '';

/**
 * مسوّدة محلّية لصنف مال محجوز قبل الحفظ — مرنة بحقول اختيارية.
 * تُحوَّل لاحقاً إلى `SeizedAsset` المخزَّن داخل المتجر.
 */
export type SeizedAssetDraft = {
    localId: string;
    description: string;
    referenceNumber?: string;
    seizureDate?: string;
    notes?: string;
};

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

export const RequestModalEntryLanes = ({
    activeLane,
    reqEntryLane,
    reqTypeTemplate,
    reqCustomTypeName,
    reqIsAppealable = false,
    reqStatus,
    reqJudgeMargin,
    reqDecisionDate,
    reqDate,
    reqDetentionStartDate,
    reqDetentionEndDate,
    reqLegalArticleBasis,
    reqReferredCourtName,
    reqNeedsDetentionDateRange,
    hideGlobalDetentionFields = false,
    hideGlobalBailFields = false,
    reqIsOrderEnforcementEntry,
    isRequestFinalStatus,
    reqDecisionBeforeRequest,
    trialCourtManualOnly = false,
    isInvestigationPhase = false,
    defendantsPartyMix = 'adults_only',
    reqJudicialEntryScope = null,
    mixedInvestigationScopedDefendantNames = [],
    reqJuvenileDetentionLocked = false,
    isAllDefendantsUnknown = false,
    reqBailKind = '',
    reqBailAmount = '',
    reqBailGuarantors = [],
    assetSeizureFugitives = [],
    assetSeizureSelectedDefendantIds = [],
    assetSeizureDraftsByDefendant = {},
    onAssetSeizureSelectedChange,
    onAssetSeizureDraftsChange,
    onApplyJudicialTemplate,
    onApplyLawyerTemplate,
    onClearEntryLane,
    onCustomTypeNameChange,
    onAppealableChange,
    onStatusChange,
    onJudgeMarginChange,
    onDecisionDateChange,
    onDetentionStartChange,
    onDetentionEndChange,
    onLegalArticleBasisChange,
    onReferredCourtNameChange,
    onBailKindChange,
    onBailAmountChange,
    onBailGuarantorsChange,
    customJudicialConcernedParties = [],
    customJudicialConcernedPartyId = '',
    onCustomJudicialConcernedPartyChange,
}: RequestModalEntryLanesProps) => {
    const reqIsComplaintReferralEntry = isComplaintCourtReferralTemplate(reqTypeTemplate);
    const reqIsDefendantBailEntry = isDefendantBailTemplate(reqTypeTemplate);
    const reqIsAssetSeizureEntry = isAssetSeizureTemplate(reqTypeTemplate);
    const judicialTemplateGroups = buildInvestigationJudicialTemplateGroups(trialCourtManualOnly, {
        includeAssetSeizure: assetSeizureFugitives.length > 0,
        isInvestigationPhase,
        defendantsPartyMix,
        isAllDefendantsUnknown,
    });
    const judicialTemplateSelected =
        reqEntryLane === 'judicial' && Boolean(String(reqTypeTemplate ?? '').trim());
    const judicialSelectValue =
        judicialTemplateSelected && reqTypeTemplate.trim() ? reqTypeTemplate.trim() : '';
    const mixedInvestigationPartyScope =
        isInvestigationPhase &&
        defendantsPartyMix === 'mixed' &&
        reqEntryLane === 'judicial' &&
        reqTypeTemplate.trim()
            ? resolveInvestigationJudicialEntryScope(
                  reqTypeTemplate,
                  reqJudicialEntryScope,
                  defendantsPartyMix,
              )
            : undefined;

    /* === helpers لمحرّر «حجز الأموال» — مرنة، تعتمد على defendantId فقط === */
    const isSeizureSelected = (did: string): boolean =>
        assetSeizureSelectedDefendantIds.includes(did);

    const toggleSeizureDefendant = (did: string) => {
        if (!onAssetSeizureSelectedChange) return;
        if (isSeizureSelected(did)) {
            onAssetSeizureSelectedChange(
                assetSeizureSelectedDefendantIds.filter((x) => x !== did),
            );
        } else {
            onAssetSeizureSelectedChange([...assetSeizureSelectedDefendantIds, did]);
        }
    };

    const getDraftsFor = (did: string): SeizedAssetDraft[] =>
        Array.isArray(assetSeizureDraftsByDefendant[did])
            ? assetSeizureDraftsByDefendant[did]
            : [];

    const addAssetRow = (did: string) => {
        if (!onAssetSeizureDraftsChange) return;
        const drafts = getDraftsFor(did);
        const localId = `a_${Date.now()}_${drafts.length}_${Math.random().toString(16).slice(2, 6)}`;
        onAssetSeizureDraftsChange(did, [
            ...drafts,
            { localId, description: '', referenceNumber: '', seizureDate: '', notes: '' },
        ]);
    };

    const removeAssetRow = (did: string, localId: string) => {
        if (!onAssetSeizureDraftsChange) return;
        onAssetSeizureDraftsChange(
            did,
            getDraftsFor(did).filter((a) => a.localId !== localId),
        );
    };

    const updateAssetField = (
        did: string,
        localId: string,
        field: keyof Omit<SeizedAssetDraft, 'localId'>,
        value: string,
    ) => {
        if (!onAssetSeizureDraftsChange) return;
        onAssetSeizureDraftsChange(
            did,
            getDraftsFor(did).map((a) =>
                a.localId === localId ? { ...a, [field]: value } : a,
            ),
        );
    };

    const singleFugitive = assetSeizureFugitives.length === 1 ? assetSeizureFugitives[0] : null;
    /** في الحالة المتعدّدة: نُظهر حاوية لكل متهم مُختار فقط. */
    const seizureContainerTargets = assetSeizureFugitives.filter((f) => isSeizureSelected(f.id));

    const updateGuarantorName = (id: string, name: string) => {
        if (!onBailGuarantorsChange) return;
        onBailGuarantorsChange(
            reqBailGuarantors.map((g) => (g.id === id ? { ...g, fullName: name } : g)),
        );
    };

    const addGuarantor = () => {
        if (!onBailGuarantorsChange) return;
        onBailGuarantorsChange([
            ...reqBailGuarantors,
            { id: `g_${Date.now()}_${reqBailGuarantors.length}`, fullName: '' },
        ]);
    };

    const removeGuarantor = (id: string) => {
        if (!onBailGuarantorsChange) return;
        onBailGuarantorsChange(reqBailGuarantors.filter((g) => g.id !== id));
    };

    /**
     * عَلامة «قابل للتمييز» التَفاعلية — تَظهر بجوار اسم الإجراء اليدوي / طلب المحامي،
     * مُفعَّلة افتراضياً (لأن هذه الأنواع قابلة للطعن قانوناً)، ويُمكن للمحامي إيقافها يدوياً
     * بالنَّقر إذا كان القَرار المُعَيَّن غير قابل للتمييز في حالته الخاصة.
     */
    const handleAppealableToggle = () => {
        if (onAppealableChange) onAppealableChange(!reqIsAppealable);
    };
    const isJuvenileAutoAppealable = isJuvenileJudgeCassationAppealableTemplate(reqTypeTemplate);
    const displayAppealable = isJuvenileAutoAppealable ? true : reqIsAppealable;
    const isAppealableInteractive = Boolean(onAppealableChange) && !isJuvenileAutoAppealable;
    const appealableToggleClass = displayAppealable
        ? 'border-[#E6C673]/55 bg-[#E6C673]/10 text-[#E6C673]'
        : 'border-slate-600/55 bg-slate-800/40 text-white/55';
    const appealableToggleTitle = displayAppealable
        ? 'قَرار قابل للطعن التمييزي — انقر لإيقاف العَلامة'
        : 'العَلامة مُوقفة — انقر لإعادة تَفعيل قابلية التمييز';
    const cassationAppealableBadge = isAppealableInteractive ? (
        <button
            type="button"
            role="switch"
            aria-checked={displayAppealable}
            onClick={handleAppealableToggle}
            title={appealableToggleTitle}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-black whitespace-normal break-words transition hover:brightness-110 ${appealableToggleClass}`}
        >
            <span aria-hidden>{displayAppealable ? '✅' : '⬜'}</span>
            <span aria-hidden>⚖️</span>
            <span>{displayAppealable ? 'قابل للتمييز' : 'غير قابل للتمييز'}</span>
        </button>
    ) : (
        <div
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-black whitespace-normal break-words ${appealableToggleClass}`}
            title={displayAppealable ? 'قرار قابل للطعن التمييزي' : 'قرار غير قابل للطعن التمييزي'}
        >
            <span aria-hidden>⚖️</span>
            <span>{displayAppealable ? 'قابل للتمييز' : 'غير قابل للتمييز'}</span>
        </div>
    );

    /**
     * 🧪 قواعد قانونية (أصول المحاكمات الجزائية):
     *  - «الطلب» لا يُميَّز — التمييز حصرٌ على «القرار القضائي». لذلك لا تَظهر علامة
     *    «قابل للتمييز» داخل حاوية «طلبات المحامي» (lawyer lane).
     *  - أما «القرار اليدوي المخصّص» داخل حاوية «قرارات القاضي» (judicial lane)
     *    فيُمكن أن يكون قابلاً للتمييز — تَبقى العَلامة فيه.
     */
    const customJudicialConcernedPartyField = (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/30 p-3 space-y-2">
            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                الأمر يخص من
            </label>
            <select
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                value={customJudicialConcernedPartyId}
                onChange={(e) => onCustomJudicialConcernedPartyChange?.(e.target.value.trim())}
            >
                <option value="" className="bg-slate-900 text-white">
                    قرار عام للإضبارة
                </option>
                {customJudicialConcernedParties.map((party) => (
                    <option key={party.id} value={party.id} className="bg-slate-900 text-white">
                        {party.label}
                    </option>
                ))}
            </select>
        </div>
    );

    const manualNameAndAppealFields = (
        namePlaceholder: string,
        opts?: { activateLawyerLane?: boolean; showAppealableBadge?: boolean },
    ) => (
        // Fragment (لا حاوية إضافية) — الـ `space-y-3` يأتي من الحاوية الأم (السماوية/البنفسجية).
        <>
            <input
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                value={reqCustomTypeName}
                onChange={(e) => onCustomTypeNameChange(e.target.value)}
                onFocus={
                    opts?.activateLawyerLane
                        ? () => onApplyLawyerTemplate(CUSTOM_LAWYER_MOTION_TYPE)
                        : undefined
                }
                placeholder={namePlaceholder}
            />
            {opts?.showAppealableBadge !== false ? (
                <div className="flex">{cassationAppealableBadge}</div>
            ) : null}
        </>
    );

    return (
        <>
            {activeLane === 'judicial' ? (
            <div className="rounded-xl border border-sky-500/35 bg-sky-950/20 p-3 space-y-3">
                <div className="text-sky-100 text-xs font-black whitespace-normal break-words">
                    🏛️ قرارات القاضي
                </div>
                {trialCourtManualOnly ? (
                    <>
                        {manualNameAndAppealFields('اسم القرار…')}
                        {customJudicialConcernedPartyField}
                    </>
                ) : null}
                {!trialCourtManualOnly ? (
                    <select
                        className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E6C673]/60 ${
                            judicialTemplateSelected ? 'text-white' : 'text-white/40'
                        }`}
                        value={judicialSelectValue}
                        onChange={(e) => {
                            const v = e.target.value.trim();
                            if (!v) {
                                onClearEntryLane();
                                return;
                            }
                            const { template, groupScope } = decodeInvestigationJudicialSelectValue(v);
                            onApplyJudicialTemplate(template, groupScope);
                        }}
                    >
                        <option value="" disabled hidden className="bg-slate-900 text-white/40">
                            قرار القاضي
                        </option>
                        {judicialTemplateGroups.common.length ? (
                            <optgroup
                                label={COMMON_JUDICIAL_OPTGROUP_LABEL}
                                className="bg-slate-900 text-white/80"
                            >
                                {judicialTemplateGroups.common.map((opt) => (
                                    <option key={`common-${opt}`} value={opt} className="bg-slate-900 text-white">
                                        {formatJudicialTemplateDisplayLabel(opt)}
                                    </option>
                                ))}
                            </optgroup>
                        ) : null}
                        {judicialTemplateGroups.adult.length ? (
                            <optgroup
                                label={ADULT_JUDGE_DECISION_OPTGROUP_LABEL}
                                className="bg-slate-900 text-white/80"
                            >
                                {judicialTemplateGroups.adult.map((opt) => (
                                    <option key={`adult-${opt}`} value={opt} className="bg-slate-900 text-white">
                                        {formatJudicialTemplateDisplayLabel(opt)}
                                    </option>
                                ))}
                            </optgroup>
                        ) : null}
                        {judicialTemplateGroups.juvenile.length ? (
                            <optgroup
                                label={JUVENILE_JUDGE_DECISION_OPTGROUP_LABEL}
                                className="bg-slate-900 text-white/80"
                            >
                                {judicialTemplateGroups.juvenile.map((opt) => (
                                    <option
                                        key={`jv-${opt}`}
                                        value={opt}
                                        className="bg-slate-900 text-white"
                                    >
                                        {formatJudicialTemplateDisplayLabel(opt)}
                                    </option>
                                ))}
                            </optgroup>
                        ) : null}
                    </select>
                ) : null}
                {mixedInvestigationPartyScope ? (
                    <JudicialPartyScopeNotice
                        scope={mixedInvestigationPartyScope}
                        defendantNames={mixedInvestigationScopedDefendantNames}
                    />
                ) : null}
                {reqEntryLane === 'judicial' &&
                isJuvenileAutoAppealable &&
                !isCustomJudicialTemplate(reqTypeTemplate) &&
                !trialCourtManualOnly ? (
                    <div className="flex">{cassationAppealableBadge}</div>
                ) : null}
                {reqEntryLane === 'judicial' && reqIsComplaintReferralEntry && !trialCourtManualOnly ? (
                    <>
                        <div className="rounded-xl border border-sky-500/30 bg-sky-950/30 p-3 space-y-2">
                            <div className="text-sky-100 text-xs font-black whitespace-normal break-words">
                                المحكمة الجديدة *
                            </div>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                value={reqReferredCourtName}
                                onChange={(e) => onReferredCourtNameChange(e.target.value)}
                                placeholder="اسم المحكمة المحال إليها..."
                            />
                            <p className="text-[10px] font-bold text-white/45 whitespace-normal break-words">
                                يُحدَّث «اسم المحكمة» في ترويسة الإضبارة تلقائياً عند توثيق القرار.
                            </p>
                        </div>
                    </>
                ) : null}
                {reqEntryLane === 'judicial' && isCustomJudicialTemplate(reqTypeTemplate) && !trialCourtManualOnly ? (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                اسم القرار اليدوي *
                            </label>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                value={reqCustomTypeName}
                                onChange={(e) => onCustomTypeNameChange(e.target.value)}
                            />
                        </div>
                        <div className="flex">{cassationAppealableBadge}</div>
                        {customJudicialConcernedPartyField}
                    </div>
                ) : null}
                {reqEntryLane === 'judicial' && reqJuvenileDetentionLocked && !trialCourtManualOnly ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
                        <div className="text-amber-100 text-xs font-black whitespace-normal break-words">
                            مكان إيداع الحدث (إجباري)
                        </div>
                        <div className="text-white font-black text-sm">{JUVENILE_INVESTIGATION_DETENTION_AUTHORITY}</div>
                        <p className="text-[10px] font-bold text-white/50 whitespace-normal break-words">
                            خيارات التوقيف الاعتيادية (المركز، مكافحة الإجرام، التسفيرات) غير متاحة للمتهم الحدث.
                        </p>
                    </div>
                ) : null}
                {reqEntryLane === 'judicial' &&
                reqNeedsDetentionDateRange &&
                !hideGlobalDetentionFields &&
                !trialCourtManualOnly ? (
                    <>
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                تاريخ بدء التوقيف *
                            </label>
                            <ModalIsoDateInput
                                value={reqDetentionStartDate}
                                onChange={onDetentionStartChange}
                                max={reqDetentionEndDate.trim() || undefined}
                            />
                        </div>
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                تاريخ انتهاء التوقيف *
                            </label>
                            <ModalIsoDateInput
                                value={reqDetentionEndDate}
                                onChange={onDetentionEndChange}
                                min={reqDetentionStartDate.trim() || reqDate.trim() || undefined}
                            />
                        </div>
                    </>
                ) : null}
                {reqEntryLane === 'judicial' && reqIsOrderEnforcementEntry && !trialCourtManualOnly ? (
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            المادة القانونية المستند عليها *
                        </label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={reqLegalArticleBasis}
                            onChange={(e) => onLegalArticleBasisChange(e.target.value)}
                        />
                    </div>
                ) : null}
                {reqEntryLane === 'judicial' &&
                reqIsDefendantBailEntry &&
                !hideGlobalBailFields &&
                !trialCourtManualOnly ? (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-3 space-y-3">
                        <div className="text-emerald-100 text-xs font-black whitespace-normal break-words">
                            🛡️ تفاصيل الكفالة *
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => onBailKindChange?.('financial')}
                                className={`rounded-lg border px-3 py-2 text-[12px] font-black transition ${
                                    reqBailKind === 'financial'
                                        ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                                        : 'border-slate-600/60 bg-slate-900/40 text-white/70 hover:text-white hover:border-slate-500'
                                }`}
                            >
                                كفالة مالية
                            </button>
                            <button
                                type="button"
                                onClick={() => onBailKindChange?.('personal')}
                                className={`rounded-lg border px-3 py-2 text-[12px] font-black transition ${
                                    reqBailKind === 'personal'
                                        ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                                        : 'border-slate-600/60 bg-slate-900/40 text-white/70 hover:text-white hover:border-slate-500'
                                }`}
                            >
                                كفالة شخص ضامن
                            </button>
                        </div>
                        {reqBailKind === 'financial' ? (
                            <div>
                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                    مبلغ الكفالة المالية *
                                </label>
                                <input
                                    inputMode="numeric"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={reqBailAmount}
                                    onChange={(e) => onBailAmountChange?.(e.target.value)}
                                    placeholder="مثال: 1000000"
                                />
                            </div>
                        ) : null}
                        {reqBailKind === 'personal' ? (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <label className="block text-white/70 text-xs whitespace-normal break-words">
                                        أسماء الكفلاء ({reqBailGuarantors.length})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addGuarantor}
                                        className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black text-emerald-100 hover:bg-emerald-500/20 transition"
                                    >
                                        + إضافة كفيل
                                    </button>
                                </div>
                                {reqBailGuarantors.length === 0 ? (
                                    <p className="text-[11px] font-bold text-white/45 whitespace-normal break-words">
                                        لم يُضَف أي كفيل بعد — اضغط «إضافة كفيل» لإدخال الأسماء.
                                    </p>
                                ) : null}
                                {reqBailGuarantors.map((g, idx) => (
                                    <div key={g.id} className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-white/45 w-6 text-center">
                                            {idx + 1}
                                        </span>
                                        <input
                                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                            value={g.fullName}
                                            onChange={(e) => updateGuarantorName(g.id, e.target.value)}
                                            placeholder="الاسم الكامل للكفيل"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeGuarantor(g.id)}
                                            className="rounded-lg border border-red-500/35 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-black text-red-200 hover:bg-red-500/20 transition"
                                            title="حذف الكفيل"
                                        >
                                            🗑
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : null}
                {reqEntryLane === 'judicial' && reqIsAssetSeizureEntry ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/15 p-3 space-y-2.5">
                        {/* الحالة المفردة: زرّ إضافة في الأعلى، وصفوف أنيقة من سطرٍ واحد. */}
                        {singleFugitive ? (
                            <>
                                <div className="flex items-center justify-end">
                                    <button
                                        type="button"
                                        onClick={() => addAssetRow(singleFugitive.id)}
                                        className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-black text-amber-100 hover:bg-amber-500/20 transition whitespace-nowrap"
                                    >
                                        + إضافة صنف
                                    </button>
                                </div>

                                {getDraftsFor(singleFugitive.id).map((a) => (
                                    <div key={a.localId} className="flex items-center gap-2">
                                        <input
                                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-[#E6C673]/60"
                                            value={a.description}
                                            onChange={(e) =>
                                                updateAssetField(singleFugitive.id, a.localId, 'description', e.target.value)
                                            }
                                            placeholder="وصف المال"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeAssetRow(singleFugitive.id, a.localId)}
                                            className="rounded-lg border border-red-500/35 bg-red-500/10 px-2 py-1.5 text-[11px] font-black text-red-200 hover:bg-red-500/20 transition shrink-0"
                                            title="حذف هذا الصنف"
                                            aria-label="حذف هذا الصنف"
                                        >
                                            🗑
                                        </button>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <>
                                {/* الحالة المتعددة: شارة عدّاد + شبكة اختيار + قسم لكل هارب مُختار بفاصل بصري وليس حاوية مُتداخلة. */}
                                <div className="flex items-center justify-end">
                                    <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-100 whitespace-nowrap">
                                        هاربون {assetSeizureSelectedDefendantIds.length}/{assetSeizureFugitives.length}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {assetSeizureFugitives.map((f) => {
                                        const checked = isSeizureSelected(f.id);
                                        return (
                                            <label
                                                key={f.id}
                                                className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer transition ${
                                                    checked
                                                        ? 'border-amber-400/60 bg-amber-500/15 text-amber-50'
                                                        : 'border-slate-600/60 bg-slate-900/40 text-white/75 hover:border-amber-500/35'
                                                }`}
                                            >
                                                <span className="text-[12px] font-black whitespace-normal break-words flex-1 min-w-0">
                                                    {String(f.fullName ?? '').trim() || '—'}
                                                </span>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleSeizureDefendant(f.id)}
                                                    className="h-4 w-4 accent-amber-400 shrink-0"
                                                    aria-label={`اختيار ${f.fullName} للحجز`}
                                                />
                                            </label>
                                        );
                                    })}
                                </div>

                                {seizureContainerTargets.map((target) => {
                                    const drafts = getDraftsFor(target.id);
                                    return (
                                        <div key={target.id} className="space-y-2 pt-1">
                                            <div className="flex items-center gap-2 border-t border-amber-500/15 pt-2">
                                                <span className="text-[11px] font-black text-amber-100 whitespace-normal break-words flex-1 min-w-0">
                                                    {String(target.fullName ?? '').trim() || '—'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => addAssetRow(target.id)}
                                                    className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-black text-amber-100 hover:bg-amber-500/20 transition whitespace-nowrap shrink-0"
                                                >
                                                    + إضافة صنف
                                                </button>
                                            </div>

                                            {drafts.map((a) => (
                                                <div key={a.localId} className="flex items-center gap-2">
                                                    <input
                                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-[#E6C673]/60"
                                                        value={a.description}
                                                        onChange={(e) =>
                                                            updateAssetField(target.id, a.localId, 'description', e.target.value)
                                                        }
                                                        placeholder="وصف المال"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAssetRow(target.id, a.localId)}
                                                        className="rounded-lg border border-red-500/35 bg-red-500/10 px-2 py-1.5 text-[11px] font-black text-red-200 hover:bg-red-500/20 transition shrink-0"
                                                        title="حذف هذا الصنف"
                                                        aria-label="حذف هذا الصنف"
                                                    >
                                                        🗑
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                ) : null}
            </div>
            ) : null}

            {activeLane === 'lawyer' ? (
            <div className="rounded-xl border border-violet-500/35 bg-violet-950/20 p-3 space-y-3">
                <div className="text-violet-100 text-xs font-black whitespace-normal break-words">⚖️ طلبات المحامي</div>
                {/*
                    لا توجد قائمة منسدلة لـ«اختيار نوع الطلب» — جميع طلبات المحامي إدخال يدوي.
                    حقل «اسم الطلب» يُفعّل تلقائياً قالب CUSTOM_LAWYER_MOTION_TYPE داخل المتجر.
                */}
                {/* 🛡️ طلبات المحامي لا تَحمل خاصية «قابل للتمييز» — التمييز للقرارات لا للطلبات. */}
                {manualNameAndAppealFields('اسم الطلب…', { activateLawyerLane: true, showAppealableBadge: false })}
                {reqEntryLane === 'lawyer' ? (
                    <>
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                حالة الطلب
                            </label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                value={reqStatus}
                                onChange={(e) => onStatusChange(e.target.value as LawyerRequest['status'])}
                            >
                                {LAWYER_REQUEST_STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {isRequestFinalStatus ? (
                            <>
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                        قرار / هامش القاضي الختامي *
                                    </label>
                                    <textarea
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[90px] resize-none"
                                        value={reqJudgeMargin}
                                        onChange={(e) => onJudgeMarginChange(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                        تاريخ قرار القاضي *
                                    </label>
                                    <input
                                        type="date"
                                        min={reqDate.trim() || undefined}
                                        className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 ${
                                            reqDecisionBeforeRequest ? 'border-red-500/60' : 'border-slate-700'
                                        }`}
                                        value={reqDecisionDate}
                                        onChange={(e) => onDecisionDateChange(e.target.value)}
                                    />
                                    {reqDecisionBeforeRequest ? (
                                        <p className="mt-1 text-[11px] font-bold text-red-300 whitespace-normal break-words">
                                            لا يمكن أن يكون تاريخ القرار سابقاً لتاريخ تقديم الطلب ({reqDate.trim() || '—'}).
                                        </p>
                                    ) : null}
                                </div>
                                {reqStatus === 'rejected' ? (
                                    <p className="text-[11px] font-bold text-violet-100/80 whitespace-normal break-words">
                                        عند الحاجة يمكن تسجيل «طعن تمييزي» يدوياً من كارت القرار في السجل الزمني.
                                    </p>
                                ) : null}
                            </>
                        ) : null}
                    </>
                ) : null}
            </div>
            ) : null}
        </>
    );
};
