import type { Dispatch, SetStateAction } from 'react';
import type { CaseStage, Party, TimelineEvent } from '../../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { validateJudgmentData } from '@/app/utils/validationUtils';
import { logError } from '@/app/utils/errorHandler';
import { debug } from '@/app/utils/debug';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { applyStageTransition } from '../../smartFile/stageTransition';
import {
    applyAppealStageTransition,
    applyCassationRemand,
    cassationRemandSuccessMessage,
    resolveCassationRemandTarget,
} from '../../smartFile/appealStageTransition';
import type { SmartFileParentData } from '../../smartFile/parentDataInit';
import type {
    AppealTransitionPayload,
    CrossAppealPayload,
    JudgmentPayload,
    SmartFileAttachment,
    StageTransitionPayload,
} from '../../smartFile/judgmentTypes';
import {
    addDaysYmd,
    isSulhJudgmentType,
    JUDGMENT_TYPE_PETITION_NULLIFIED_LEGACY,
    JUDGMENT_TYPE_WAIVER,
    parseJudgmentDateInput,
    prependTimeline,
    stageAttachments,
    str,
} from '../../smartFile/judgmentTypes';
import {
    interpleaderClientAwaitingOpponentAppeal,
    interpleaderOriginalClaimOutcome,
    isInterpleaderJudgmentType,
    resolveInterpleaderDecisionText,
    resolveLawyerJudgmentBucket,
} from '../../smartFile/interpleaderJudgmentEngine';
import { resolveAppealDossierLayout, inferAppellantSideFromLawyer } from '../../smartFile/appealPartyEngine';
import {
    markPartiesAsCrossAppellants,
    resolveCrossAppealEligibility,
} from '../../smartFile/crossAppealEngine';
import type { UseSmartFileJudgmentActionsOptions } from './judgmentHookTypes';

export function useStageTransitionActions(options: UseSmartFileJudgmentActionsOptions) {
    const {
        stages,
        setStages,
        activeStageIndex,
        setActiveStageIndex,
        setViewingStageIndex,
        currentStage,
        parentData,
        saveToCloud,
        setStatus,
        tempJudgmentData,
        setTempJudgmentData,
        setShowAppealTransitionModal,
        setShowAppealModal,
        setShowObjectionRegistrationModal,
        setShowJudgmentModal,
        setShowCrossAppealModal,
        setShowTransitionModal,
    } = options;

const handleTransitionConfirm = (transitionData: StageTransitionPayload) => {
    const { newStage, newCaseNo, result, date } = transitionData;

    debug.log('🔄 بدء عملية الانتقال للمرحلة الجديدة...');

    const { updatedStages, newActiveIndex } = applyStageTransition(stages, activeStageIndex, currentStage, {
        newStage,
        result,
        date,
    });

    debug.log(`✅ تم ختم المرحلة "${currentStage.stageName}" بمنطوق: ${result}`);
    setStages(updatedStages);
    setActiveStageIndex(newActiveIndex);
    saveToCloud(updatedStages, parentData, newActiveIndex);

    debug.log(`✅ تم إنشاء إضبارة فرعية جديدة "${newStage}" برقم: ${newCaseNo}`);
    debug.log(`📦 إجمالي المراحل: ${updatedStages.length}`);

    setShowTransitionModal(false);
};

const inferJudgmentTypeFromStage = (stage: CaseStage): string => {
    const fd = str(stage.finalDecision);
    if (fd.includes('الصلح') || fd.includes('صلح')) return 'الصلح';
    if (fd.includes('التنازل') || fd.includes('تنازل')) return JUDGMENT_TYPE_WAIVER;
    if (fd.includes('إجابة الدعوى')) return 'إجابة الدعوى بالكامل';
    return 'إجابة الدعوى بالكامل';
};

const handleOpenDefendantCassationAppeal = () => {
    setTempJudgmentData({
        action: 'waiting_for_appeal',
        judgmentType: inferJudgmentTypeFromStage(currentStage),
        judgmentForm: str(currentStage.judgmentForm || currentStage.lastJudgmentType || 'حضوري'),
        judgmentDate: str(currentStage.decisionDate || getLocalTodayYmd()),
        notes: '',
        openAppealTransitionModal: true,
    });
    setShowAppealTransitionModal(true);
};

    return {
        handleTransitionConfirm,
        handleOpenDefendantCassationAppeal,
    };
}
