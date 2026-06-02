import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    useCriminalStore,
    resolveOurRepresentationFromCaseRecord,
    type CriminalDefendant,
    type DefendantStatus,
    normalizeGuarantorDetails,
} from './criminalStore';
import {
    formatCriminalStageLabel,
    getDefendantStatusSelectOptions,
    isJuvenileExclusiveStoredStage,
    normalizeDefendantStatusForJuvenileToggle,
    normalizeLegacyCriminalStage,
    isInvestigationStoredStage,
    isStageAllowedForNewCasePartyMix,
    resolveNewCaseStageSelectOptions,
} from './criminalStageUtils';
import {
    resolveInvestigationDefendantsPartyMix,
    JUVENILE_TRIAL_COURT_NAME,
} from './juvenileInvestigationRules';
import {
    defendantsJuvenileMonitorFingerprint,
    resolveInvestigationLocationPatchForPartyMix,
} from './juvenileMixedCaseSplitEngine';
import {
    isInvestigationDraftLocationIncomplete,
} from './investigationDraftValidation';
import {
    draftHasNamedIdentifiedDefendant,
    draftIsAllUnknownDefendants,
    getIdentifiedDefendants,
    getUnknownIdentityDefendants,
    isComplaintRestrictedToInvestigationOnly,
    isDefendantIdentityUnknown,
    newCaseStageLockedToInvestigationForUnknown,
    resolveDefendantFullName,
} from './criminalUnknownDefendant';
import {
    NEW_CASE_ALL_UNKNOWN_INVESTIGATION_ONLY_MESSAGE,
    NEW_CASE_MIXED_UNKNOWN_IDENTIFIED_STAGE_BLOCKED_MESSAGE,
} from './investigationPhaseGuidance';
import { isSeveranceReasonValue, SEVERANCE_REASON_SELECT_OPTIONS } from './caseSeveranceView';
import { ChevronRight, X } from 'lucide-react';

const INPUT_BASE =
    'w-full bg-[#0B1021] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#E6C673]/60 disabled:opacity-50 disabled:cursor-not-allowed';

const CARD_BASE = 'bg-[#11162A] border border-white/5 rounded-2xl p-4';

const FIELD_LABEL = 'block text-white/70 text-xs font-medium mb-1.5 leading-snug';

const DEFENDANT_FACE_NAME_LABEL = 'اسم المشكو منه / المتهم الوجاهي';

const JUVENILE_COURT_PATTERN = /أحداث/;

function defendantNameLabel(stage: string, isJuvenile: boolean, isUnderSeven: boolean): string {
    if (isUnderSeven) return 'اسم الصغير';
    if (isJuvenile) {
        return isInvestigationStoredStage(stage) ? 'اسم المشكو منه - حدث' : 'اسم المتهم - حدث';
    }
    return DEFENDANT_FACE_NAME_LABEL;
}

function defendantStatusLabel(isJuvenile: boolean): string {
    return isJuvenile ? 'حالة الحدث القانونية' : 'حالة المتهم';
}

function complainantNameLabel(isMinorComplainant: boolean): string {
    if (!isMinorComplainant) return 'الاسم الرباعي';
    return 'اسم المجني عليه (الحدث/الصغير)';
}

function defendantRoleJuvenileLabel(stage: string, isJuvenile: boolean, isUnderSeven: boolean): string | null {
    if (isUnderSeven) return 'صغير دون 7 سنوات';
    if (!isJuvenile) return null;
    return isInvestigationStoredStage(stage) ? 'المشكو منه - حدث' : 'المتهم - حدث';
}

function complainantRoleJuvenileLabel(stage: string, isJuvenile: boolean): string | null {
    if (!isJuvenile) return null;
    return isInvestigationStoredStage(stage) ? 'المشتكي - حدث' : 'المجني عليه - حدث';
}

function isJuvenileCourtNature(courtName: string): boolean {
    return JUVENILE_COURT_PATTERN.test(String(courtName ?? '').trim());
}

function requiresDetentionExpiryDate(status: DefendantStatus | ''): boolean {
    return status === 'موقوف';
}

function UnknownDefendantToggle({
    active,
    onClick,
    disabled = false,
    title,
}: {
    active: boolean;
    onClick: () => void;
    disabled?: boolean;
    title?: string;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            title={title}
            onClick={onClick}
            className={`rounded-lg border px-3 py-1.5 text-[11px] font-black transition shrink-0 ${
                disabled
                    ? 'border-white/10 bg-white/5 text-white/35 cursor-not-allowed'
                    : active
                      ? 'border-red-500/45 bg-red-500/15 text-red-100'
                      : 'border-white/15 bg-white/5 text-white/70 hover:border-red-500/35 hover:text-red-100'
            }`}
            aria-pressed={active}
        >
            👤 مجهول
        </button>
    );
}

function OfficeClientToggle({
    active,
    onClick,
    disabled = false,
}: {
    active: boolean;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={`rounded-lg border px-3 py-1.5 text-[11px] font-black transition shrink-0 ${
                disabled
                    ? 'border-white/10 bg-white/5 text-white/35 cursor-not-allowed'
                    : active
                      ? 'border-[#E6C673]/50 bg-[#E6C673]/15 text-[#E6C673]'
                      : 'border-white/15 bg-white/5 text-white/70 hover:border-[#E6C673]/35 hover:text-[#E6C673]'
            }`}
            aria-pressed={active}
        >
            ⚖️ موكل
        </button>
    );
}

export type CriminalNewCaseProps = {
    onCreated: (caseId: string) => void;
    onBack?: () => void;
    onClose?: () => void;
    /** نموذج تعبئة الإضبارة المفرّقة — منفصل عن إنشاء إضبارة جزائية عادية. */
    severanceFormMode?: boolean;
    /** داخل لوحة الإضبارة الأم — تمرير داخلي بدل شاشة كاملة منفصلة. */
    embeddedOverlay?: boolean;
};

export const CriminalNewCase = ({
    onCreated,
    onBack,
    onClose,
    severanceFormMode = false,
    embeddedOverlay = false,
}: CriminalNewCaseProps) => {
    const draft = useCriminalStore((s) => s.draft);
    const setBasicField = useCriminalStore((s) => s.setBasicField);
    const setLocationField = useCriminalStore((s) => s.setLocationField);
    const addComplainant = useCriminalStore((s) => s.addComplainant);
    const deleteComplainant = useCriminalStore((s) => s.deleteComplainant);
    const setComplainantField = useCriminalStore((s) => s.setComplainantField);
    const setDraftMutualComplaint = useCriminalStore((s) => s.setDraftMutualComplaint);
    const setUnknownDefendant = useCriminalStore((s) => s.setUnknownDefendant);
    const addUnknownDefendant = useCriminalStore((s) => s.addUnknownDefendant);
    const toggleDraftDefendantIdentityUnknown = useCriminalStore(
        (s) => s.toggleDraftDefendantIdentityUnknown,
    );
    const addDefendant = useCriminalStore((s) => s.addDefendant);
    const deleteDefendant = useCriminalStore((s) => s.deleteDefendant);
    const setDefendantField = useCriminalStore((s) => s.setDefendantField);
    const setDraftDefendantGuarantor = useCriminalStore((s) => s.setDraftDefendantGuarantor);
    const toggleDraftComplainantOfficeClient = useCriminalStore((s) => s.toggleDraftComplainantOfficeClient);
    const toggleDraftDefendantOfficeClient = useCriminalStore((s) => s.toggleDraftDefendantOfficeClient);
    const createCaseFromDraft = useCriminalStore((s) => s.createCaseFromDraft);
    const resetDraft = useCriminalStore((s) => s.resetDraft);
    // —————— سياق تفريق الدعوى (شطر إضبارة) ——————
    // عند وجود `pendingSeveranceContext` تعمل شاشة الإضبارة الجديدة في وضع «التفريق»:
    // - لا تُمسح المسودّة عند الفتح (المتهمون مُهيَّأون مسبقاً).
    // - يُعرض شريط تنبيه بالأصل (الإضبارة الأم).
    // - زرّ الحفظ يستدعي `commitSeveranceFromDossier` بدلاً من `createCaseFromDraft`،
    //   ما يُنفّذ: إنشاء الجديدة + حذف من الأم + ترحيل العناصر الحصرية.
    const pendingSeveranceContext = useCriminalStore((s) => s.pendingSeveranceContext);
    const commitSeveranceFromDossier = useCriminalStore((s) => s.commitSeveranceFromDossier);
    const stashPendingSeveranceForm = useCriminalStore((s) => s.stashPendingSeveranceForm);
    const resumePendingSeveranceForm = useCriminalStore((s) => s.resumePendingSeveranceForm);
    const setPendingSeveranceReason = useCriminalStore((s) => s.setPendingSeveranceReason);
    const isSeveranceMode = severanceFormMode && Boolean(pendingSeveranceContext);
    const parentCaseRecord = useCriminalStore((s) =>
        pendingSeveranceContext ? s.casesById[pendingSeveranceContext.parentCaseId] : undefined,
    );
    const stage = draft.basics.stage;
    const ourRepresentation = draft.basics.ourRepresentation;
    const isReferralStage = stage !== '' && !isInvestigationStoredStage(stage);
    const isCassationStage = stage === 'cassation_court';
    const isJuvenileInvestigationStage = stage === 'تحقيق الأحداث';

    const showUnknownDefendantOption = useMemo(() => {
        if (ourRepresentation === 'defendant_side') return false;
        if (ourRepresentation === 'complainant_side') return true;
        if (isSeveranceMode && parentCaseRecord) {
            return resolveOurRepresentationFromCaseRecord(parentCaseRecord) === 'complainant_side';
        }
        // إضبارة جديدة عادية: المجهول متاح افتراضياً (لا يُربط بمسار التفريق).
        // يُخفى فقط عندما يُعلَم أن المكتب يمثّل المتهم (⚖️ موكل على المتهم).
        return true;
    }, [ourRepresentation, isSeveranceMode, parentCaseRecord]);

    useEffect(() => {
        const current = draft.basics.stage;
        const normalized = normalizeLegacyCriminalStage(String(current), draft.basics.crimeType);
        if (normalized && normalized !== current) {
            setBasicField('stage', normalized);
        }
    }, [draft.basics.crimeType, draft.basics.stage, setBasicField]);

    // استئناف/حفظ مسودّة التفريق فقط — لا تُصفّر المسودّة عند إعادة تركيب النموذج.
    // التصفير يتم عند فتح المودال (openNormalNewCaseModal) أو اختيار «جزائي» في LawyerNewCase.
    useEffect(() => {
        if (!severanceFormMode) return;
        resumePendingSeveranceForm();
        return () => {
            stashPendingSeveranceForm();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [severanceFormMode]);

    useEffect(() => {
        if (showUnknownDefendantOption) return;
        if (draft.unknownDefendant || draft.defendants.some((d) => isDefendantIdentityUnknown(d))) {
            setUnknownDefendant(false);
        }
    }, [showUnknownDefendantOption, draft.unknownDefendant, draft.defendants, setUnknownDefendant]);

    const ensureFirstDefendantJuvenile = useCallback(() => {
        const identified = getIdentifiedDefendants(draft.defendants);
        const first = identified[0];
        if (!first?.id || first.isJuvenile) return;
        setDefendantField(first.id, 'isJuvenile', true);
    }, [draft.defendants, setDefendantField]);

    useEffect(() => {
        if (!isReferralStage && !isCassationStage) return;
        if (!isJuvenileCourtNature(draft.location.courtName)) return;
        ensureFirstDefendantJuvenile();
    }, [draft.location.courtName, isReferralStage, isCassationStage, ensureFirstDefendantJuvenile]);

    const prevStageRef = useRef(stage);
    useEffect(() => {
        if (stage === 'cassation_court' && prevStageRef.current !== 'cassation_court') {
            setLocationField('courtName', '');
            setLocationField('caseNumber', '');
        }
        prevStageRef.current = stage;
    }, [stage, setLocationField]);

    const isTrialOrCassation =
        stage === 'محكمة الجنح' ||
        stage === 'محكمة الجنايات' ||
        stage === 'محكمة الأحداث' ||
        stage === 'cassation_court';

    const investigationPartyMix = useMemo(
        () => resolveInvestigationDefendantsPartyMix(draft.defendants),
        [draft.defendants],
    );

    const defendantsJuvenileFingerprint = useMemo(
        () => defendantsJuvenileMonitorFingerprint(draft.defendants),
        [draft.defendants],
    );

    const newCaseStageOptions = useMemo(() => {
        const base = resolveNewCaseStageSelectOptions(investigationPartyMix);
        if (!newCaseStageLockedToInvestigationForUnknown(draft.defendants)) {
            return base;
        }
        return base.filter((opt) => isInvestigationStoredStage(opt.value));
    }, [investigationPartyMix, draft.defendants]);

    useEffect(() => {
        if (!isInvestigationStoredStage(stage)) return;
        const patch = resolveInvestigationLocationPatchForPartyMix(investigationPartyMix);
        if (!patch) return;
        if (
            patch.investigationCourtName &&
            String(draft.location.investigationCourtName ?? '').trim() !== patch.investigationCourtName
        ) {
            setLocationField('investigationCourtName', patch.investigationCourtName);
        }
        if (
            patch.investigationPapersAt &&
            draft.location.investigationPapersAt !== patch.investigationPapersAt
        ) {
            setLocationField('investigationPapersAt', patch.investigationPapersAt);
        }
    }, [
        stage,
        investigationPartyMix,
        defendantsJuvenileFingerprint,
        draft.location.investigationCourtName,
        draft.location.investigationPapersAt,
        setLocationField,
    ]);

    useEffect(() => {
        if (investigationPartyMix !== 'juveniles_only' || stage !== 'محكمة الأحداث') return;
        const court = String(draft.location.courtName ?? '').trim();
        if (court !== JUVENILE_TRIAL_COURT_NAME) {
            setLocationField('courtName', JUVENILE_TRIAL_COURT_NAME);
        }
    }, [
        investigationPartyMix,
        stage,
        draft.location.courtName,
        setLocationField,
    ]);

    const complainantCardTitle = useMemo(() => {
        if (isInvestigationStoredStage(stage)) return 'بيانات مشتكي / مدعي بالحق الشخصي';
        if (isTrialOrCassation) return 'بيانات المجني عليه';
        return 'بيانات المشتكي / المجني عليه';
    }, [isTrialOrCassation, stage]);

    const defendantCardTitle = useMemo(() => {
        if (ourRepresentation === 'defendant_side') {
            return isTrialOrCassation ? 'بيانات موكلنا (المتهم)' : 'بيانات موكلنا (المشكو منه)';
        }
        if (isInvestigationStoredStage(stage)) return 'بيانات المشكو منه';
        if (isTrialOrCassation) return 'بيانات المتهم / الحَدَث';
        return 'بيانات المشكو منه / المتهم';
    }, [isTrialOrCassation, ourRepresentation, stage]);

    const referralCardTitle = 'بيانات الإحالة';
    const referralNumberLabel = 'رقم وتاريخ قرار الإحالة';
    const referralCourtLabel = 'اسم محكمة التحقيق المحيلة';

    const cassationCardTitle = 'بيانات القرار المُميز';
    const cassationNumberLabel = 'رقم وتاريخ القرار المُميز';
    const cassationCourtLabel = 'المحكمة التي أصدرت القرار';

    const isTrialCourtStage =
        stage === 'محكمة الجنح' || stage === 'محكمة الجنايات' || stage === 'محكمة الأحداث';

    const unknownDefendants = useMemo(
        () => getUnknownIdentityDefendants(draft.defendants),
        [draft.defendants],
    );

    const identifiedDefendantsForForm = useMemo(
        () => draft.defendants.filter((d) => !isDefendantIdentityUnknown(d)),
        [draft.defendants],
    );

    /** صف المتهم الأول في الإضبارة — زر «مجهول» يخصّه وحده (المجهولون الإضافيون عبر الزر السفلي). */
    const primaryDefendantSlotId = useMemo(
        () => String(draft.defendants[0]?.id ?? '').trim(),
        [draft.defendants],
    );

    const locksStageToInvestigation = useMemo(
        () => newCaseStageLockedToInvestigationForUnknown(draft.defendants),
        [draft.defendants],
    );

    const allDefendantsUnknownOnly = useMemo(
        () => isComplaintRestrictedToInvestigationOnly(draft.defendants),
        [draft.defendants],
    );

    const mixedUnknownWithIdentified = useMemo(
        () => locksStageToInvestigation && !allDefendantsUnknownOnly,
        [locksStageToInvestigation, allDefendantsUnknownOnly],
    );

    const hasNamedIdentifiedDefendant = useMemo(
        () => draftHasNamedIdentifiedDefendant(draft.defendants),
        [draft.defendants],
    );

    const allDefendantsAreUnknown = useMemo(
        () => draftIsAllUnknownDefendants(draft.defendants),
        [draft.defendants],
    );

    useEffect(() => {
        if (isSeveranceMode) return;
        if (locksStageToInvestigation) {
            if (stage && !isInvestigationStoredStage(stage)) {
                if (typeof globalThis.alert === 'function') {
                    globalThis.alert(
                        allDefendantsUnknownOnly
                            ? NEW_CASE_ALL_UNKNOWN_INVESTIGATION_ONLY_MESSAGE
                            : NEW_CASE_MIXED_UNKNOWN_IDENTIFIED_STAGE_BLOCKED_MESSAGE,
                    );
                }
                setBasicField(
                    'stage',
                    investigationPartyMix === 'juveniles_only' ? 'تحقيق الأحداث' : 'مرحلة التحقيق',
                );
            }
            return;
        }
        if (!isStageAllowedForNewCasePartyMix(stage, investigationPartyMix)) {
            setBasicField('stage', '');
        }
    }, [
        investigationPartyMix,
        defendantsJuvenileFingerprint,
        stage,
        locksStageToInvestigation,
        allDefendantsUnknownOnly,
        setBasicField,
        isSeveranceMode,
    ]);

    const investigationLocationIncomplete = isInvestigationDraftLocationIncomplete(
        stage,
        draft.location,
    );
    const complainantGuardianDataIncomplete = draft.complainants.some((c) => {
        const isMinor = Boolean((c as any).isJuvenile) || Boolean((c as any).isUnderSeven);
        if (!isMinor) return false;
        return (
            !String((c as any).guardianName ?? '').trim() ||
            !String((c as any).guardianRelationship ?? '').trim()
        );
    });

    const identifiedDefendantSaveIncomplete =
        !allDefendantsAreUnknown &&
        (!hasNamedIdentifiedDefendant ||
            identifiedDefendantsForForm.some((d) => !String(d.fullName ?? '').trim()));

    const isSaveBlocked =
        !ourRepresentation ||
        stage === '' ||
        draft.complainants.some((c) => !String(c.fullName ?? '').trim()) ||
        identifiedDefendantSaveIncomplete ||
        investigationLocationIncomplete ||
        complainantGuardianDataIncomplete ||
        (isSeveranceMode &&
            pendingSeveranceContext?.severanceReason === 'other' &&
            !String(pendingSeveranceContext?.severanceReasonDetail ?? '').trim()) ||
        (isReferralStage &&
            (!draft.basics.legalArticle.trim() ||
                !draft.location.baseRegisterNumberAndDate.trim() ||
                !draft.location.investigationCourtName.trim() ||
                (isTrialCourtStage &&
                    (!draft.location.courtName.trim() || !draft.location.caseNumber.trim()))));

    const handleExitSeveranceForm = () => {
        if (isSeveranceMode) stashPendingSeveranceForm();
    };

    const pendingSeveranceReason = pendingSeveranceContext?.severanceReason;
    const pendingSeveranceReasonDetail = pendingSeveranceContext?.severanceReasonDetail ?? '';
    const severanceLockedStage = pendingSeveranceContext?.lockedCaseStage ?? '';

    useEffect(() => {
        if (!isSeveranceMode || !severanceLockedStage) return;
        if (draft.basics.stage !== severanceLockedStage) {
            setBasicField('stage', severanceLockedStage);
        }
    }, [isSeveranceMode, severanceLockedStage, draft.basics.stage, setBasicField]);

    return (
        <div
            className={
                embeddedOverlay
                    ? 'h-full min-h-0 flex flex-col'
                    : 'min-h-screen flex flex-col'
            }
        >
            <div className="sticky top-0 z-50 h-14 bg-[#1A1E2E] border-b border-white/5 flex items-center justify-between px-4 shrink-0">
                <button
                    type="button"
                    onClick={() => {
                        handleExitSeveranceForm();
                        onClose?.();
                    }}
                    className="p-2 hover:bg-white/5 rounded-full text-white/60 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="text-center leading-tight">
                    <div className="text-white font-black text-[13px]">
                        {isSeveranceMode ? 'إنشاء إضبارة مفرّقة (شطر)' : 'إضبارة الدعوى الجزائية'}
                    </div>
                    <div className="text-white/60 font-bold text-[11px] mt-0.5">
                        {isSeveranceMode ? 'مسار التفريق — تعبئة بيانات الإضبارة الجديدة' : 'المحاكم الجنائية'}
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => {
                            handleExitSeveranceForm();
                            onBack?.();
                        }}
                        disabled={!onBack}
                        className="p-2 hover:bg-white/5 rounded-full text-white/60 hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/60"
                    >
                        <ChevronRight size={20} className="rotate-180" />
                    </button>
                </div>
            </div>

            {isSeveranceMode ? (
                <div className="px-4 pt-3" dir="rtl">
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 space-y-2.5">
                        <label className={FIELD_LABEL}>سبب التفريق (اختياري)</label>
                        <select
                            className={INPUT_BASE}
                            value={pendingSeveranceReason ?? ''}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (isSeveranceReasonValue(v)) {
                                    setPendingSeveranceReason(
                                        v,
                                        v === 'other' ? pendingSeveranceReasonDetail : undefined,
                                    );
                                    return;
                                }
                                setPendingSeveranceReason(undefined, undefined);
                            }}
                        >
                            <option value="" className="bg-[#0B1021] text-white">
                                اختر سبب التفريق...
                            </option>
                            {SEVERANCE_REASON_SELECT_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-[#0B1021] text-white">
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        {pendingSeveranceReason === 'other' ? (
                            <div>
                                <label className={FIELD_LABEL}>يرجى كتابة سبب التفريق</label>
                                <input
                                    className={INPUT_BASE}
                                    value={pendingSeveranceReasonDetail}
                                    onChange={(e) =>
                                        setPendingSeveranceReason('other', e.target.value)
                                    }
                                    placeholder="اكتب سبب التفريق..."
                                    required
                                />
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <div
                className={
                    embeddedOverlay
                        ? 'flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-4 pb-6 pt-4 space-y-4'
                        : 'px-4 pb-32 pt-4 space-y-4 flex-1'
                }
            >
            <div className={CARD_BASE}>
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 shrink-0 accent-[#E6C673]"
                            checked={draft.isMutualComplaint === true}
                            onChange={(e) => setDraftMutualComplaint(e.target.checked)}
                        />
                        <span className="min-w-0 text-white font-black text-sm whitespace-normal break-words">
                            ⚖️ الدعوى ناشئة عن شكوى متقابلة
                        </span>
                    </label>
                </div>
            </div>

            <div className={CARD_BASE}>
                <div className="text-white font-bold text-sm mb-3">{complainantCardTitle}</div>
                <div className="space-y-4">
                    {draft.complainants.map((c) => (
                        (() => {
                            const complainantMinor =
                                Boolean((c as any).isJuvenile) || Boolean((c as any).isUnderSeven);
                            return (
                        <div
                            key={c.id}
                            className={`space-y-3 rounded-2xl border p-3 ${
                                c.isOfficeClient
                                    ? 'border-[#E6C673]/35 bg-[#E6C673]/[0.04]'
                                    : 'border-white/10 bg-white/[0.02]'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <OfficeClientToggle
                                    active={Boolean(c.isOfficeClient)}
                                    onClick={() =>
                                        toggleDraftComplainantOfficeClient(c.id, !c.isOfficeClient)
                                    }
                                />
                                {complainantRoleJuvenileLabel(
                                    stage,
                                    Boolean((c as any).isJuvenile) || Boolean((c as any).isUnderSeven),
                                ) ? (
                                    <div className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-black text-emerald-100 whitespace-nowrap">
                                        {Boolean((c as any).isUnderSeven)
                                            ? isInvestigationStoredStage(stage)
                                                ? 'المشتكي - صغير'
                                                : 'المجني عليه - صغير'
                                            : complainantRoleJuvenileLabel(stage, Boolean((c as any).isJuvenile))}
                                    </div>
                                ) : null}
                                {draft.complainants.length > 1 ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const ok =
                                                typeof globalThis.confirm === 'function'
                                                    ? globalThis.confirm(
                                                          complainantMinor
                                                              ? 'هل أنت متأكد من حذف هذا المجني عليه الحدث/الصغير؟'
                                                              : 'هل أنت متأكد من حذف هذا المشتكي؟',
                                                      )
                                                    : false;
                                            if (!ok) return;
                                            deleteComplainant(c.id);
                                        }}
                                        className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1 text-[12px] font-black text-red-200/80 hover:text-red-200 hover:bg-red-500/15 transition"
                                    >
                                        🗑️ حذف
                                    </button>
                                ) : null}
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                <div className="flex flex-wrap items-center gap-6">
                                    <div className="flex items-center gap-3">
                                        <div className="text-white/80 text-sm font-bold whitespace-nowrap">
                                            👶 هذا الشخص حَدَث (قاصر لم يتم 18 سنة)
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const next = !Boolean((c as any).isJuvenile);
                                                setComplainantField(c.id, 'isJuvenile', next as any);
                                                if (!next) {
                                                    setComplainantField(c.id, 'guardianName', '' as any);
                                                    setComplainantField(c.id, 'guardianRelationship', '' as any);
                                                    setComplainantField(c.id, 'birthDate', '' as any);
                                                }
                                            }}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                                                Boolean((c as any).isJuvenile)
                                                    ? 'border-emerald-500/40 bg-emerald-500/20'
                                                    : 'border-slate-600/60 bg-slate-800/60'
                                            }`}
                                            aria-pressed={Boolean((c as any).isJuvenile)}
                                        >
                                            <span
                                                className={`inline-block h-5 w-5 transform rounded-full bg-white/90 transition ${
                                                    Boolean((c as any).isJuvenile) ? 'translate-x-5' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-white/80 text-sm font-bold whitespace-nowrap">
                                            🧒 دون الـ 7 سنوات
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setComplainantField(
                                                    c.id,
                                                    'isUnderSeven',
                                                    !Boolean((c as any).isUnderSeven),
                                                )
                                            }
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                                                Boolean((c as any).isUnderSeven)
                                                    ? 'border-emerald-500/40 bg-emerald-500/20'
                                                    : 'border-slate-600/60 bg-slate-800/60'
                                            }`}
                                            aria-pressed={Boolean((c as any).isUnderSeven)}
                                        >
                                            <span
                                                className={`inline-block h-5 w-5 transform rounded-full bg-white/90 transition ${
                                                    Boolean((c as any).isUnderSeven) ? 'translate-x-5' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                                {complainantMinor ? (
                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-white/70 text-xs mb-1">
                                                اسم ولي الأمر أو الوصي القانوني (مقدم الشكوى)
                                            </label>
                                            <input
                                                className={INPUT_BASE}
                                                value={String((c as any).guardianName ?? '')}
                                                required
                                                onChange={(e) =>
                                                    setComplainantField(c.id, 'guardianName', e.target.value as any)
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-white/70 text-xs mb-1">صلة قرابة الوصي</label>
                                            <input
                                                className={INPUT_BASE}
                                                value={String((c as any).guardianRelationship ?? '')}
                                                required
                                                onChange={(e) =>
                                                    setComplainantField(c.id, 'guardianRelationship', e.target.value as any)
                                                }
                                                placeholder="أب / أم / عم ..."
                                            />
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                            <div>
                                <label className="block text-white/70 text-xs mb-1">
                                    {complainantNameLabel(complainantMinor)}
                                </label>
                                <input
                                    className={INPUT_BASE}
                                    value={c.fullName}
                                    onChange={(e) => setComplainantField(c.id, 'fullName', e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-white/70 text-xs mb-1">العنوان</label>
                                <input
                                    className={INPUT_BASE}
                                    value={c.address}
                                    onChange={(e) => setComplainantField(c.id, 'address', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-white/70 text-xs mb-1">رقم الهاتف</label>
                                <input
                                    className={INPUT_BASE}
                                    value={c.phone}
                                    onChange={(e) => setComplainantField(c.id, 'phone', e.target.value)}
                                    inputMode="tel"
                                />
                            </div>
                            <div className="h-px bg-white/5" />
                        </div>
                            );
                        })()
                    ))}

                    <button
                        type="button"
                        className="w-full rounded-xl border border-white/10 bg-white/5 text-white text-sm font-bold py-3 hover:bg-white/10 hover:border-[#E6C673]/40 transition-colors"
                        onClick={addComplainant}
                    >
                        + إضافة مشتكي آخر
                    </button>
                </div>
            </div>

            <div className={CARD_BASE}>
                <div className="text-white font-bold text-sm mb-3">{defendantCardTitle}</div>
                {stage && investigationPartyMix === 'juveniles_only' ? (
                    <div className="mb-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[12px] font-black text-emerald-100/90">
                        👶 مسار الحدث: {formatCriminalStageLabel(stage, false)}
                    </div>
                ) : null}
                <div className="space-y-3">
                    {identifiedDefendantsForForm.map((d) => {
                                const isUnderSeven = Boolean((d as any).isUnderSeven);
                                const showDetentionExpiryDate = !isUnderSeven && requiresDetentionExpiryDate(d.status);
                                const isPrimaryDefendantSlot = d.id === primaryDefendantSlotId;
                                return (
                                    <div
                                        key={d.id}
                                        className={`space-y-3 rounded-2xl border p-3 ${
                                            d.isOfficeClient
                                                ? 'border-[#E6C673]/35 bg-[#E6C673]/[0.04]'
                                                : 'border-white/10 bg-white/5'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <OfficeClientToggle
                                                    active={Boolean(d.isOfficeClient)}
                                                    onClick={() =>
                                                        toggleDraftDefendantOfficeClient(d.id, !d.isOfficeClient)
                                                    }
                                                />
                                                {showUnknownDefendantOption &&
                                                isPrimaryDefendantSlot &&
                                                unknownDefendants.length === 0 ? (
                                                    <UnknownDefendantToggle
                                                        active={false}
                                                        title="تفعيل: تحويل هذا المتهم إلى مجهول"
                                                        onClick={() =>
                                                            toggleDraftDefendantIdentityUnknown(d.id, true)
                                                        }
                                                    />
                                                ) : null}
                                            </div>
                                            {defendantRoleJuvenileLabel(stage, Boolean(d.isJuvenile), isUnderSeven) ? (
                                                <div className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-black text-emerald-100 whitespace-nowrap">
                                                    {defendantRoleJuvenileLabel(stage, Boolean(d.isJuvenile), isUnderSeven)}
                                                </div>
                                            ) : null}
                                            {identifiedDefendantsForForm.length > 1 ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const ok =
                                                            typeof globalThis.confirm === 'function'
                                                                ? globalThis.confirm(
                                                                      isUnderSeven
                                                                          ? 'هل أنت متأكد من حذف هذا الصغير؟'
                                                                          : 'هل أنت متأكد من حذف هذا المتهم؟',
                                                                  )
                                                                : false;
                                                        if (!ok) return;
                                                        deleteDefendant(d.id);
                                                    }}
                                                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1 text-[12px] font-black text-red-200/80 hover:text-red-200 hover:bg-red-500/15 transition"
                                                >
                                                    🗑️ حذف
                                                </button>
                                            ) : null}
                                        </div>
                                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                            <div className="flex flex-wrap items-center gap-6">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="text-white/80 text-sm font-bold whitespace-nowrap">
                                                        👶 هذا الشخص حَدَث (قاصر لم يتم 18 سنة)
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const next = !Boolean(d.isJuvenile);
                                                            setDefendantField(d.id, 'isJuvenile', next);
                                                            const nextStatus = normalizeDefendantStatusForJuvenileToggle(
                                                                d.status,
                                                                next,
                                                            );
                                                            if (nextStatus !== d.status) {
                                                                setDefendantField(d.id, 'status', nextStatus);
                                                            }
                                                            if (!next) {
                                                                setDefendantField(d.id, 'guardianName', '');
                                                                setDefendantField(d.id, 'guardianRelationship', '');
                                                                setDefendantField(d.id, 'birthDate', '');
                                                            }
                                                        }}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                                                            Boolean(d.isJuvenile)
                                                                ? 'border-emerald-500/40 bg-emerald-500/20'
                                                                : 'border-slate-600/60 bg-slate-800/60'
                                                        }`}
                                                        aria-pressed={Boolean(d.isJuvenile)}
                                                    >
                                                        <span
                                                            className={`inline-block h-5 w-5 transform rounded-full bg-white/90 transition ${
                                                                Boolean(d.isJuvenile) ? 'translate-x-5' : 'translate-x-1'
                                                            }`}
                                                        />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="text-white/80 text-sm font-bold whitespace-nowrap">
                                                        🧒 دون الـ 7 سنوات
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const nextUnderSeven = !Boolean((d as any).isUnderSeven);
                                                            setDefendantField(d.id, 'isUnderSeven', nextUnderSeven);
                                                            if (nextUnderSeven) {
                                                                // أقل من 7 سنوات: لا مسؤولية جزائية ولا توقيف/إيداع.
                                                                setDefendantField(d.id, 'isJuvenile', true);
                                                                setDefendantField(d.id, 'status', '');
                                                                setDefendantField(d.id, 'detentionAuthority', '');
                                                                setDefendantField(d.id, 'detentionExpiryDate', '');
                                                                setDraftDefendantGuarantor(d.id, null);
                                                            }
                                                        }}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                                                            Boolean((d as any).isUnderSeven)
                                                                ? 'border-emerald-500/40 bg-emerald-500/20'
                                                                : 'border-slate-600/60 bg-slate-800/60'
                                                        }`}
                                                        aria-pressed={Boolean((d as any).isUnderSeven)}
                                                    >
                                                        <span
                                                            className={`inline-block h-5 w-5 transform rounded-full bg-white/90 transition ${
                                                                Boolean((d as any).isUnderSeven)
                                                                    ? 'translate-x-5'
                                                                    : 'translate-x-1'
                                                            }`}
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                            {isUnderSeven ? (
                                                <div className="mt-2 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-200/95 leading-relaxed">
                                                    تنبيه: انعدام المسؤولية الجزائية لعدم إكمال السن القانوني م/47 رعاية أحداث
                                                </div>
                                            ) : null}
                                            {(Boolean(d.isJuvenile) || isUnderSeven) ? (
                                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div className="sm:col-span-2">
                                                        <label className="block text-white/70 text-xs mb-1">
                                                            اسم ولي الأمر أو الوصي القانوني
                                                        </label>
                                                        <input
                                                            className={INPUT_BASE}
                                                            value={String((d as any).guardianName ?? '')}
                                                            onChange={(e) =>
                                                                setDefendantField(d.id, 'guardianName', e.target.value as any)
                                                            }
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                        <label className="block text-white/70 text-xs mb-1">
                                                            صلة قرابة الوصي
                                                        </label>
                                                        <input
                                                            className={INPUT_BASE}
                                                            value={String((d as any).guardianRelationship ?? '')}
                                                            onChange={(e) =>
                                                                setDefendantField(
                                                                    d.id,
                                                                    'guardianRelationship',
                                                                    e.target.value as any,
                                                                )
                                                            }
                                                            placeholder="أب / أم / عم ..."
                                                        />
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                        <div>
                                            <label className={FIELD_LABEL}>
                                                {defendantNameLabel(stage, Boolean(d.isJuvenile), isUnderSeven)}
                                            </label>
                                            <input
                                                className={INPUT_BASE}
                                                value={d.fullName}
                                                onChange={(e) => setDefendantField(d.id, 'fullName', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className={FIELD_LABEL}>العنوان</label>
                                            <input
                                                className={INPUT_BASE}
                                                value={String((d as any).address ?? '')}
                                                onChange={(e) => setDefendantField(d.id, 'address', e.target.value)}
                                            />
                                        </div>

                                        {!isUnderSeven ? (
                                            <div>
                                                <label className={FIELD_LABEL}>{defendantStatusLabel(Boolean(d.isJuvenile))}</label>
                                                <select
                                                    className={INPUT_BASE}
                                                    value={d.status}
                                                    onChange={(e) => {
                                                        const nextStatus = e.target.value as DefendantStatus | '';
                                                        setDefendantField(d.id, 'status', nextStatus);
                                                        if (nextStatus === 'مكفل') {
                                                            setDraftDefendantGuarantor(d.id, {
                                                                bailAmount:
                                                                    normalizeGuarantorDetails(d.guarantorDetails)
                                                                        ?.bailAmount ?? '',
                                                                guarantorInfo:
                                                                    normalizeGuarantorDetails(d.guarantorDetails)
                                                                        ?.guarantorInfo ?? '',
                                                            });
                                                        } else {
                                                            setDraftDefendantGuarantor(d.id, null);
                                                        }
                                                    }}
                                                >
                                                    <option value="" className="bg-[#0B1021] text-white">
                                                        اختر...
                                                    </option>
                                                    {getDefendantStatusSelectOptions({
                                                        isJuvenile: Boolean(d.isJuvenile),
                                                        crimeType: draft.basics.crimeType,
                                                        stage: draft.basics.stage,
                                                        currentStatus: d.status,
                                                    }).map((opt) => (
                                                        <option key={opt.value} value={opt.value} className="bg-[#0B1021] text-white">
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : null}

                                        {!isUnderSeven && d.status === 'مكفل' ? (
                                            <div className="space-y-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
                                                <div>
                                                    <label className={FIELD_LABEL}>مقدار الكفالة المالية</label>
                                                    <input
                                                        className={INPUT_BASE}
                                                        value={
                                                            normalizeGuarantorDetails(d.guarantorDetails)?.bailAmount ?? ''
                                                        }
                                                        onChange={(e) =>
                                                            setDraftDefendantGuarantor(d.id, { bailAmount: e.target.value })
                                                        }
                                                        placeholder="مثال: 5,000,000 دينار"
                                                    />
                                                </div>
                                                <div>
                                                    <label className={FIELD_LABEL}>
                                                        معلومات الكفيل الضامن (كفالة أشخاص)
                                                    </label>
                                                    <textarea
                                                        className={`${INPUT_BASE} min-h-[88px]`}
                                                        value={
                                                            normalizeGuarantorDetails(d.guarantorDetails)?.guarantorInfo ??
                                                            ''
                                                        }
                                                        onChange={(e) =>
                                                            setDraftDefendantGuarantor(d.id, {
                                                                guarantorInfo: e.target.value,
                                                            })
                                                        }
                                                        placeholder='مثال: "الموظف فلان الفلاني - مديرية تربية القادسية"'
                                                    />
                                                </div>
                                            </div>
                                        ) : null}

                                        {showDetentionExpiryDate ? (
                                            <div>
                                                <label className="block text-white/70 text-xs mb-1">
                                                    تاريخ انتهاء التوقيف / موعد التمديد القادم
                                                </label>
                                                <input
                                                    type="date"
                                                    className={INPUT_BASE}
                                                    value={d.detentionExpiryDate}
                                                    onChange={(e) =>
                                                        setDefendantField(d.id, 'detentionExpiryDate', e.target.value)
                                                    }
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}

                    {showUnknownDefendantOption && unknownDefendants.length > 0 ? (
                        <div className="space-y-2">
                            {unknownDefendants.map((d) => (
                                    <div
                                        key={d.id}
                                        className="flex items-center justify-between gap-2 rounded-xl border border-red-500/25 bg-red-900/15 px-3 py-2.5"
                                    >
                                        <span className="text-red-100 font-bold text-sm whitespace-normal break-words">
                                            {resolveDefendantFullName(d) || d.fullName}
                                        </span>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {showUnknownDefendantOption && d.id === primaryDefendantSlotId ? (
                                                <UnknownDefendantToggle
                                                    active
                                                    title="إلغاء: إعادة هذا المتهم إلى معلوم"
                                                    onClick={() =>
                                                        toggleDraftDefendantIdentityUnknown(d.id, false)
                                                    }
                                                />
                                            ) : null}
                                            {unknownDefendants.length > 1 || identifiedDefendantsForForm.length > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const ok =
                                                        typeof globalThis.confirm === 'function'
                                                            ? globalThis.confirm('حذف هذا المجهول من الإضبارة؟')
                                                            : false;
                                                    if (!ok) return;
                                                    deleteDefendant(d.id);
                                                }}
                                                className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-black text-red-200 hover:bg-red-500/20"
                                            >
                                                حذف
                                            </button>
                                        ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                            type="button"
                            className="w-full rounded-xl border border-white/10 bg-white/5 text-white text-sm font-bold py-3 hover:bg-white/10 hover:border-[#E6C673]/40 transition-colors"
                            onClick={addDefendant}
                        >
                            + إضافة مشكو منه / متهم آخر
                        </button>
                        {showUnknownDefendantOption ? (
                            <button
                                type="button"
                                title={
                                    unknownDefendants.length > 0
                                        ? 'إضافة متهم مجهول آخر'
                                        : 'إضافة متهم مجهول'
                                }
                                className="w-full rounded-xl border border-red-500/20 bg-red-500/10 text-red-100 text-sm font-bold py-3 hover:bg-red-500/15 hover:border-red-500/35 transition-colors"
                                onClick={addUnknownDefendant}
                            >
                                {unknownDefendants.length > 0
                                    ? '+ إضافة متهم مجهول آخر'
                                    : '+ إضافة متهم مجهول'}
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>

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
                                />
                            </div>

                            <div>
                                <div className="text-white/80 text-sm font-bold mb-2">
                                    أين مودعة الأوراق التحقيقية حالياً؟
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-white/80 text-sm">
                                        <input
                                            type="radio"
                                            name="investigation_papers_at"
                                            className="h-4 w-4 accent-[#E6C673]"
                                            checked={draft.location.investigationPapersAt === 'مركز شرطة'}
                                            onChange={() => setLocationField('investigationPapersAt', 'مركز شرطة')}
                                        />
                                        مركز شرطة
                                    </label>
                                    <label className="flex items-center gap-2 text-white/80 text-sm">
                                        <input
                                            type="radio"
                                            name="investigation_papers_at"
                                            className="h-4 w-4 accent-[#E6C673]"
                                            checked={draft.location.investigationPapersAt === 'مكتب تحقيق قضائي'}
                                            onChange={() => setLocationField('investigationPapersAt', 'مكتب تحقيق قضائي')}
                                        />
                                        مكتب تحقيق قضائي
                                    </label>
                                </div>
                            </div>

                            {draft.location.investigationPapersAt === 'مركز شرطة' ? (
                                <>
                                    <div>
                                        <label className="block text-white/70 text-xs mb-1">اسم مركز الشرطة</label>
                                        <input
                                            className={INPUT_BASE}
                                            value={draft.location.policeStationName}
                                            onChange={(e) => setLocationField('policeStationName', e.target.value)}
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
                            <div>
                                <label className="block text-white/70 text-xs mb-1">موعد المرافعة</label>
                                <input
                                    type="date"
                                    className={INPUT_BASE}
                                    value={draft.location.nextHearingDate}
                                    onChange={(e) => setLocationField('nextHearingDate', e.target.value)}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
            ) : null}

            {isCassationStage ? (
                <div className={CARD_BASE}>
                    <div className="text-white font-bold text-sm mb-3">{cassationCardTitle}</div>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-white/70 text-xs mb-1">{cassationNumberLabel}</label>
                            <input
                                className={INPUT_BASE}
                                value={draft.location.baseRegisterNumberAndDate}
                                onChange={(e) => setLocationField('baseRegisterNumberAndDate', e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-white/70 text-xs mb-1">{cassationCourtLabel}</label>
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
                    <div className="text-white font-bold text-sm mb-3">{referralCardTitle}</div>
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
                            <label className="block text-white/70 text-xs mb-1">{referralNumberLabel}</label>
                            <input
                                className={INPUT_BASE}
                                value={draft.location.baseRegisterNumberAndDate}
                                onChange={(e) => setLocationField('baseRegisterNumberAndDate', e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-white/70 text-xs mb-1">{referralCourtLabel}</label>
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

            </div>

            <div
                className={
                    embeddedOverlay
                        ? 'shrink-0 p-4 bg-[#0F172A] border-t border-white/5'
                        : 'fixed bottom-0 left-0 right-0 p-4 bg-[#0F172A] border-t border-white/5'
                }
            >
                <button
                    type="button"
                    disabled={isSaveBlocked}
                    className="w-full rounded-2xl bg-[#E6C673] text-[#0B1021] font-black py-4 text-base hover:brightness-110 active:brightness-95 transition disabled:opacity-40 disabled:hover:brightness-100 disabled:active:brightness-100"
                    onClick={() => {
                        if (isSaveBlocked) return;
                        if (isSeveranceMode) {
                            // ينشئ + يحذف من الأم + يُرحّل العناصر الحصرية. يُصفّر السياق ذاتياً.
                            const severedId = commitSeveranceFromDossier();
                            if (!severedId) return;
                            resetDraft();
                            onCreated(severedId);
                            return;
                        }
                        const caseId = createCaseFromDraft();
                        resetDraft();
                        onCreated(caseId);
                    }}
                >
                    {isSeveranceMode ? 'تنفيذ التفريق وإنشاء الإضبارة' : 'حفظ وإنشاء الإضبارة'}
                </button>
            </div>
        </div>
    );
};
