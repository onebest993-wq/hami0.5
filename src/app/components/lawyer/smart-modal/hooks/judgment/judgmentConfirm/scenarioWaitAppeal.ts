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
import { isPersonalStatusStageName } from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import { applyCassationRemand, cassationRemandSuccessMessage, resolveCassationRemandTarget } from '../../../smartFile/appealStageTransition';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from './judgmentConfirmTypes';

export function applyWaitAppealScenarios(scope: JudgmentConfirmScope, rt: JudgmentConfirmRuntime): void {
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

if (action === 'waiting_for_appeal') {
    rt.handled = true;
    const isGhayabi = judgmentForm === 'غيابي';
    const plaintiffFavorableGhayabi =
        isGhayabi
        && (judgmentType === 'إجابة الدعوى'
            || judgmentType === 'إجابة الدعوى بالكامل'
            || judgmentType === 'رد الدعوى جزئياً'
            || judgmentType === 'إجابة دعوى المدعي (جزئياً)');

    let appealDeadline: string | undefined;
    let awaitingAbsentJudgmentNotification = false;

    if (plaintiffFavorableGhayabi && !judgmentData.openObjectionModal) {
        awaitingAbsentJudgmentNotification = true;
    } else if (isGhayabi) {
        appealDeadline = addDays(now, 10);
    } else if (judgmentForm === 'حضوري' && (stageName.includes('بداءة') || isPersonalStatusStageName(stageName))) {
        appealDeadline = addDays(now, 15);
    }

    const lawyerBucket = resolveLawyerJudgmentBucket(
        parentData.representedParty,
        currentStage.parties,
    );

    let decisionText = `محسومة - بانتظار الطعن (${judgmentType})`;
    if (isInterpleaderJudgmentType(judgmentType)) {
        decisionText = resolveInterpleaderDecisionText(judgmentType, lawyerBucket);
    } else if (plaintiffFavorableGhayabi && awaitingAbsentJudgmentNotification) {
        decisionText = 'حكم غيابي — بانتظار التبليغ والاعتراض';
    } else if (judgmentType === 'إجابة الدعوى' || judgmentType === 'إجابة الدعوى بالكامل') {
        decisionText = 'محسومة لصالح الموكل - بانتظار الطعن';
    } else if (judgmentType === 'رد الدعوى' || judgmentType === 'رد الدعوى كلياً') {
        decisionText = 'محسومة ضد الموكل - بانتظار الطعن';
    } else if (judgmentType === 'رد الدعوى جزئياً') {
        decisionText = 'محسومة جزئياً - بانتظار الطعن';
    }

    const awaitingOpponentAppeal =
        !awaitingAbsentJudgmentNotification
        && (isInterpleaderJudgmentType(judgmentType)
            ? interpleaderClientAwaitingOpponentAppeal(judgmentType, lawyerBucket)
            : judgmentType === 'إجابة الدعوى' || judgmentType === 'إجابة الدعوى بالكامل');

    updatedStages[activeStageIndex] = {
        ...currentStage,
        status: 'active',
        finalDecision: decisionText,
        judgmentForm:
            judgmentForm === 'غيابي' || judgmentForm === 'حضوري'
                ? judgmentForm
                : undefined,
        lastJudgmentType:
            judgmentForm === 'غيابي' || judgmentForm === 'حضوري'
                ? judgmentForm
                : undefined,
        decisionDate: judgmentDate,
        isPleadingsClosed: true,
        awaitingOpponentAppeal,
        awaitingAbsentJudgmentNotification,
        appealDeadline: appealDeadline,
        legalTimers: {
            appealDeadline: appealDeadline || addDays(now, 15),
            cassationDeadline: addDays(now, 30),
            defaultObjectionDeadline:
                isGhayabi && !awaitingAbsentJudgmentNotification
                    ? appealDeadline
                    : undefined,
        },
    };

    // Add timeline event
    updatedStages[activeStageIndex].timeline = [{
        id: `judgment_${Date.now()}`,
        type: 'decision',
        date: judgmentDate,
        title: `✅ حكم بـ ${judgmentType} (${judgmentForm})`,
        details: `${notes}\n\n⚖️ صدر الحكم بـ "${judgmentType}".\n⏳ الحالة: بانتظار انتهاء المدة القانونية للطعن.\n\n📅 مواعيد الطعن القانونية:\n${
            isPersonalStatusStageName(stageName)
                ? `- التمييز: متاح حتى ${addDays(now, 30)}`
                : `- الاستئناف: متاح حتى ${addDays(now, 15)}\n- التمييز: متاح حتى ${addDays(now, 30)}`
        }`,
        isNew: true
    }, ...(currentStage.timeline ?? [])];

    debug.log(`✅ المرحلة "${stageName}" محسومة: "${decisionText}"`);

    setStatus('بانتظار الطعن');
    rt.successToast = 'تم حفظ الحكم — بانتظار طعن الخصم ⏳';

    if (judgmentData.openObjectionModal) {
        rt.openObjectionModalAfterSave = true;
    }
    if (judgmentData.openRegisterOpponentAppealModal) {
        rt.openAppealModalAfterSave = true;
    }
}

// ========================================
// SCENARIO 1a: انتظار تمييز الخصم (بعد كسب الاستئناف)
// ========================================
else if (action === 'waiting_for_cassation') {
    rt.handled = true;

    let decisionText = `محسومة لصالح الموكل - بانتظار التمييز (${judgmentType})`;
    if (judgmentType === 'فسخ الحكم المستأنف كلياً') {
        decisionText = 'محسومة لصالح الموكل - بانتظار تمييز الخصم';
    }

    updatedStages[activeStageIndex] = {
        ...currentStage,
        status: 'active',
        finalDecision: decisionText,
        judgmentForm:
            judgmentForm === 'غيابي' || judgmentForm === 'حضوري' ? judgmentForm : undefined,
        lastJudgmentType:
            judgmentForm === 'غيابي' || judgmentForm === 'حضوري' ? judgmentForm : undefined,
        decisionDate: judgmentDate,
        isPleadingsClosed: true,
        awaitingOpponentAppeal: true,
        legalTimers: {
            cassationDeadline: addDays(now, 30),
        },
    };

    updatedStages[activeStageIndex].timeline = [{
        id: `judgment_cass_wait_${Date.now()}`,
        type: 'decision',
        date: judgmentDate,
        title: `✅ حكم بـ ${judgmentType}`,
        details: `${notes}\n\n⚖️ صدر الحكم بـ "${judgmentType}".\n⏳ الحالة: بانتظار تمييز الخصم.\n\n📅 موعد التمييز: متاح حتى ${addDays(now, 30)}`,
        isNew: true,
    }, ...(currentStage.timeline ?? [])];

    setStatus('بانتظار التمييز');
    rt.successToast = 'تم حفظ القرار — بانتظار تمييز الخصم ⏳';

    if (judgmentData.openRegisterOpponentAppealModal) {
        rt.openAppealModalAfterSave = true;
    }
}

// ========================================
// SCENARIO 1b: ختم لصالح المدعي — لا حق للطعن (وكيل المدعي)
// ========================================
else if (action === 'seal_plaintiff_win') {
    rt.handled = true;
    let appealDeadline: string | undefined;
    if (judgmentForm === 'حضوري' && stageName.includes('البداءة')) {
        appealDeadline = addDays(now, 15);
    }

    const decisionText = 'إجابة الدعوى بالكامل — ختم الإضبارة (لا حق للطعن)';

    updatedStages[activeStageIndex] = {
        ...currentStage,
        status: 'completed',
        finalDecision: decisionText,
        judgmentForm:
            judgmentForm === 'غيابي' || judgmentForm === 'حضوري' ? judgmentForm : undefined,
        lastJudgmentType:
            judgmentForm === 'غيابي' || judgmentForm === 'حضوري' ? judgmentForm : undefined,
        decisionDate: judgmentDate,
        isPleadingsClosed: true,
        appealDeadline,
        legalTimers: {
            appealDeadline: appealDeadline || addDays(now, 15),
            cassationDeadline: addDays(now, 30),
        },
    };

    updatedStages[activeStageIndex].timeline = [{
        id: `judgment_seal_${Date.now()}`,
        type: 'milestone',
        date: judgmentDate,
        title: '✅ حكم بإجابة الدعوى بالكامل — ختم الإضبارة',
        details: `${notes}\n\n🏛️ تم كسب الدعوى لصالح الموكل.\n🔒 خُتمت الإضبارة — لا مصلحة قانونية للطعن من جانب المدعي.\n⏳ يحق للمدعى عليه الطعن تمييزاً خلال المدة القانونية.`,
        isNew: true,
        color: 'emerald',
    }, ...(currentStage.timeline ?? [])];

    setStatus('ختم المرافعة');
    SmartToast.success('تم ختم الإضبارة — كسب الدعوى ✅');
}
}
