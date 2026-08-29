import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
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
import {
    canOfferAbsentObjectionToDefendant,
    hasAbsentObjectionStageInDossier,
} from './smartFile/absentJudgmentFlow';
import { isAbsentObjectionStageName } from './smartFile/absentJudgmentStageNames';
import { resolveAbsentObjectionAppealRights } from './smartFile/absentJudgmentAppealRights';
import { isInterpleaderJudgmentType } from './smartFile/interpleaderJudgmentEngine';
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
import { JudgmentDateField } from './parts/judgment/JudgmentDateField';
import { JudgmentOutcomeActions } from './parts/judgment/JudgmentOutcomeActions';
import { CIVIL_LAWSUIT_TEST_IDS } from './smartFile/civilLawsuitTestIds';

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
}) => {
    const s = useJudgmentModalStyles();
    const [judgmentType, setJudgmentType] = useState<string>('');
    const [judgmentForm, setJudgmentForm] = useState<string>('حضوري');
    const [nextStage, setNextStage] = useState<string>('');
    const [judgmentDate, setJudgmentDate] = useState<string>(getLocalTodayYmd());

    const lawyerSide = useMemo(
        () => resolveLawyerSide(representedParty, currentParties),
        [representedParty, currentParties],
    );
    const isPlaintiffLawyer = lawyerSide === 'المدعي';
    const isDefendantLawyer = lawyerSide === 'المدعى عليه';

    const clientAppealRole = useMemo(
        () => resolveClientAppealRole(currentParties),
        [currentParties],
    );

    const priorAppealJudgment = useMemo(() => {
        if (!isCassationStageName(currentStage)) return null;
        const idx =
            activeStageIndex >= 0 ? activeStageIndex : findCassationStageIndex(stages);
        if (idx < 0) return null;
        return resolvePriorAppealJudgmentForCassation(stages, idx);
    }, [currentStage, stages, activeStageIndex]);

    const appealStageOutcome = useMemo(() => {
        if (!isAppealStageName(currentStage) || !judgmentType) return null;
        return resolveAppealStageClientOutcome(judgmentType, clientAppealRole);
    }, [currentStage, judgmentType, clientAppealRole]);

    const cassationOutcome = useMemo(() => {
        if (!isCassationStageName(currentStage) || !judgmentType) return null;
        return resolveCassationClientOutcome(
            judgmentType,
            clientAppealRole,
            priorAppealJudgment,
        );
    }, [currentStage, judgmentType, clientAppealRole, priorAppealJudgment]);

    const judgmentOptions = useMemo(
        () =>
            filterPetitionVoidFromJudgmentOptions(
                judgmentOptionsForStage(currentStage, currentParties),
            ),
        [currentStage, currentParties],
    );
    const isAbsentObjectionStage = isAbsentObjectionStageName(currentStage);
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
                finalDecision:
                    judgmentType ??
                    stages?.[activeStageIndex >= 0 ? activeStageIndex : stages.length - 1]
                        ?.finalDecision,
            }),
        [currentStage, stages, judgmentForm, judgmentType, activeStageIndex],
    );
    const isCorrectionStage = isCassationCorrectionStageName(currentStage);
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
        setJudgmentDate(getLocalTodayYmd());
        if (isAbsentObjectionStageName(currentStage)) {
            setJudgmentForm('حضوري');
        }
    }, [isOpen, currentStage]);
    const absentObjectionAlreadyFiled = hasAbsentObjectionStageInDossier(stages);
    const showJudgmentFormToggle =
        isSubjectMatterJudgmentStage &&
        !isAbsentObjectionStage &&
        !absentObjectionAlreadyFiled;

    const handleJudgmentChange = (value: string) => {
        setJudgmentType(value);
        setNextStage('');
    };

    const handleSaveJudgment = (actionType: string) => {
        let finalAction = 'waiting_for_appeal';
        let calculatedNextStage = nextStage;
        let openObjectionModal = false;
        let openAppealTransitionModal = false;
        let openRegisterOpponentAppealModal = false;

        if (actionType === 'appeal') {
            openAppealTransitionModal = true;
            finalAction = 'waiting_for_appeal';
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
            || actionType === 'remand_to_lower'
            || actionType === 'correction_request'
            || actionType === 'correction_complete'
            || actionType === 'correction_rejected'
        ) {
            finalAction = actionType;
        }

        const savedForm = isAbsentObjectionStage ? 'حضوري' : (showJudgmentFormToggle ? judgmentForm : (judgmentForm || 'حضوري'));
        const saved = onConfirm({
            action: finalAction,
            judgmentType,
            judgmentForm: savedForm,
            judgmentDate,
            notes: '',
            nextStage: calculatedNextStage,
            stageName: currentStage,
            openObjectionModal,
            openAppealTransitionModal,
            openRegisterOpponentAppealModal,
            isPleadingsClosed: true,
            lastJudgmentType: savedForm,
        });
        if (saved !== false) onClose();
    };

    const appealRights = useMemo(() => {
        if (isAbsentObjectionStage) {
            return resolveAbsentObjectionAppealRights(judgmentType, currentParties);
        }
        return resolveFirstInstanceHadoriAppealRights(judgmentType, lawyerSide, {
            parties: currentParties,
            representedParty,
        });
    }, [
        isAbsentObjectionStage,
        judgmentType,
        lawyerSide,
        currentParties,
        representedParty,
    ]);

    const handleWaitForOpponent = () => {
        const confirmed = window.confirm(
            `سيتم قفل مرحلة المرافعة وحفظ الحكم.\n\n${appealRights.hint}\n\nتبقى الملاحظات والمستندات والسجل الزمني ظاهرة حتى تسجّل طعن الخصم.\n\nهل تريد المتابعة؟`,
        );
        if (!confirmed) return;
        handleSaveJudgment('wait');
    };

    const hadoriAppealRights = appealRights;

    const showFirstInstanceHadoriAppealActions = useMemo(() => {
        if (!judgmentType) return false;
        if (isAbsentObjectionStage) return false;
        if (judgmentType === 'إبطال' || judgmentType === 'إبطال عريضة الدعوى وعريضة التدخل') {
            return false;
        }
        if (
            isAppealStageName(currentStage)
            || isCassationStageName(currentStage)
            || isCorrectionStage
        ) {
            return false;
        }
        if (isNonMeritTerminationType(judgmentType)) return false;
        if (isInterpleaderJudgmentType(judgmentType)) return false;
        if (!isSubjectMatterJudgmentType(judgmentType)) return false;

        return judgmentForm === 'حضوري' || judgmentForm === 'غيابي';
    }, [
        judgmentType,
        judgmentForm,
        currentStage,
        isAbsentObjectionStage,
        isCorrectionStage,
    ]);

    const showAbsentObjectionAppealActions = Boolean(
        isAbsentObjectionStage && judgmentType && !isNonMeritTerminationType(judgmentType),
    );

    const showAbsentJudgmentRoleActions =
        judgmentForm === 'غيابي' &&
        canOfferAbsentObjection &&
        !isAbsentObjectionStage &&
        judgmentType !== 'إبطال' &&
        judgmentType !== 'إبطال عريضة الدعوى وعريضة التدخل' &&
        currentStage !== 'الاستئناف' &&
        !isNonMeritTerminationType(judgmentType) &&
        !showFirstInstanceHadoriAppealActions;

    const btnGold = s.isPearl ? s.btnPrimary : GLASS_BTN_GOLD;
    const btnNeutral = s.isPearl ? s.btnNeutral : GLASS_BTN_NEUTRAL;
    const btnWait = s.isPearl ? s.btnWait : GLASS_BTN_INDIGO;
    const waitHintFallback = isAbsentObjectionStage
        ? 'سيُقفل ملف الاعتراض بانتظار انتهاء المدة القانونية لطعن الخصم.'
        : s.isPearl
          ? 'سيُقفل الملف بانتظار انتهاء المدة القانونية لطعن الخصم.'
          : 'سيُقفل ملف البداءة بانتظار انتهاء المدة القانونية لطعن الخصم.';
    const selfAppealHintFallback = isPersonalAppealCtx || s.isPearl
        ? 'يحق لموكلك الطعن تمييزاً — سجّل الطعن في بوابة الانتقال'
        : 'يحق لموكلك الطعن — اختر الاستئناف أو التمييز في بوابة الانتقال';
    const appealTransitionLabel = isPersonalAppealCtx || s.isPearl
        ? 'حفظ والانتقال لمرحلة الطعن (تمييز)'
        : 'حفظ والانتقال لمرحلة الطعن (استئناف/تمييز)';

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={s.overlay}
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
                            {showJudgmentFormToggle && (
                                <JudgmentFormToggle
                                    styles={s}
                                    judgmentForm={judgmentForm}
                                    onChange={setJudgmentForm}
                                />
                            )}

                            <div className={s.diamondSection}>
                                <label className={s.label}>
                                    {isAbsentObjectionStage
                                        ? 'قرار الحكم في الاعتراض على الحكم الغيابي'
                                        : 'قرار الحكم (نتيجة الدعوى)'}
                                </label>
                                <DiamondJudgmentPicker
                                    value={judgmentType}
                                    onChange={handleJudgmentChange}
                                    options={judgmentOptions}
                                    styles={s}
                                />
                            </div>

                            <JudgmentDateField
                                styles={s}
                                judgmentDate={judgmentDate}
                                onChange={setJudgmentDate}
                                judgmentType={judgmentType}
                            />

                            <JudgmentOutcomeActions
                                styles={s}
                                judgmentType={judgmentType}
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
