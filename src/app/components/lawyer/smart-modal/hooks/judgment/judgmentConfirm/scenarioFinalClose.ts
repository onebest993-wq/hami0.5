import { debug } from '@/app/utils/debug';
import {
    resolveFirstInstanceHadoriAppealRights,
    resolveLawyerSide,
} from '../../../smartFile/judgmentTypes';
import {
    stageOutcomeFromFirstInstanceRights,
    withClientStageOutcome,
} from '../../../smartFile/stageOutcomeResolution';

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
    const lawyerSide = resolveLawyerSide(parentData.representedParty, currentStage.parties);
    const hadoriRights = resolveFirstInstanceHadoriAppealRights(judgmentType, lawyerSide, {
        parties: currentStage.parties,
        representedParty: parentData.representedParty,
    });
    const clientStageOutcome =
        stageOutcomeFromFirstInstanceRights(hadoriRights, judgmentType) ?? 'LOSS';

    updatedStages[activeStageIndex] = withClientStageOutcome(
        {
            ...currentStage,
            status: 'completed',
            finalDecision: 'منتهية نهائياً (30 يوم للطعن)',
            decisionDate: judgmentDate,
            legalTimers: {
                finalAppealDeadline: addDays(now, 30),
            },
        },
        clientStageOutcome,
    );

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
