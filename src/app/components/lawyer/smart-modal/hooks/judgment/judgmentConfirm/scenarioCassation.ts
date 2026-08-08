import { SmartToast } from '@/app/components/ui/SmartToast';

import {
    applyCassationRemand,
    applyCassationCorrectionOpen,
    applyCorrectionComplete,
    applyCorrectionRejected,
    cassationRemandSuccessMessage,
    resolveCassationRemandTarget,
} from '../../../smartFile/appealStageTransition';
import { isCassationCorrectionStageName } from '../../../smartFile/extraordinaryAppealGateway';
import {
    resolveCassationClientOutcome,
    resolveClientAppealRole,
    resolveCorrectionAcceptedClientOutcome,
    resolveCorrectionRejectedClientOutcome,
    buildCassationRemandTimelineTitle,
    resolvePriorAppealJudgmentForCassation,
} from '../../../smartFile/appealStageJudgmentEngine';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from './judgmentConfirmTypes';

export function applyCassationScenarios(scope: JudgmentConfirmScope, rt: JudgmentConfirmRuntime): void {
    const { currentStage, activeStageIndex, setStatus } = scope;
    const {
        action,
        judgmentType,
        judgmentDate,
        notes,
        updatedStages,
    } = rt;

    const stageName = String(currentStage.stageName ?? currentStage.name ?? '');

    if (action === 'correction_complete' && isCassationCorrectionStageName(stageName)) {
        rt.handled = true;
        const clientRole = resolveClientAppealRole(currentStage.parties);
        const correctionOutcome = resolveCorrectionAcceptedClientOutcome(
            updatedStages,
            activeStageIndex,
            clientRole,
        );
        const clientWon = correctionOutcome === 'win';

        const { updatedStages: completedStages, newActiveIndex, targetStageName } = applyCorrectionComplete(
            updatedStages,
            activeStageIndex,
            {
                completionDate: judgmentDate,
                notes,
                outcome: judgmentType || undefined,
            },
        );
        updatedStages.splice(0, updatedStages.length, ...completedStages);
        rt.remandNewActiveIndex = newActiveIndex;
        setStatus(`مرحلة ${targetStageName}`);
        rt.nextCaseStatus = `مرحلة ${targetStageName}`;
        rt.successToast = clientWon
            ? `تم قبول التصحيح لصالح الموكل — العودة لمرحلة ${targetStageName}`
            : `تم قبول التصحيح — العودة لمرحلة ${targetStageName}`;
        SmartToast.success(rt.successToast);
        return;
    }

    if (action === 'correction_rejected' && isCassationCorrectionStageName(stageName)) {
        rt.handled = true;
        const clientRole = resolveClientAppealRole(currentStage.parties);
        const correctionOutcome = resolveCorrectionRejectedClientOutcome(
            updatedStages,
            activeStageIndex,
            clientRole,
        );
        const clientLost = correctionOutcome === 'loss';

        const { updatedStages: rejectedStages } = applyCorrectionRejected(
            updatedStages,
            activeStageIndex,
            {
                completionDate: judgmentDate,
                notes,
                outcome: judgmentType || undefined,
            },
        );
        updatedStages.splice(0, updatedStages.length, ...rejectedStages);

        const correctionStage = updatedStages[activeStageIndex];
        if (correctionStage) {
            const lastEvent = correctionStage.timeline?.[0];
            if (lastEvent) {
                updatedStages[activeStageIndex] = {
                    ...correctionStage,
                    timeline: [
                        {
                            ...lastEvent,
                            title: clientLost
                                ? '❌ رد طلب التصحيح — حكم نهائي ضد الموكل'
                                : 'رد طلب التصحيح — اكتسب القرار التمييزي الدرجة القطعية',
                            details: clientLost
                                ? `${notes}\n\nرُفض طلب التصحيح.\nأُيد القرار التمييزي واكتسب الدرجة القطعية — نهائي ضد موكلك.\nتم غلق ملف الدعوى.`
                                : `${notes}\n\nرُفض طلب التصحيح.\nأُيد القرار التمييزي واكتسب الدرجة القطعية.\nتم غلق ملف الدعوى.`,
                            color: clientLost ? 'red' : 'gold',
                        },
                        ...(correctionStage.timeline ?? []).slice(1),
                    ],
                };
            }
        }

        setStatus('مكتسبة الدرجة القطعية');
        rt.nextCaseStatus = 'مكتسبة الدرجة القطعية';
        rt.successToast = clientLost
            ? 'خُتمت الإضبارة — رُفض التصحيح والحكم نهائي ضد الموكل'
            : 'رد طلب التصحيح — اكتسب القرار التمييزي الدرجة القطعية';
        SmartToast.success(rt.successToast);
        return;
    }

    if (action === 'final_ratification') {
        rt.handled = true;
        const clientRole = resolveClientAppealRole(currentStage.parties);
        const priorAppealJudgment = resolvePriorAppealJudgmentForCassation(
            updatedStages,
            activeStageIndex,
        );
        const outcome = resolveCassationClientOutcome(
            judgmentType,
            clientRole,
            priorAppealJudgment,
        );
        const clientLost = outcome === 'loss';

        updatedStages[activeStageIndex] = {
            ...currentStage,
            status: 'completed',
            finalDecision: 'مكتسبة الدرجة القطعية',
            decisionDate: judgmentDate,
            isPleadingsClosed: true,
        };

        updatedStages[activeStageIndex].timeline = [{
            id: `cassation_final_${Date.now()}`,
            type: 'milestone',
            date: judgmentDate,
            title: clientLost
                ? 'تصديق الحكم — اكتسب الدرجة القطعية (حكم نهائي ضد الموكل)'
                : 'تم تصديق الحكم واكتساب الدعوى الدرجة القطعية',
            details: clientLost
                ? `${notes}\n\nصدقت محكمة التمييز حكم محكمة الاستئناف.\nالحكم مكتسب الدرجة القطعية — نهائي ضد موكلك.\nتم غلق ملف الدعوى.`
                : `${notes}\n\nصدق محكمة التمييز الحكم المطعون فيه.\nاكتسب الحكم الدرجة القطعية ولا يقبل أي طعن آخر (إلا تصحيح القرار في حالات نادرة).\nتم غلق ملف الدعوى نهائياً.`,
            isNew: true,
            color: clientLost ? 'red' : 'gold',
        }, ...(currentStage.timeline ?? [])];

        setStatus('مكتسبة الدرجة القطعية');
        rt.nextCaseStatus = 'مكتسبة الدرجة القطعية';
        rt.successToast = clientLost
            ? 'خُتمت الإضبارة — الحكم نهائي ضد الموكل'
            : 'تم تصديق الحكم — اكتسب الدرجة القطعية';
        SmartToast.success(rt.successToast);
        return;
    }

    if (action === 'remand_to_lower') {
        rt.handled = true;
        const clientRole = resolveClientAppealRole(currentStage.parties);
        const priorAppealJudgment = resolvePriorAppealJudgmentForCassation(
            updatedStages,
            activeStageIndex,
        );
        const remandTitle = buildCassationRemandTimelineTitle(
            judgmentType,
            clientRole,
            priorAppealJudgment,
        );
        const remandOutcome = resolveCassationClientOutcome(
            judgmentType,
            clientRole,
            priorAppealJudgment,
        );
        const remandTarget = resolveCassationRemandTarget(updatedStages, activeStageIndex);
        const { updatedStages: remandedStages, newActiveIndex, target } = applyCassationRemand(
            updatedStages,
            activeStageIndex,
            {
                remandDate: judgmentDate,
                notes,
                cassationFinalDecision: 'منقوضة ومعادة (بانتظار المرافعة بعد النقض)',
                cassationTimelineEvent: {
                    id: `cassation_remand_${Date.now()}`,
                    type: 'alert',
                    date: judgmentDate,
                    title: remandTitle,
                    details: `${notes}\n\nقررت محكمة التمييز نقض الحكم وإعادة الإضبارة إلى ${remandTarget.stageName}.\nيجب متابعة تحديد موعد المرافعة الجديد لاتباع القرار التمييزي.`,
                    isNew: true,
                    color: remandOutcome === 'remand_favorable' ? 'gold' : 'red',
                },
            },
        );
        updatedStages.splice(0, updatedStages.length, ...remandedStages);
        rt.remandNewActiveIndex = newActiveIndex;
        rt.successToast = cassationRemandSuccessMessage(target);
        return;
    }

    if (action === 'correction_request') {
        rt.handled = true;
        const { updatedStages: openedStages, newActiveIndex } = applyCassationCorrectionOpen(
            updatedStages,
            activeStageIndex,
            {
                judgmentDate,
                judgmentType,
                notes,
            },
        );
        updatedStages.splice(0, updatedStages.length, ...openedStages);
        rt.remandNewActiveIndex = newActiveIndex;
        setStatus('قيد نظر التصحيح التمييزي');
        rt.nextCaseStatus = 'قيد نظر التصحيح التمييزي';
        rt.successToast = 'تم فتح مرحلة تصحيح قرار تمييزي';
        SmartToast.success(rt.successToast);
    }
}
