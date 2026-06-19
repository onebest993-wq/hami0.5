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

export function applyFinalCloseScenario(scope: JudgmentConfirmScope, rt: JudgmentConfirmRuntime): void {
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

if (action === 'final_close') {
    rt.handled = true;
    updatedStages[activeStageIndex] = {
        ...currentStage,
        status: 'completed',
        finalDecision: 'منتهية نهائياً (30 يوم للطعن)',
        decisionDate: judgmentDate,
        // ✨ INJECT FINAL APPEAL TIMER
        legalTimers: {
            finalAppealDeadline: addDays(now, 30)
        }
    };

    updatedStages[activeStageIndex].timeline = [{
        id: `judgment_${Date.now()}`,
        type: 'decision',
        date: judgmentDate,
        title: '🛑 انتهاء الدعوى نهائياً (حكم برد الدعوى)',
        details: `${notes}\n\n❌ تم رد الدعوى.\n⚠️ الدعوى في مرحلة الإغلاق النهائي.\n\n⏰ مدة 30 يوماً للطعن تبدأ من تاريخ الحكم.\n📅 الموعد النهائي للطعن: ${addDays(now, 30)}\n\n🔒 سيتم إغلاق الملف نهائياً بعد انقضاء المدة القانونية.`,
        isNew: true
    }, ...(currentStage.timeline ?? [])];

    // Also update the PARENT status
    setStatus('منتهية');

    debug.log(`🛑 الدعوى منتهية نهائياً. موعد الطعن النهائي: ${addDays(now, 30)}`);
}
}
