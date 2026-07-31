import { SmartToast } from '@/app/components/ui/SmartToast';

import {
    applyCassationRemand,
    applyCassationCorrectionOpen,
    applyCorrectionComplete,
    cassationRemandSuccessMessage,
    resolveCassationRemandTarget,
} from '../../../smartFile/appealStageTransition';
import { isCassationCorrectionStageName } from '../../../smartFile/extraordinaryAppealGateway';
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
        rt.successToast = `تم إتمام التصحيح والعودة لمرحلة ${targetStageName}`;
        SmartToast.success(rt.successToast);
        return;
    }

    if (action === 'final_ratification') {
        rt.handled = true;
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
            title: 'تم تصديق الحكم واكتساب الدعوى الدرجة القطعية',
            details: `${notes}\n\nصدق محكمة التمييز الحكم المطعون فيه.\nاكتسب الحكم الدرجة القطعية ولا يقبل أي طعن آخر (إلا تصحيح القرار في حالات نادرة).\nتم غلق ملف الدعوى نهائياً.`,
            isNew: true,
            color: 'gold',
        }, ...(currentStage.timeline ?? [])];

        setStatus('مكتسبة الدرجة القطعية');
        rt.nextCaseStatus = 'مكتسبة الدرجة القطعية';
        SmartToast.success('تم تصديق الحكم — اكتسب الدرجة القطعية');
        return;
    }

    if (action === 'remand_to_lower') {
        rt.handled = true;
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
                    title: 'تم نقض الحكم التمييزي وإعادة الإضبارة',
                    details: `${notes}\n\nقررت محكمة التمييز نقض الحكم وإعادة الإضبارة إلى ${remandTarget.stageName}.\nيجب متابعة تحديد موعد المرافعة الجديد لاتباع القرار التمييزي.`,
                    isNew: true,
                    color: 'red',
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
