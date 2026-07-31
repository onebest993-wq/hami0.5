import type { CriminalCaseDraft, CriminalCaseStage } from '../criminalCaseModel';
import type { CriminalStoreState } from '../criminalStore';
import {
    isInvestigationStoredStage,
} from '../criminalStageRuntimeCore';
import { formatCriminalStageLabel, isJuvenileExclusiveStoredStage } from '../criminalStagePresentationCore';
import type { InvestigationDefendantsPartyMix } from '../juvenileInvestigationRules';
import {
    NEW_CASE_ALL_UNKNOWN_INVESTIGATION_ONLY_MESSAGE,
    NEW_CASE_MIXED_UNKNOWN_IDENTIFIED_STAGE_BLOCKED_MESSAGE,
} from '../investigationPhaseGuidance';
import {
    CARD_BASE,
    FIELD_LABEL,
    INPUT_BASE,
    PremiumCheckbox,
    SegmentedChoice,
    isJuvenileCourtNature,
} from './helpers';

const REFERRAL_CARD_TITLE = 'بيانات الإحالة';
const REFERRAL_NUMBER_LABEL = 'رقم وتاريخ قرار الإحالة';
const REFERRAL_COURT_LABEL = 'اسم محكمة التحقيق المحيلة';

const CASSATION_CARD_TITLE = 'بيانات القرار المُميز';
const CASSATION_NUMBER_LABEL = 'رقم وتاريخ القرار المُميز';
const CASSATION_COURT_LABEL = 'المحكمة التي أصدرت القرار';

export type CaseInfoSectionProps = {
    draft: CriminalCaseDraft;
    stage: string;
    isSeveranceMode: boolean;
    severanceLockedStage: string;
    isJuvenileInvestigationStage: boolean;
    isCassationStage: boolean;
    isReferralStage: boolean;
    isPublicProsecutionComplainant: boolean;
    investigationPartyMix: InvestigationDefendantsPartyMix;
    newCaseStageOptions: ReadonlyArray<{ value: CriminalCaseStage; label: string }>;
    locksStageToInvestigation: boolean;
    allDefendantsUnknownOnly: boolean;
    mixedUnknownWithIdentified: boolean;
    ensureFirstDefendantJuvenile: () => void;
    setBasicField: CriminalStoreState['setBasicField'];
    setLocationField: CriminalStoreState['setLocationField'];
    setDraftArticleIncludesPublicRight: CriminalStoreState['setDraftArticleIncludesPublicRight'];
};

/**
 * بطاقات معلومات الدعوى الأساسية + الموقع/المحكمة + الإحالة/التمييز —
 * مستخرجة من CriminalNewCase بحرفية الـ JSX.
 */
export function CaseInfoSection({
    draft,
    stage,
    isSeveranceMode,
    severanceLockedStage,
    isJuvenileInvestigationStage,
    isCassationStage,
    isReferralStage,
    isPublicProsecutionComplainant,
    investigationPartyMix,
    newCaseStageOptions,
    locksStageToInvestigation,
    allDefendantsUnknownOnly,
    mixedUnknownWithIdentified,
    ensureFirstDefendantJuvenile,
    setBasicField,
    setLocationField,
    setDraftArticleIncludesPublicRight,
}: CaseInfoSectionProps) {
    return (
        <>
            <div className={CARD_BASE}>
                <div className="text-white font-bold text-sm mb-4">معلومات الدعوى الأساسية</div>
                <div className="space-y-4">
                    <div className="pb-1">
                        <label className={FIELD_LABEL}>مرحلة الدعوى الحالية</label>
                        {isSeveranceMode && severanceLockedStage ? (
                            <>
                                <input
                                    className={INPUT_BASE}
                                    value={formatCriminalStageLabel(
                                        severanceLockedStage,
                                        isJuvenileExclusiveStoredStage(severanceLockedStage),
                                    )}
                                    disabled
                                    readOnly
                                />
                                <p className="mt-1.5 text-[11px] text-white/45 leading-relaxed">
                                    تُورث تلقائياً من مرحلة الإضبارة الأم ولا يمكن تغييرها عند التفريق.
                                </p>
                            </>
                        ) : (
                            <>
                                <select
                                    className={INPUT_BASE}
                                    value={draft.basics.stage}
                                    data-testid="criminal-new-case-stage"
                                    onChange={(e) => {
                                        const next = e.target.value as typeof draft.basics.stage;
                                        if (
                                            locksStageToInvestigation &&
                                            next &&
                                            !isInvestigationStoredStage(next)
                                        ) {
                                            if (typeof globalThis.alert === 'function') {
                                                globalThis.alert(
                                                    mixedUnknownWithIdentified
                                                        ? NEW_CASE_MIXED_UNKNOWN_IDENTIFIED_STAGE_BLOCKED_MESSAGE
                                                        : NEW_CASE_ALL_UNKNOWN_INVESTIGATION_ONLY_MESSAGE,
                                                );
                                            }
                                            return;
                                        }
                                        setBasicField('stage', next);
                                    }}
                                >
                                    <option value="" className="bg-[#0B1021] text-white">
                                        اختر...
                                    </option>
                                    {newCaseStageOptions.map((opt) => (
                                        <option
                                            key={opt.value}
                                            value={opt.value}
                                            className="bg-[#0B1021] text-white"
                                        >
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                {stage && investigationPartyMix === 'juveniles_only' ? (
                                    <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] font-black text-emerald-100/95">
                                        المسار الإجرائي: {formatCriminalStageLabel(stage, false)}
                                    </div>
                                ) : null}
                                {locksStageToInvestigation ? (
                                    <p className="mt-1.5 text-[11px] text-amber-200/70 leading-relaxed">
                                        {allDefendantsUnknownOnly
                                            ? NEW_CASE_ALL_UNKNOWN_INVESTIGATION_ONLY_MESSAGE
                                            : NEW_CASE_MIXED_UNKNOWN_IDENTIFIED_STAGE_BLOCKED_MESSAGE}
                                    </p>
                                ) : null}
                            </>
                        )}
                    </div>

                    {stage !== '' ? (
                        <div className="pb-1">
                            <label className={FIELD_LABEL}>مادة الاتهام</label>
                            <input
                                className={INPUT_BASE}
                                value={draft.basics.legalArticle}
                                onChange={(e) => setBasicField('legalArticle', e.target.value)}
                                placeholder="413 ق.ع — يمكن تعديل المادة يدوياً إذا غيّر القاضي الوصف"
                            />
                            <p className="mt-1.5 text-[11px] text-white/35 leading-relaxed">
                                تُعرض في الإضبارة وتنتقل تلقائياً إلى بيانات الإحالة عند التسجيل بمرحلة محكمة الموضوع.
                            </p>
                            {!isPublicProsecutionComplainant ? (
                                <PremiumCheckbox
                                    className="mt-3"
                                    checked={draft.articleIncludesPublicRight === true}
                                    onChange={setDraftArticleIncludesPublicRight}
                                    label="المادة تتضمن حقاً عاماً"
                                    testId="criminal-article-public-right"
                                />
                            ) : null}
                        </div>
                    ) : null}

                </div>
            </div>

            {draft.basics.stage !== '' ? (
            <div className={CARD_BASE}>
                <div className="space-y-3">
                    {isInvestigationStoredStage(draft.basics.stage) ? (
                        <>
                            {isJuvenileInvestigationStage ? (
                                <div className="text-white font-bold text-sm mb-3">
                                    تحقيق - أحداث رئاسة محكمة الأحداث
                                </div>
                            ) : null}
                            <div>
                                <label className="block text-white/70 text-xs mb-1">اسم محكمة التحقيق</label>
                                <input
                                    className={INPUT_BASE}
                                    value={draft.location.investigationCourtName}
                                    onChange={(e) => setLocationField('investigationCourtName', e.target.value)}
                                    required
                                    data-testid="criminal-new-case-investigation-court"
                                />
                            </div>

                            <div>
                                <div className={FIELD_LABEL}>
                                    أين مودعة الأوراق التحقيقية حالياً؟
                                </div>
                                <SegmentedChoice
                                    compact
                                    name="investigation_papers_at"
                                    value={draft.location.investigationPapersAt}
                                    options={[
                                        { value: 'مركز شرطة', label: 'مركز شرطة' },
                                        { value: 'مكتب تحقيق قضائي', label: 'مكتب تحقيق قضائي' },
                                    ]}
                                    onChange={(next) => setLocationField('investigationPapersAt', next)}
                                />
                            </div>

                            {draft.location.investigationPapersAt === 'مركز شرطة' ? (
                                <>
                                    <div>
                                        <label className="block text-white/70 text-xs mb-1">اسم مركز الشرطة</label>
                                        <input
                                            className={INPUT_BASE}
                                            value={draft.location.policeStationName}
                                            onChange={(e) => setLocationField('policeStationName', e.target.value)}
                                            data-testid="criminal-new-case-police-station"
                                        />
                                    </div>
                                </>
                            ) : null}

                            {draft.location.investigationPapersAt === 'مكتب تحقيق قضائي' ? (
                                <>
                                    <div>
                                        <label className="block text-white/70 text-xs mb-1">اسم مكتب التحقيق</label>
                                        <input
                                            className={INPUT_BASE}
                                            value={draft.location.investigationOfficeName}
                                            onChange={(e) => setLocationField('investigationOfficeName', e.target.value)}
                                        />
                                    </div>
                                </>
                            ) : null}
                        </>
                    ) : isCassationStage ? null : (
                        <>
                            <div>
                                <label className={FIELD_LABEL}>اسم المحكمة</label>
                                <input
                                    className={INPUT_BASE}
                                    value={draft.location.courtName}
                                    onChange={(e) => {
                                        const next = e.target.value;
                                        setLocationField('courtName', next);
                                        if (isJuvenileCourtNature(next)) {
                                            ensureFirstDefendantJuvenile();
                                        }
                                    }}
                                    placeholder="مثال: محكمة الأحداث (جنح) أو محكمة الجنح"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-white/70 text-xs mb-1">رقم الدعوى</label>
                                    <input
                                        className={INPUT_BASE}
                                        value={draft.location.caseNumber}
                                        onChange={(e) => setLocationField('caseNumber', e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-white/70 text-xs mb-1">رقم الادعاء العام</label>
                                    <input
                                        className={INPUT_BASE}
                                        value={draft.location.publicProsecutionNumber}
                                        onChange={(e) => setLocationField('publicProsecutionNumber', e.target.value)}
                                        placeholder="اختياري"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={FIELD_LABEL}>مادة الإحالة / الاتهام</label>
                                <input
                                    className={INPUT_BASE}
                                    value={draft.basics.legalArticle}
                                    onChange={(e) => setBasicField('legalArticle', e.target.value)}
                                    placeholder="نفس مادة الاتهام — قابلة للتعديل"
                                />
                            </div>
                            <div>
                                <label className="block text-white/70 text-xs mb-1">اسم القاضي</label>
                                <input
                                    className={INPUT_BASE}
                                    value={draft.location.trialJudgeName}
                                    onChange={(e) => setLocationField('trialJudgeName', e.target.value)}
                                    placeholder="اختياري"
                                />
                            </div>
                            <div className="rounded-xl border border-[#E6C673]/28 bg-[#E6C673]/8 p-3">
                                <div className="flex flex-wrap items-end justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-[11px] font-black tracking-wide text-[#E6C673]/95">
                                            موعد المحاكمة
                                        </div>
                                        <p className="mt-1 text-[10px] leading-relaxed text-white/45">
                                            يُسجَّل على بطاقة الأرشيف ويُزامَن مع التقويم
                                        </p>
                                    </div>
                                    <input
                                        type="date"
                                        className={`${INPUT_BASE} max-w-[11.5rem] shrink-0 border-[#E6C673]/35 bg-[#0B1021]/90`}
                                        value={draft.location.nextHearingDate}
                                        onChange={(e) => setLocationField('nextHearingDate', e.target.value)}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            ) : null}

            {isCassationStage ? (
                <div className={CARD_BASE}>
                    <div className="text-white font-bold text-sm mb-3">{CASSATION_CARD_TITLE}</div>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-white/70 text-xs mb-1">{CASSATION_NUMBER_LABEL}</label>
                            <input
                                className={INPUT_BASE}
                                value={draft.location.baseRegisterNumberAndDate}
                                onChange={(e) => setLocationField('baseRegisterNumberAndDate', e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-white/70 text-xs mb-1">{CASSATION_COURT_LABEL}</label>
                            <input
                                className={INPUT_BASE}
                                value={draft.location.investigationCourtName}
                                onChange={(e) => setLocationField('investigationCourtName', e.target.value)}
                                required
                            />
                        </div>
                    </div>
                </div>
            ) : isReferralStage ? (
                <div className={CARD_BASE}>
                    <div className="text-white font-bold text-sm mb-3">{REFERRAL_CARD_TITLE}</div>
                    <div className="space-y-3">
                        <div>
                            <label className={FIELD_LABEL}>مادة الإحالة / الاتهام</label>
                            <input
                                className={INPUT_BASE}
                                value={draft.basics.legalArticle}
                                onChange={(e) => setBasicField('legalArticle', e.target.value)}
                                placeholder="من معلومات الدعوى — قابلة للتعديل"
                            />
                        </div>
                        <div>
                            <label className="block text-white/70 text-xs mb-1">{REFERRAL_NUMBER_LABEL}</label>
                            <input
                                className={INPUT_BASE}
                                value={draft.location.baseRegisterNumberAndDate}
                                onChange={(e) => setLocationField('baseRegisterNumberAndDate', e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-white/70 text-xs mb-1">{REFERRAL_COURT_LABEL}</label>
                            <input
                                className={INPUT_BASE}
                                value={draft.location.investigationCourtName}
                                onChange={(e) => setLocationField('investigationCourtName', e.target.value)}
                                required
                            />
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
