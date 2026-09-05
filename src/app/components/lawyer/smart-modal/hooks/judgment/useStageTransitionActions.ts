import { debug } from '@/app/utils/debug';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { applyStageTransition } from '../../smartFile/stageTransition';
import type { StageTransitionPayload } from '../../smartFile/judgmentTypes';
import { str } from '../../smartFile/judgmentTypes';
import { inferJudgmentTypeFromStage } from '../../smartFile/inferStageJudgmentType';




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
};

const handleOpenDefendantCassationAppeal = (
    preferredChallengerPartyId?: string,
    options?: { forceIndependentSpawn?: boolean },
) => {
    const forceIndependentChallengeSpawn = Boolean(
        preferredChallengerPartyId || options?.forceIndependentSpawn,
    );
    setTempJudgmentData({
        action: 'waiting_for_appeal',
        judgmentType: inferJudgmentTypeFromStage(currentStage),
        judgmentForm: str(currentStage.judgmentForm || currentStage.lastJudgmentType || 'حضوري'),
        judgmentDate: str(currentStage.decisionDate || getLocalTodayYmd()),
        notes: '',
        openAppealTransitionModal: true,
        ...(preferredChallengerPartyId
            ? { preferredChallengerPartyId: String(preferredChallengerPartyId) }
            : {}),
        ...(forceIndependentChallengeSpawn ? { forceIndependentChallengeSpawn: true } : {}),
    });
    setShowAppealTransitionModal(true);
};

    return {
        handleTransitionConfirm,
        handleOpenDefendantCassationAppeal,
    };
}
