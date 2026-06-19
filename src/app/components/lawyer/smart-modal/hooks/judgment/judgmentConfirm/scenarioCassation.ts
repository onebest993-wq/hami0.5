import type { Party } from '../../../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    isSulhJudgmentType,
    JUDGMENT_TYPE_PETITION_NULLIFIED_LEGACY,
    JUDGMENT_TYPE_WAIVER,
} from '../../../smartFile/judgmentTypes';
import {
    interpleaderClientAwaitingOpponentAppeal,
    isInterpleaderJudgmentType,
    resolveInterpleaderDecisionText,
    resolveLawyerJudgmentBucket,
} from '../../../smartFile/interpleaderJudgmentEngine';
import { applyCassationRemand, cassationRemandSuccessMessage, resolveCassationRemandTarget } from '../../../smartFile/appealStageTransition';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from './judgmentConfirmTypes';

export function applyCassationScenarios(scope: JudgmentConfirmScope, rt: JudgmentConfirmRuntime): void {
    const { currentStage, activeStageIndex, parentData, stages, setStatus, setActiveStageIndex } = scope;
    const {
        judgmentData,
        action,
        judgmentType,
        judgmentForm,
        judgmentDate,
        notes,
        nextStage,
        now,
        stageName,
        addDays,
        updatedStages,
    } = rt;

if (action === 'final_ratification') {
    rt.handled = true;
    updatedStages[activeStageIndex] = {
        ...currentStage,
        status: 'completed', // Locked and done
        finalDecision: 'مكتسبة الدرجة القطعية',
        decisionDate: judgmentDate,
        isPleadingsClosed: true
    };

    updatedStages[activeStageIndex].timeline = [{
        id: `cassation_final_${Date.now()}`,
        type: 'milestone', // Golden event
        date: judgmentDate,
        title: '🏛️ تم تصديق الحكم واكتساب الدعوى الدرجة القطعية',
        details: `${notes}\n\n🎉 صدق محكمة التمييز الحكم المطعون فيه.\n✅ اكتسب الحكم الدرجة القطعية ولا يقبل أي طعن آخر (إلا تصحيح القرار في حالات نادرة).\n🔒 تم غلق ملف الدعوى نهائياً.`,
        isNew: true,
        color: 'gold' // Make it shine
    }, ...(currentStage.timeline ?? [])];
    
    // Also update the PARENT status
    setStatus('مكتسبة الدرجة القطعية');
    
    SmartToast.success("مبروك! اكتسب الحكم الدرجة القطعية");
}

// ========================================
// SCENARIO 7: CASSATION - REMAND (نقض وإعادة)
// ========================================
else if (action === 'remand_to_lower') {
    rt.handled = true;
    const remandTarget = resolveCassationRemandTarget(stages, activeStageIndex);
    const { updatedStages: remandedStages, newActiveIndex, target } = applyCassationRemand(
        stages,
        activeStageIndex,
        {
            remandDate: judgmentDate,
            notes,
            cassationFinalDecision: 'منقوضة ومعادة (بانتظار المرافعة بعد النقض)',
            cassationTimelineEvent: {
                id: `cassation_remand_${Date.now()}`,
                type: 'alert',
                date: judgmentDate,
                title: '⚠️ تم نقض الحكم التمييزي وإعادة الإضبارة',
                details: `${notes}\n\n↩️ قررت محكمة التمييز نقض الحكم وإعادة الإضبارة إلى ${remandTarget.stageName}.\n📢 يجب متابعة تحديد موعد المرافعة الجديد لاتباع القرار التمييزي.`,
                isNew: true,
                color: 'red',
            },
        },
    );
    updatedStages.splice(0, updatedStages.length, ...remandedStages);
    rt.remandNewActiveIndex = newActiveIndex;
    rt.successToast = cassationRemandSuccessMessage(target);
}

// ========================================
// SCENARIO 8: CASSATION - CORRECTION REQUEST (تصحيح القرار)
// ========================================
else if (action === 'correction_request') {
    rt.handled = true;
     // Just a timeline event, stage remains active/waiting
    updatedStages[activeStageIndex].timeline = [{
        id: `cassation_correction_${Date.now()}`,
        type: 'milestone',
        date: judgmentDate,
        title: '📝 تم تقديم طلب تصحيح قرار تمييزي',
        details: `${notes}\n\n⚠️ تم تقديم طلب لتصحيح الخطأ القانوني في القرار التمييزي.\n⏳ بانتظار نتيجة التدقيق.`,
        isNew: true,
        color: 'blue'
    }, ...(currentStage.timeline ?? [])];
    
    SmartToast.info("تم تسجيل طلب تصحيح القرار");
}
}
