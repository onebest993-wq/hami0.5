import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';


import {
    interpleaderClientAwaitingOpponentAppeal,
    isInterpleaderJudgmentType,
    resolveInterpleaderDecisionText,
    resolveLawyerJudgmentBucket,
} from '../../../smartFile/interpleaderJudgmentEngine';
import { isPersonalStatusAppealContext } from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import { isAbsentObjectionStageName } from '../../../smartFile/absentJudgmentStageNames';
import { resolveAbsentObjectionAppealRights } from '../../../smartFile/absentJudgmentAppealRights';
import {
    resolveFirstInstanceHadoriAppealRights,
    resolveLawyerSide,
} from '../../../smartFile/judgmentTypes';
import {
    CASSATION_APPEAL_DAYS,
    computeCassationDeadline,
    computeFirstInstanceAppealDeadline,
} from '../../../smartFile/appealDeadlineEngine';
import {
    resolveAppealStageClientOutcome,
    resolveClientAppealRole,
    buildAppealArchiveTimelineTitle,
} from '../../../smartFile/appealStageJudgmentEngine';
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
    const judgmentYmd = String(judgmentDate ?? '').trim().slice(0, 10);
    const cassationDeadline = judgmentYmd ? computeCassationDeadline(judgmentYmd) : addDays(now, CASSATION_APPEAL_DAYS);
    const isPersonalCtx = isPersonalStatusAppealContext(stageName, stages);
    const plaintiffFavorableGhayabi =
        isGhayabi
        && (judgmentType === 'إجابة الدعوى'
            || judgmentType === 'إجابة الدعوى بالكامل'
            || judgmentType === 'رد الدعوى جزئياً'
            || judgmentType === 'إجابة دعوى المدعي (جزئياً)');

    let appealDeadline: string | undefined;
    let awaitingAbsentJudgmentNotification = false;

    const lawyerBucket = resolveLawyerJudgmentBucket(
        parentData.representedParty,
        currentStage.parties,
    );
    const lawyerSide = resolveLawyerSide(parentData.representedParty, currentStage.parties);
    const isAbsentObjectionCtx = isAbsentObjectionStageName(stageName);
    const hadoriRights = isAbsentObjectionCtx
        ? resolveAbsentObjectionAppealRights(judgmentType, currentStage.parties)
        : resolveFirstInstanceHadoriAppealRights(judgmentType, lawyerSide, {
              parties: currentStage.parties,
              representedParty: parentData.representedParty,
          });

    if (
        plaintiffFavorableGhayabi
        && !judgmentData.openObjectionModal
        && hadoriRights.action !== 'wait_opponent'
    ) {
        awaitingAbsentJudgmentNotification = true;
    } else if (
        !isGhayabi
        && judgmentForm === 'حضوري'
        && !isPersonalCtx
        && (stageName.includes('بداءة') || stageName.includes('البداءة'))
    ) {
        appealDeadline = judgmentYmd ? computeFirstInstanceAppealDeadline(judgmentYmd) : undefined;
    }

    let decisionText = `محسومة - بانتظار الطعن (${judgmentType})`;
    if (isInterpleaderJudgmentType(judgmentType)) {
        decisionText = resolveInterpleaderDecisionText(judgmentType, lawyerBucket);
    } else if (plaintiffFavorableGhayabi && awaitingAbsentJudgmentNotification) {
        decisionText = 'حكم غيابي — بانتظار التبليغ والاعتراض';
    } else if (hadoriRights.action === 'wait_opponent') {
        decisionText = isAbsentObjectionCtx
            ? 'تأييد الحكم الغيابي — بانتظار طعن المعترض'
            : 'محسومة لصالح الموكل - بانتظار الطعن';
    } else if (hadoriRights.action === 'self_appeal') {
        decisionText = isAbsentObjectionCtx
            ? 'رفض الاعتراض — يحق لموكلك الطعن'
            : 'محسومة ضد الموكل - يحق لموكلك الطعن';
    } else if (hadoriRights.action === 'both_paths' || judgmentType === 'رد الدعوى جزئياً') {
        decisionText = 'محسومة جزئياً - يحق للطرفين الطعن فيما حُسم عليه';
    } else if (judgmentType === 'رد الدعوى' || judgmentType === 'رد الدعوى كلياً') {
        decisionText = 'محسومة ضد الموكل - بانتظار الطعن';
    }

    const awaitingOpponentAppeal =
        !awaitingAbsentJudgmentNotification
        && (isInterpleaderJudgmentType(judgmentType)
            ? interpleaderClientAwaitingOpponentAppeal(judgmentType, lawyerBucket)
            : hadoriRights.action === 'wait_opponent');

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
            ...(appealDeadline ? { appealDeadline } : {}),
            cassationDeadline,
        },
    };

    const appealDeadlineText = appealDeadline ?? '—';
    const cassationDeadlineText = cassationDeadline;

    // Add timeline event
    updatedStages[activeStageIndex].timeline = [{
        id: `judgment_${Date.now()}`,
        type: 'decision',
        date: judgmentDate,
        title: isAbsentObjectionCtx
            ? `قرار الاعتراض على الحكم الغيابي: ${judgmentType}`
            : `حكم بـ ${judgmentType} (${judgmentForm})`,
        details: `${notes}\n\nالمنطوق: ${judgmentType}\nالشكل: ${judgmentForm}\nالنتيجة للموكل: ${hadoriRights.hint || decisionText}\n\nصدر الحكم وقُفلت المرافعة بانتظار انتهاء المدة القانونية للطعن.\n\nمواعيد الطعن القانونية:\n${
            isPersonalCtx
                ? `- التمييز: حتى ${cassationDeadlineText} (من تاريخ صدور القرار)`
                : `- الاستئناف: حتى ${appealDeadlineText} (15 يوماً من اليوم التالي لصدور القرار)\n- التمييز: حتى ${cassationDeadlineText} (شهر من تاريخ صدور القرار)`
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
    const judgmentYmd = String(judgmentDate ?? '').trim().slice(0, 10);
    const cassationDeadline = judgmentYmd ? computeCassationDeadline(judgmentYmd) : addDays(now, CASSATION_APPEAL_DAYS);
    const clientRole = resolveClientAppealRole(currentStage.parties);
    const appealOutcome = resolveAppealStageClientOutcome(judgmentType, clientRole);

    let decisionText = `محسومة لصالح الموكل - بانتظار التمييز (${judgmentType})`;
    if (appealOutcome === 'win') {
        decisionText = 'محسومة لصالح الموكل - بانتظار تمييز الخصم';
    } else if (appealOutcome === 'partial') {
        decisionText = 'محسومة جزئياً - بانتظار تمييز الخصم أو الطعن';
    } else if (
        judgmentType === 'فسخ الحكم البدائي كلياً'
        || judgmentType === 'فسخ الحكم المستأنف كلياً'
    ) {
        decisionText = 'محسومة لصالح الموكل - بانتظار تمييز الخصم';
    }

    const timelineTitle = buildAppealArchiveTimelineTitle(judgmentType, clientRole, false);

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
            cassationDeadline,
        },
    };

    updatedStages[activeStageIndex].timeline = [{
        id: `judgment_cass_wait_${Date.now()}`,
        type: 'decision',
        date: judgmentDate,
        title: timelineTitle,
        details: `${notes}\n\nصدر الحكم بـ "${judgmentType}".\nالحالة: بانتظار تمييز الخصم.\n\nموعد التمييز: حتى ${cassationDeadline} (شهر من تاريخ صدور القرار)`,
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
    const judgmentYmd = String(judgmentDate ?? '').trim().slice(0, 10);
    const appealDeadline =
        judgmentForm === 'حضوري' && stageName.includes('البداءة') && judgmentYmd
            ? computeFirstInstanceAppealDeadline(judgmentYmd)
            : undefined;
    const cassationDeadline = judgmentYmd ? computeCassationDeadline(judgmentYmd) : addDays(now, CASSATION_APPEAL_DAYS);

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
            ...(appealDeadline ? { appealDeadline } : {}),
            cassationDeadline,
        },
    };

    updatedStages[activeStageIndex].timeline = [{
        id: `judgment_seal_${Date.now()}`,
        type: 'milestone',
        date: judgmentDate,
        title: 'حكم بإجابة الدعوى بالكامل — ختم الإضبارة',
        details: `${notes}\n\nتم كسب الدعوى لصالح الموكل.\nخُتمت الإضبارة — لا مصلحة قانونية للطعن من جانب المدعي.\nيحق للمدعى عليه الطعن تمييزاً حتى ${cassationDeadline}.`,
        isNew: true,
        color: 'emerald',
    }, ...(currentStage.timeline ?? [])];

    setStatus('ختم المرافعة');
    SmartToast.success('تم ختم الإضبارة — كسب الدعوى ✅');
}
}
