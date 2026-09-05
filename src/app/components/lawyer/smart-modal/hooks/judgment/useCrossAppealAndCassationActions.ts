import type { CrossAppealPayload } from '../../smartFile/judgmentTypes';
import { withClientStageOutcome } from '../../smartFile/stageOutcomeResolution';
import { patchDossierAfterCassationRemand } from '../../smartFile/art210CassationExtension';
import type { UseSmartFileJudgmentActionsOptions } from './judgmentHookTypes';
import {
    buildCassationRemandTimelineTitle,
    cassationOutcomeToStageOutcome,
    resolveCassationClientOutcome,
    resolveClientAppealRole,
    resolvePriorAppealJudgmentForCassation,
    resolvePriorAppealStageOutcome,
} from '../../smartFile/appealStageJudgmentEngine';
import {
    applyCassationRemand,
    cassationRemandSuccessMessage,
} from '../../smartFile/appealStageTransition';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { SmartToast } from '@/app/components/ui/SmartToast';

export function useCrossAppealAndCassationActions(options: UseSmartFileJudgmentActionsOptions) {
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
        setShowCrossAppealModal,
    } = options;

const handleCrossAppeal = (_crossAppealData: CrossAppealPayload) => {
    SmartToast.info('أُلغي مسار الاستئناف المتقابل — الطعن اللاحق بإضبارة مستقلة');
    setShowCrossAppealModal(false);
};

// ========================================
// CASSATION OUTCOME HANDLER (Ratified / Quashed)
// ========================================
const handleCassationDecision = (decision: 'ratified' | 'quashed') => {
    const updatedStages = [...stages];
    const now = getLocalTodayYmd();
    const clientRole = resolveClientAppealRole(currentStage.parties, {
        appealMetadata: currentStage.appealMetadata,
    });
    const priorAppealJudgment = resolvePriorAppealJudgmentForCassation(
        updatedStages,
        activeStageIndex,
    );
    const priorAppealOutcome = resolvePriorAppealStageOutcome(updatedStages, activeStageIndex);

    if (decision === 'ratified') {
        const cassationJudgment = 'تصديق الحكم';
        const outcome = resolveCassationClientOutcome(
            cassationJudgment,
            clientRole,
            priorAppealJudgment,
            priorAppealOutcome,
        );
        const clientLost = outcome === 'loss';

        updatedStages[activeStageIndex] = withClientStageOutcome(
            {
                ...currentStage,
                status: 'completed',
                finalDecision: 'مكتسبة الدرجة القطعية',
                decisionDate: now,
                isPleadingsClosed: true,
            },
            cassationOutcomeToStageOutcome(outcome) ?? 'FINALIZED',
        );

        updatedStages[activeStageIndex].timeline = [{
            id: `cass_ratified_${Date.now()}`,
            type: 'decision',
            date: now,
            title: clientLost
                ? 'تصديق الحكم — اكتسب الدرجة القطعية (حكم نهائي ضد الموكل)'
                : '✅ قرار تصديق الحكم (مصدق)',
            details: clientLost
                ? 'صدقت محكمة التمييز حكم محكمة الاستئناف.\nالحكم مكتسب الدرجة القطعية — نهائي ضد موكلك.'
                : 'قررت محكمة التمييز الاتحادية تصديق الحكم المميز ورد الطعون، واكتسب القرار الدرجة القطعية.',
            isNew: true,
            color: clientLost ? 'red' : 'gold',
        }, ...(currentStage.timeline ?? [])];

        SmartToast.success(
            clientLost
                ? 'خُتمت الإضبارة — الحكم نهائي ضد الموكل'
                : 'تم تصديق الحكم واكتسب الدرجة القطعية',
        );
    } else {
        const cassationJudgment = 'نقض الحكم وإعادة الإضبارة';
        const remandTitle = buildCassationRemandTimelineTitle(
            cassationJudgment,
            clientRole,
            priorAppealJudgment,
            priorAppealOutcome,
        );
        const remandOutcome = resolveCassationClientOutcome(
            cassationJudgment,
            clientRole,
            priorAppealJudgment,
            priorAppealOutcome,
        );
        const { updatedStages: remandedStages, newActiveIndex, target } = applyCassationRemand(
            stages,
            activeStageIndex,
            {
                remandDate: now,
                cassationFinalDecision: 'منقوض (إعادة للمحاكمة)',
                cassationTimelineEvent: {
                    id: `cass_quashed_${Date.now()}`,
                    type: 'decision',
                    date: now,
                    title: remandTitle,
                    details: 'قررت محكمة التمييز نقض الحكم المميز وإعادة الإضبارة إلى محكمتها للسير فيها مجدداً.',
                    isNew: true,
                    color: remandOutcome === 'remand_favorable' ? 'gold' : 'red',
                },
            },
        );
        const extended = patchDossierAfterCassationRemand({
            stages: remandedStages,
            cassationIndex: activeStageIndex,
            groundsScope: 'COMMON',
            parentIntegrity: parentData.disputeIntegrity,
        });

        setStages(extended);
        setActiveStageIndex(newActiveIndex);
        setViewingStageIndex(newActiveIndex);
        setStatus(`مرحلة ${target.stageName}`);
        saveToCloud(extended, parentData, newActiveIndex, `مرحلة ${target.stageName}`);
        SmartToast[remandOutcome === 'remand_favorable' ? 'success' : 'error'](cassationRemandSuccessMessage(target));
        return;
    }

    const finalStatus = 'مكتسبة الدرجة القطعية';
    setStages(updatedStages);
    setStatus(finalStatus);
    saveToCloud(updatedStages, { ...parentData, status: finalStatus }, activeStageIndex, finalStatus);
};


    return {
        handleCrossAppeal,
        handleCassationDecision,
    };
}
