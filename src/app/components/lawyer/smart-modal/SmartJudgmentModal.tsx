import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    isNonMeritTerminationType,
    isFirstInstanceStageName,
    isCassationStageName,
    isAppealStageName,
    resolveLawyerSide,
    resolveFirstInstanceHadoriAppealRights,
    isSubjectMatterJudgmentType,
    type JudgmentPayload,
} from './smartFile/judgmentTypes';
import { formatJudgmentOutcomeDisplayLabel } from './smartFile/judgmentOutcomeDisplay';
import {
    clientDefendantEligibleForGhayabiObjection,
    coerceJudgmentTypeForReleasedOperatives,
    hasAnyReleasedDisposition,
    isJudgmentPresenceForm,
    resolveJudgmentTypeFromPartyOperatives,
    type BoundMeritExtent,
} from '@/app/domain/lawsuit/partyJudgmentDisposition';
import {
    canOfferAbsentObjectionToDefendant,
    hasAbsentObjectionStageInDossier,
} from './smartFile/absentJudgmentFlow';
import { isAbsentObjectionStageName } from './smartFile/absentJudgmentStageNames';
import { resolveAbsentObjectionAppealRights } from './smartFile/absentJudgmentAppealRights';
import {
    hasInterpleaderParties,
    isInterpleaderJudgmentType,
} from './smartFile/interpleaderJudgmentEngine';
import { filterPetitionVoidFromJudgmentOptions } from './smartFile/petitionVoidFlow';
import {
    findCassationStageIndex,
    isCassationCorrectionStageName,
} from './smartFile/extraordinaryAppealGateway';
import { isPersonalStatusAppealContext, isPersonalStatusCoreStage } from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import {
    resolveAppealStageClientOutcome,
    resolveCassationClientOutcome,
    resolveClientAppealRole,
    resolveCorrectionAcceptedClientOutcome,
    resolveCorrectionRejectedClientOutcome,
    resolvePriorAppealJudgmentForCassation,
    resolvePriorAppealStageOutcome,
    toAppealClientOutcome,
} from './smartFile/appealStageJudgmentEngine';
import type { CaseStage, Party } from '../LawyerShared';
import { useJudgmentModalStyles } from './smartFile/smartModalChrome';
import { X } from '@/app/components/ui/icons/X';
import {
    GLASS_BTN_GOLD,
    GLASS_BTN_NEUTRAL,
    GLASS_BTN_INDIGO,
} from './parts/judgment/judgmentGlassButtons';
import { judgmentOptionsForStage } from './parts/judgment/judgmentOptionsForStage';
import { DiamondJudgmentPicker } from './parts/judgment/DiamondJudgmentPicker';
import { JudgmentFormToggle } from './parts/judgment/JudgmentFormToggle';
import { JudgmentDefendantFormList } from './parts/judgment/JudgmentDefendantFormList';
import { JudgmentBoundMeritToggle } from './parts/judgment/JudgmentBoundMeritToggle';
import { usePartyJudgmentFormState } from './parts/judgment/usePartyJudgmentFormState';
import { JudgmentDateField } from './parts/judgment/JudgmentDateField';
import { JudgmentOutcomeActions } from './parts/judgment/JudgmentOutcomeActions';
import { CIVIL_LAWSUIT_TEST_IDS } from './smartFile/civilLawsuitTestIds';
import { JudgmentCassationGroundsScope } from './parts/judgment/JudgmentCassationGroundsScope';
import {
    CASSATION_JUDGMENT_REMANDED,
    parseCassationGroundsScope,
    type CassationGroundsScope,
} from '@/app/domain/lawsuit/cassationArt210';

interface SmartJudgmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: JudgmentPayload) => boolean | void;
    currentParties: Party[];
    currentStage?: string;
    representedParty?: string | null;
    stages?: CaseStage[];
    caseStatus?: string;
    activeStageIndex?: number;
    /** تاريخ القرار من شريط ختام المرافعة — إن وُجد يُخفى حقل التاريخ */
    presetJudgmentDate?: string;
    caseDocType?: string | null;
}

export const SmartJudgmentModal: React.FC<SmartJudgmentModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    currentParties,
    currentStage = '',
    representedParty,
    stages = [],
    caseStatus,
    activeStageIndex = -1,
    presetJudgmentDate = '',
    caseDocType = '',
}) => {
    const s = useJudgmentModalStyles();
    const [judgmentType, setJudgmentType] = useState<string>('');
    const [nextStage, setNextStage] = useState<string>('');
    const [judgmentDate, setJudgmentDate] = useState<string>('');
    const [courtName, setCourtName] = useState<string>('');
    const [cassationGroundsScope, setCassationGroundsScope] = useState<CassationGroundsScope>('COMMON');
    const [boundMerit, setBoundMerit] = useState<BoundMeritExtent>('full');
    const isAbsentObjectionStage = isAbsentObjectionStageName(currentStage);
    const activeStage =
        stages[activeStageIndex >= 0 ? activeStageIndex : Math.max(0, stages.length - 1)];
    const {
        defendants,
        multiDefendant,
        judgmentForm,
        setUniformForm,
        dispositions,
        setPartyForm,
        setPartyOperative,
        setUniformOperative,
    } = usePartyJudgmentFormState({
        isOpen,
        parties: currentParties,
        docType: caseDocType,
        existingDispositions: activeStage?.partyJudgmentDispositions,
        existingIntegrity: activeStage?.disputeIntegrity,
        forceHadari: isAbsentObjectionStage || isAppealStageName(currentStage) || isCassationStageName(currentStage),
    });

    const lawyerSide = useMemo(
        () => resolveLawyerSide(representedParty, currentParties),
        [representedParty, currentParties],
    );
    const isPlaintiffLawyer = lawyerSide === 'المدعي';
    const isDefendantLawyer = lawyerSide === 'المدعى عليه';

    const clientAppealRole = useMemo(() => {
        const stageIdx = activeStageIndex >= 0 ? activeStageIndex : stages.length - 1;
        const stage = stages[stageIdx];
        return resolveClientAppealRole(currentParties, {
            appealMetadata: stage?.appealMetadata,
        });
    }, [currentParties, stages, activeStageIndex]);

    const priorAppealJudgment = useMemo(() => {
        if (!isCassationStageName(currentStage)) return null;
        const idx =
            activeStageIndex >= 0 ? activeStageIndex : findCassationStageIndex(stages);
        if (idx < 0) return null;
        return resolvePriorAppealJudgmentForCassation(stages, idx);
    }, [currentStage, stages, activeStageIndex]);

    const appealStageOutcome = useMemo(() => {
        if (!isAppealStageName(currentStage) || !judgmentType) return null;
        return toAppealClientOutcome(
            resolveAppealStageClientOutcome(judgmentType, clientAppealRole),
        );
    }, [currentStage, judgmentType, clientAppealRole]);

    const cassationOutcome = useMemo(() => {
        if (!isCassationStageName(currentStage) || !judgmentType) return null;
        const idx =
            activeStageIndex >= 0 ? activeStageIndex : stages.length - 1;
        const priorAppealOutcome = resolvePriorAppealStageOutcome(stages, idx);
        return resolveCassationClientOutcome(
            judgmentType,
            clientAppealRole,
            priorAppealJudgment,
            priorAppealOutcome,
        );
    }, [currentStage, judgmentType, clientAppealRole, priorAppealJudgment, stages, activeStageIndex]);

    const judgmentOptions = useMemo(
        () =>
            filterPetitionVoidFromJudgmentOptions(
                judgmentOptionsForStage(currentStage, currentParties),
            ),
        [currentStage, currentParties],
    );
    const isPersonalAppealCtx = isPersonalStatusAppealContext(currentStage, stages);
    const isFirstInstance = isFirstInstanceStageName(currentStage);
    const isSubjectMatterJudgmentStage = useMemo(() => {
        if (!currentStage) return false;
        if (isAppealStageName(currentStage) || isCassationStageName(currentStage)) return false;
        if (isCassationCorrectionStageName(currentStage)) return false;
        if (isFirstInstance) return true;
        return isPersonalStatusCoreStage(currentStage);
    }, [currentStage, isFirstInstance]);
    const canOfferAbsentObjection = useMemo(
        () =>
            canOfferAbsentObjectionToDefendant({
                currentStage,
                stages,
                judgmentForm,
                representedParty,
                partyJudgmentDispositions: dispositions,
                parties: currentParties,
                finalDecision:
                    judgmentType ??
                    stages?.[activeStageIndex >= 0 ? activeStageIndex : stages.length - 1]
                        ?.finalDecision,
            }),
        [currentStage, stages, judgmentForm, judgmentType, activeStageIndex, representedParty, dispositions, currentParties],
    );
    const isCorrectionStage = isCassationCorrectionStageName(currentStage);
    const hasPresetJudgmentDate = Boolean(String(presetJudgmentDate ?? '').trim());
    const isNoCourtStage =
        isCassationStageName(currentStage)
        || isCorrectionStage
        || isCassationCorrectionStageName(currentStage)
        || isAppealStageName(currentStage)
        || judgmentForm === 'غيابي'
        || hasPresetJudgmentDate;
    const correctionRejectedOutcome = useMemo(() => {
        if (!isCorrectionStage || judgmentType !== 'رد طلب التصحيح') return null;
        const correctionIdx =
            activeStageIndex >= 0 ? activeStageIndex : stages.length - 1;
        return resolveCorrectionRejectedClientOutcome(
            stages,
            correctionIdx,
            clientAppealRole,
        );
    }, [isCorrectionStage, judgmentType, stages, activeStageIndex, clientAppealRole]);
    const correctionAcceptedOutcome = useMemo(() => {
        if (!isCorrectionStage || judgmentType !== 'قبول طلب التصحيح') return null;
        const correctionIdx =
            activeStageIndex >= 0 ? activeStageIndex : stages.length - 1;
        return resolveCorrectionAcceptedClientOutcome(
            stages,
            correctionIdx,
            clientAppealRole,
        );
    }, [isCorrectionStage, judgmentType, stages, activeStageIndex, clientAppealRole]);

    useEffect(() => {
        if (!isOpen) return;
        setJudgmentType('');
        setNextStage('');
        setCourtName('');
        setCassationGroundsScope('COMMON');
        const prior = String(activeStage?.finalDecision ?? '').trim();
        const priorRows = activeStage?.partyJudgmentDispositions;
        setBoundMerit(
            prior.includes('جزئياً') && !hasAnyReleasedDisposition(priorRows)
                ? 'partial'
                : 'full',
        );
        setJudgmentDate(String(presetJudgmentDate ?? '').trim());
    }, [isOpen, currentStage, presetJudgmentDate, activeStage]);
    const absentObjectionAlreadyFiled = hasAbsentObjectionStageInDossier(stages);
    const showJudgmentFormToggle =
        isSubjectMatterJudgmentStage &&
        !isAbsentObjectionStage &&
        !absentObjectionAlreadyFiled;

    /** تعدد المدعى عليهم في موضوعية عادية: إلزام/رد لكل خصم → اشتقاق كسب/خسارة/جزئي. */
    const deriveOutcomeFromOperatives =
        multiDefendant
        && showJudgmentFormToggle
        && !hasInterpleaderParties(currentParties);

    const effectiveJudgmentType = useMemo(() => {
        if (deriveOutcomeFromOperatives) {
            return (
                resolveJudgmentTypeFromPartyOperatives(dispositions, boundMerit)
                || coerceJudgmentTypeForReleasedOperatives(judgmentType, dispositions)
            );
        }
        return coerceJudgmentTypeForReleasedOperatives(judgmentType, dispositions);
    }, [deriveOutcomeFromOperatives, judgmentType, dispositions, boundMerit]);

    const showPartyOperative = deriveOutcomeFromOperatives;
    const showBoundMeritToggle =
        deriveOutcomeFromOperatives && !hasAnyReleasedDisposition(dispositions);

    useEffect(() => {
        if (!isOpen) return;
        if (deriveOutcomeFromOperatives) {
            const derived = resolveJudgmentTypeFromPartyOperatives(dispositions, boundMerit);
            if (derived && derived !== judgmentType) setJudgmentType(derived);
            return;
        }
        if (!judgmentType) return;
        if (effectiveJudgmentType && effectiveJudgmentType !== judgmentType) {
            setJudgmentType(effectiveJudgmentType);
        }
    }, [
        isOpen,
        deriveOutcomeFromOperatives,
        dispositions,
        boundMerit,
        judgmentType,
        effectiveJudgmentType,
    ]);

    const handleJudgmentChange = (value: string) => {
        setJudgmentType(value);
        setNextStage('');
        if (
            value === 'إجابة الدعوى بالكامل'
            || value === 'إجابة الدعوى'
        ) {
            setUniformOperative('bound');
        } else if (value === 'رد الدعوى كلياً' || value === 'رد الدعوى') {
            setUniformOperative('released');
        }
    };

    const handleSaveJudgment = (actionType: string) => {
        if (!String(judgmentDate).trim()) {
            SmartToast.error('حدد تاريخ الحكم');
            return;
        }
        let finalAction = 'waiting_for_appeal';
        let calculatedNextStage = nextStage;
        let openObjectionModal = false;
        let openAppealTransitionModal = false;
        let openRegisterOpponentAppealModal = false;

        if (actionType === 'appeal') {
            if (isAppealStageName(currentStage)) {
                finalAction = 'waiting_for_cassation';
            } else {
                finalAction = 'waiting_for_appeal';
            }
        } else if (actionType === 'objection') {
            finalAction = 'waiting_for_appeal';
            openObjectionModal = true;
        } else if (actionType === 'wait' || actionType === 'wait_objection') {
            finalAction = 'waiting_for_appeal';
        } else if (actionType === 'register_opponent_appeal') {
            finalAction = 'waiting_for_appeal';
            openRegisterOpponentAppealModal = true;
        } else if (actionType === 'wait_cassation') {
            finalAction = 'waiting_for_cassation';
        } else if (actionType === 'finalize_non_merit') {
            finalAction = 'finalize_non_merit';
        } else if (
            actionType === 'final_ratification'
            || actionType === 'reverse_final'
            || actionType === 'remand_to_lower'
            || actionType === 'correction_request'
            || actionType === 'correction_complete'
            || actionType === 'correction_rejected'
        ) {
            finalAction = actionType;
        }

        const savedForm =
            isAbsentObjectionStage
            || isAppealStageName(currentStage)
            || isCassationStageName(currentStage)
                ? 'حضوري'
                : (showJudgmentFormToggle ? judgmentForm : (judgmentForm || 'حضوري'));
        const saved = onConfirm({
            action: finalAction,
            judgmentType: effectiveJudgmentType || judgmentType,
            judgmentForm: savedForm,
            judgmentDate,
            notes: '',
            nextStage: calculatedNextStage,
            stageName: currentStage,
            openObjectionModal,
            openAppealTransitionModal,
            openRegisterOpponentAppealModal,
            isPleadingsClosed: true,
            ...(savedForm === 'حضوري' || savedForm === 'غيابي' ? { lastJudgmentType: savedForm } : {}),
            ...(showJudgmentFormToggle && dispositions.length > 0
                ? {
                    partyJudgmentDispositions: dispositions,
                    ...(multiDefendant ? { disputeIntegrity: 'indivisible' as const } : {}),
                }
                : {}),
            newCourt:
                isCassationStageName(currentStage) || isCorrectionStage
                    ? 'محكمة التمييز الاتحادية'
                    : String(courtName ?? '').trim() || undefined,
            ...(isCassationStageName(currentStage) && judgmentType === CASSATION_JUDGMENT_REMANDED
                ? { cassationGroundsScope: parseCassationGroundsScope(cassationGroundsScope) }
                : {}),
        });
        if (saved !== false) onClose();
    };

    const appealRights = useMemo(() => {
        if (isAbsentObjectionStage) {
            return resolveAbsentObjectionAppealRights(effectiveJudgmentType, currentParties);
        }
        return resolveFirstInstanceHadoriAppealRights(effectiveJudgmentType, lawyerSide, {
            parties: currentParties,
            representedParty,
        });
    }, [
        isAbsentObjectionStage,
        effectiveJudgmentType,
        lawyerSide,
        currentParties,
        representedParty,
    ]);

    const handleWaitForOpponent = () => {
        if (!String(judgmentDate).trim()) {
            SmartToast.error('حدد تاريخ الحكم');
            return;
        }
        const confirmed = window.confirm(
            `سيتم قفل مرحلة المرافعة وحفظ الحكم.\n\n${appealRights.hint}\n\nمسارات الطعن والاعتراض (إن وُجدت) تظهر في تذييل الإضبارة بعد الحفظ.\n\nهل تريد المتابعة؟`,
        );
        if (!confirmed) return;
        handleSaveJudgment('wait');
    };

    const hadoriAppealRights = appealRights;
    const showClientAbsentObjection = useMemo(
        () =>
            Boolean(lawyerSide === 'المدعى عليه')
            && clientDefendantEligibleForGhayabiObjection(currentParties, dispositions)
            && canOfferAbsentObjection
            && !isAbsentObjectionStage,
        [
            lawyerSide,
            currentParties,
            dispositions,
            canOfferAbsentObjection,
            isAbsentObjectionStage,
        ],
    );
    const opponentMayFileAbsentObjection = useMemo(
        () =>
            Boolean(lawyerSide === 'المدعي')
            && dispositions.some(
                (row) => row.form === 'غيابي' && row.operative !== 'released',
            )
            && canOfferAbsentObjectionToDefendant({
                currentStage,
                stages,
                judgmentForm,
                representedParty: 'المدعى عليه',
                partyJudgmentDispositions: dispositions,
                parties: currentParties,
                finalDecision: effectiveJudgmentType,
                opponentRegistration: true,
            }),
        [
            lawyerSide,
            judgmentForm,
            dispositions,
            currentStage,
            stages,
            currentParties,
            effectiveJudgmentType,
        ],
    );

    const showFirstInstanceHadoriAppealActions = useMemo(() => {
        if (!effectiveJudgmentType) return false;
        if (isAbsentObjectionStage) return false;
        if (effectiveJudgmentType === 'إبطال' || effectiveJudgmentType === 'إبطال عريضة الدعوى وعريضة التدخل') {
            return false;
        }
        if (
            isAppealStageName(currentStage)
            || isCassationStageName(currentStage)
            || isCorrectionStage
        ) {
            return false;
        }
        if (isNonMeritTerminationType(effectiveJudgmentType)) return false;
        if (effectiveJudgmentType === 'إبطال عريضة الدعوى وعريضة التدخل') return false;
        if (
            !isSubjectMatterJudgmentType(effectiveJudgmentType)
            && !isInterpleaderJudgmentType(effectiveJudgmentType)
        ) {
            return false;
        }

        return (
            judgmentForm === 'حضوري'
            || judgmentForm === 'غيابي'
            || judgmentForm === 'مختلط'
            || judgmentForm === 'بمثابة الحضوري'
        );
    }, [
        effectiveJudgmentType,
        judgmentForm,
        currentStage,
        isAbsentObjectionStage,
        isCorrectionStage,
    ]);

    const showAbsentObjectionAppealActions = Boolean(
        isAbsentObjectionStage && effectiveJudgmentType && !isNonMeritTerminationType(effectiveJudgmentType),
    );

    /** الاعتراض الغيابي يُدمَج في Hadori — لا مسار منفصل متزامن. */
    const showAbsentJudgmentRoleActions = false;

    const btnGold = s.isPearl ? s.btnPrimary : GLASS_BTN_GOLD;
    const btnNeutral = s.isPearl ? s.btnNeutral : GLASS_BTN_NEUTRAL;
    const btnWait = s.isPearl ? s.btnWait : GLASS_BTN_INDIGO;
    const waitHintFallback = isAbsentObjectionStage
        ? 'سيُقفل ملف الاعتراض بانتظار طعن الخصم.'
        : s.isPearl
          ? 'سيُقفل الملف بانتظار طعن الخصم.'
          : 'سيُقفل ملف البداءة بانتظار طعن الخصم.';
    const selfAppealHintFallback = isPersonalAppealCtx || s.isPearl
        ? 'يحق لموكلك الطعن تمييزاً — سجّل الطعن في بوابة الانتقال'
        : 'يحق لموكلك الطعن — اختر الاستئناف أو التمييز في بوابة الانتقال';
    const appealTransitionLabel = 'حفظ الحكم';

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={`${s.overlay}${isOpen ? '' : ' pointer-events-none'}`}
            dir="rtl"
            data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentModal}
            hidden={!isOpen}
            aria-hidden={!isOpen}
            style={isOpen ? undefined : { display: 'none' }}
        >
            {isOpen ? (
            <div className={s.shell}>
                        <div className={s.header}>
                            <div className="flex items-center gap-3 min-w-0">
                                <h2 className={s.headerTitle}>
                                    {isAbsentObjectionStage
                                        ? 'ختام المرافعة وقرار الاعتراض'
                                        : isCorrectionStage
                                          ? 'قرار طلب تصحيح القرار التمييزي'
                                          : 'ختم المرافعة وقرار الحكم'}
                                </h2>
                            </div>
                            <button type="button" onClick={onClose} className={s.closeBtn} aria-label="إغلاق">
                                <X size={18} />
                            </button>
                        </div>

                        <div className={s.body}>
                            {showJudgmentFormToggle && multiDefendant ? (
                                <JudgmentDefendantFormList
                                    styles={s}
                                    defendants={defendants}
                                    dispositions={dispositions}
                                    onPartyFormChange={setPartyForm}
                                    onPartyOperativeChange={setPartyOperative}
                                    showOperative={showPartyOperative}
                                />
                            ) : showJudgmentFormToggle ? (
                                <JudgmentFormToggle
                                    styles={s}
                                    judgmentForm={judgmentForm}
                                    onChange={(form) => {
                                        if (isJudgmentPresenceForm(form)) setUniformForm(form);
                                    }}
                                />
                            ) : null}

                            {showBoundMeritToggle ? (
                                <JudgmentBoundMeritToggle
                                    styles={s}
                                    value={boundMerit}
                                    onChange={setBoundMerit}
                                />
                            ) : null}

                            <div className={s.diamondSection}>
                                <label className={s.label}>
                                    {isAbsentObjectionStage
                                        ? 'قرار الحكم في الاعتراض على الحكم الغيابي'
                                        : deriveOutcomeFromOperatives
                                          ? 'نتيجة الدعوى'
                                          : 'قرار الحكم (نتيجة الدعوى)'}
                                </label>
                                {deriveOutcomeFromOperatives ? (
                                    <p
                                        className={`${s.hint} text-white/70 border-white/[0.08] bg-white/[0.02]`}
                                        dir="rtl"
                                        data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentDerivedOutcome}
                                    >
                                        {formatJudgmentOutcomeDisplayLabel(
                                            effectiveJudgmentType || '',
                                        ) || 'حدّد إلزام أو رد بحق كل مدعى عليه'}
                                    </p>
                                ) : (
                                    <DiamondJudgmentPicker
                                        value={judgmentType}
                                        onChange={handleJudgmentChange}
                                        options={judgmentOptions}
                                        styles={s}
                                    />
                                )}
                            </div>

                            {isCassationStageName(currentStage)
                            && judgmentType === CASSATION_JUDGMENT_REMANDED ? (
                                <JudgmentCassationGroundsScope
                                    styles={s}
                                    value={cassationGroundsScope}
                                    onChange={setCassationGroundsScope}
                                />
                            ) : null}

                            {isNoCourtStage && hasPresetJudgmentDate ? (
                                <p
                                    className={`${s.hint} text-white/55 border-white/[0.08] bg-white/[0.02]`}
                                    dir="rtl"
                                >
                                    تاريخ القرار المحدَّد:{' '}
                                    <span className="tabular-nums font-bold text-white/80" dir="ltr">
                                        {judgmentDate || presetJudgmentDate}
                                    </span>
                                </p>
                            ) : (
                                <JudgmentDateField
                                    styles={s}
                                    judgmentDate={judgmentDate}
                                    onChange={setJudgmentDate}
                                    judgmentType={judgmentType}
                                    mode={hasPresetJudgmentDate ? 'court' : 'date'}
                                    courtName={courtName}
                                    onCourtChange={setCourtName}
                                    showCourtField={!isNoCourtStage}
                                    label={hasPresetJudgmentDate ? 'المحكمة المختصة' : 'تاريخ الحكم'}
                                />
                            )}

                            <JudgmentOutcomeActions
                                styles={s}
                                judgmentType={effectiveJudgmentType || judgmentType}
                                currentStage={currentStage}
                                isCorrectionStage={isCorrectionStage}
                                showAbsentObjectionAppealActions={showAbsentObjectionAppealActions}
                                showFirstInstanceHadoriAppealActions={showFirstInstanceHadoriAppealActions}
                                showAbsentJudgmentRoleActions={showAbsentJudgmentRoleActions}
                                isPlaintiffLawyer={isPlaintiffLawyer}
                                isDefendantLawyer={isDefendantLawyer}
                                hadoriAppealRights={hadoriAppealRights}
                                appealStageOutcome={appealStageOutcome}
                                cassationOutcome={cassationOutcome}
                                correctionRejectedOutcome={correctionRejectedOutcome}
                                correctionAcceptedOutcome={correctionAcceptedOutcome}
                                btnGold={btnGold}
                                btnNeutral={btnNeutral}
                                btnWait={btnWait}
                                waitHintFallback={waitHintFallback}
                                selfAppealHintFallback={selfAppealHintFallback}
                                appealTransitionLabel={appealTransitionLabel}
                                opponentMayFileAbsentObjection={opponentMayFileAbsentObjection}
                                showClientAbsentObjection={showClientAbsentObjection}
                                onClose={onClose}
                                onWaitForOpponent={handleWaitForOpponent}
                                onSaveJudgment={handleSaveJudgment}
                            />
                        </div>
            </div>
            ) : null}
        </div>,
        document.body,
    );
};
