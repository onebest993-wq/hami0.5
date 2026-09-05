import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';
import { formatDateToLocalYmd } from '@/app/utils/localYmd';


import {
    interpleaderClientAwaitingOpponentAppeal,
    isInterpleaderJudgmentType,
    resolveInterpleaderDecisionText,
    resolveLawyerJudgmentBucket,
} from '../../../smartFile/interpleaderJudgmentEngine';
import { isPersonalStatusAppealContext } from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import { isAbsentObjectionStageName } from '../../../smartFile/absentJudgmentStageNames';
import { isAppealStageName, isCassationStageName } from '../../../smartFile/judgmentStageNames';
import { resolveAbsentObjectionAppealRights, resolveAbsentObjectionWaitDecisionText } from '../../../smartFile/absentJudgmentAppealRights';
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
    toAppealClientOutcome,
} from '../../../smartFile/appealStageJudgmentEngine';
import {
    stageOutcomeFromFirstInstanceRights,
    withClientStageOutcome,
} from '../../../smartFile/stageOutcomeResolution';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from './judgmentConfirmTypes';
import {
    coerceJudgmentTypeForReleasedOperatives,
    formatPartyJudgmentOutcomeSummary,
    formatPartyJudgmentPresenceSummary,
    JUDGMENT_FORM_GHIABI,
    listJudgmentDispositionDefendants,
    normalizePartyJudgmentDispositions,
    parseDisputeIntegrity,
    resolveJudgmentPresenceWindows,
    seedPartyJudgmentDispositions,
    toLegacyLastJudgmentType,
} from '@/app/domain/lawsuit/partyJudgmentDisposition';
import {
    attachPartyChallengeLanes,
    hasUnservedGhayabiLane,
} from '@/app/domain/lawsuit/partyChallengeLanes';

export function applyWaitAppealScenarios(scope: JudgmentConfirmScope, rt: JudgmentConfirmRuntime): void {
    const { currentStage, activeStageIndex, parentData, stages, setStatus, setActiveStageIndex } = scope;
    const {
        judgmentData,
        action,
        judgmentForm,
        judgmentDate,
        notes,
        nextStage,
        now,
        stageName,
        addDays,
        updatedStages,
    } = rt;
    let judgmentType = rt.judgmentType;

if (action === 'waiting_for_appeal') {
    rt.handled = true;
    const isAbsentObjectionCtx = isAbsentObjectionStageName(stageName);
    const isAppellatePresenceCtx = isAppealStageName(stageName) || isCassationStageName(stageName);
    const effectiveForm = isAbsentObjectionCtx || isAppellatePresenceCtx ? 'حضوري' : judgmentForm;
    const dispositions = isAbsentObjectionCtx || isAppellatePresenceCtx
        ? []
        : normalizePartyJudgmentDispositions(judgmentData.partyJudgmentDispositions);
    judgmentType = coerceJudgmentTypeForReleasedOperatives(rt.judgmentType, dispositions);
    rt.judgmentType = judgmentType;
    const windows = resolveJudgmentPresenceWindows(dispositions, effectiveForm);
    const laneDispositions =
        dispositions.length > 0
        || isAbsentObjectionCtx
        || isAppellatePresenceCtx
        || !windows.hasGhayabi
        || windows.mixed
            ? dispositions
            : seedPartyJudgmentDispositions(
                listJudgmentDispositionDefendants(currentStage.parties ?? []),
                JUDGMENT_FORM_GHIABI,
            );
    const judgmentYmd = String(judgmentDate ?? '').trim().slice(0, 10);
    const cassationDeadline = judgmentYmd ? computeCassationDeadline(judgmentYmd) : addDays(now, CASSATION_APPEAL_DAYS);
    const isPersonalCtx = isPersonalStatusAppealContext(stageName, stages, parentData);
    const plaintiffFavorableGhayabi =
        windows.hasGhayabi
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
    const hadoriRights = isAbsentObjectionCtx
        ? resolveAbsentObjectionAppealRights(judgmentType, currentStage.parties)
        : resolveFirstInstanceHadoriAppealRights(judgmentType, lawyerSide, {
              parties: currentStage.parties,
              representedParty: parentData.representedParty,
          });

    if (
        plaintiffFavorableGhayabi
        && !judgmentData.openObjectionModal
    ) {
        awaitingAbsentJudgmentNotification = true;
    }
    if (
        windows.hasHadari
        && !isPersonalCtx
        && (
            isAbsentObjectionCtx
            || stageName.includes('بداءة')
            || stageName.includes('البداءة')
        )
    ) {
        appealDeadline = judgmentYmd ? computeFirstInstanceAppealDeadline(judgmentYmd) : undefined;
    }

    const objectionDecisionText = isAbsentObjectionCtx
        ? resolveAbsentObjectionWaitDecisionText(judgmentType, hadoriRights.action)
        : null;

    let decisionText = `محسومة - بانتظار الطعن (${judgmentType})`;
    if (isInterpleaderJudgmentType(judgmentType)) {
        decisionText = resolveInterpleaderDecisionText(judgmentType, lawyerBucket);
    } else if (plaintiffFavorableGhayabi && awaitingAbsentJudgmentNotification && windows.mixed) {
        decisionText = 'بانتظار التبليغ والطعن';
    } else if (plaintiffFavorableGhayabi && awaitingAbsentJudgmentNotification) {
        decisionText = 'حكم غيابي — بانتظار التبليغ والاعتراض';
    } else if (objectionDecisionText) {
        decisionText = objectionDecisionText;
    } else if (hadoriRights.action === 'wait_opponent') {
        decisionText = 'محسومة لصالح الموكل - بانتظار الطعن';
    } else if (hadoriRights.action === 'self_appeal') {
        decisionText = 'محسومة ضد الموكل - يحق لموكلك الطعن';
    } else if (hadoriRights.action === 'both_paths' || judgmentType === 'رد الدعوى جزئياً') {
        decisionText = 'محسومة جزئياً - يحق للطرفين الطعن فيما حُسم عليه';
    } else if (judgmentType === 'رد الدعوى' || judgmentType === 'رد الدعوى كلياً') {
        decisionText = 'محسومة ضد الموكل - بانتظار الطعن';
    }

    const awaitingOpponentAppeal =
        isInterpleaderJudgmentType(judgmentType)
            ? interpleaderClientAwaitingOpponentAppeal(judgmentType, lawyerBucket)
            : (
                hadoriRights.action === 'wait_opponent'
                || hadoriRights.action === 'both_paths'
              )
              && judgmentType !== 'رد الاعتراض شكلاً';

    const clientStageOutcome = stageOutcomeFromFirstInstanceRights(hadoriRights, judgmentType);
    const laneIntegrity =
        parseDisputeIntegrity(judgmentData.disputeIntegrity)
        ?? currentStage.disputeIntegrity
        ?? 'indivisible';
    const lapseToday =
        typeof rt.now === 'string'
            ? String(rt.now).slice(0, 10)
            : formatDateToLocalYmd(rt.now);
    const seededLanes = attachPartyChallengeLanes(currentStage, {
        dispositions: laneDispositions,
        judgmentDate: judgmentYmd,
        integrity: laneIntegrity,
        today: lapseToday,
        judgmentForm: windows.summary,
    }).partyChallengeLanes;
    if (windows.hasGhayabi && hasUnservedGhayabiLane(seededLanes)) {
        awaitingAbsentJudgmentNotification = true;
    }

    updatedStages[activeStageIndex] = attachPartyChallengeLanes(
        withClientStageOutcome(
        {
        ...currentStage,
        status: 'active',
        finalDecision: decisionText,
        judgmentForm: windows.summary,
        lastJudgmentType: toLegacyLastJudgmentType(windows.summary),
        ...(laneDispositions.length > 0 ? { partyJudgmentDispositions: laneDispositions } : {}),
        disputeIntegrity: laneIntegrity,
        decisionDate: judgmentDate,
        isPleadingsClosed: true,
        awaitingOpponentAppeal,
        awaitingAbsentJudgmentNotification,
        appealDeadline: appealDeadline,
        legalTimers: {
            ...(appealDeadline ? { appealDeadline } : {}),
            cassationDeadline,
        },
        },
        clientStageOutcome,
        ),
        {
            dispositions: laneDispositions,
            existing: seededLanes,
            judgmentDate: judgmentYmd,
            integrity: laneIntegrity,
            today: lapseToday,
            judgmentForm: windows.summary,
        },
    );

    const outcomeBlock = formatPartyJudgmentOutcomeSummary(
        currentStage.parties,
        laneDispositions.length > 0 ? laneDispositions : currentStage.partyJudgmentDispositions,
    );
    const presenceLine = formatPartyJudgmentPresenceSummary(
        currentStage.parties,
        laneDispositions.length > 0 ? laneDispositions : currentStage.partyJudgmentDispositions,
    );
    const formLine = outcomeBlock
        ? `النتيجة:\n${outcomeBlock}`
        : presenceLine
          ? `الصفة: ${presenceLine}`
          : windows.summary && windows.summary !== 'مختلط'
            ? `الشكل: ${windows.summary}`
            : '';
    updatedStages[activeStageIndex].timeline = [{
        id: `judgment_${Date.now()}`,
        type: 'decision',
        date: judgmentDate,
        title: isAbsentObjectionCtx
            ? `قرار الاعتراض على الحكم الغيابي: ${judgmentType}`
            : `حكم بـ ${judgmentType}`,
        details: `${notes}\n\nالمنطوق: ${judgmentType}${formLine ? `\n${formLine}` : ''}`.trim(),
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
    const clientRole = resolveClientAppealRole(currentStage.parties, {
        appealMetadata: currentStage.appealMetadata,
    });
    const appealStageOutcome = resolveAppealStageClientOutcome(judgmentType, clientRole);
    const appealOutcomeLegacy = toAppealClientOutcome(appealStageOutcome);

    let decisionText = `محسومة — بانتظار التمييز (${judgmentType})`;
    let awaitingOpponentAppeal = false;
    if (appealOutcomeLegacy === 'win') {
        decisionText = 'محسومة لصالح الموكل - بانتظار تمييز الخصم';
        awaitingOpponentAppeal = true;
    } else if (appealOutcomeLegacy === 'loss') {
        decisionText = 'محسومة ضد الموكل - يحق لموكلك التمييز';
        awaitingOpponentAppeal = false;
    } else if (appealOutcomeLegacy === 'partial') {
        decisionText = 'محسومة جزئياً - يحق للطرفين التمييز فيما حُسم';
        awaitingOpponentAppeal = false;
    }

    const timelineTitle = buildAppealArchiveTimelineTitle(judgmentType, clientRole, false);

    const cassationLayerName = String(currentStage.stageName ?? currentStage.name ?? stageName ?? '');
    const appellatePresence = isAppealStageName(cassationLayerName) || isCassationStageName(cassationLayerName);
    const recordedForm = appellatePresence
        ? 'حضوري'
        : (judgmentForm === 'غيابي' || judgmentForm === 'حضوري' ? judgmentForm : undefined);

    updatedStages[activeStageIndex] = withClientStageOutcome(
        {
            ...currentStage,
            status: 'active',
            finalDecision: decisionText,
            judgmentForm: recordedForm,
            lastJudgmentType: recordedForm === 'حضوري' || recordedForm === 'غيابي' ? recordedForm : undefined,
            decisionDate: judgmentDate,
            isPleadingsClosed: true,
            awaitingOpponentAppeal,
            legalTimers: {
                cassationDeadline,
            },
        },
        appealStageOutcome,
    );

    updatedStages[activeStageIndex].timeline = [{
        id: `judgment_cass_wait_${Date.now()}`,
        type: 'decision',
        date: judgmentDate,
        title: timelineTitle,
        details: awaitingOpponentAppeal
            ? `${notes}\n\nصدر الحكم بـ "${judgmentType}".\nالحالة: بانتظار تمييز الخصم.`
            : `${notes}\n\nصدر الحكم بـ "${judgmentType}".\nالحالة: يحق لموكلك التمييز.`,
        isNew: true,
    }, ...(currentStage.timeline ?? [])];

    setStatus(awaitingOpponentAppeal ? 'بانتظار التمييز' : 'يحق التمييز');
    rt.successToast = awaitingOpponentAppeal
        ? 'تم حفظ القرار — بانتظار تمييز الخصم ⏳'
        : 'تم حفظ القرار — يحق لموكلك التمييز';

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

    updatedStages[activeStageIndex] = withClientStageOutcome(
        {
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
        },
        'WIN',
    );

    updatedStages[activeStageIndex].timeline = [{
        id: `judgment_seal_${Date.now()}`,
        type: 'milestone',
        date: judgmentDate,
        title: 'حكم بإجابة الدعوى بالكامل — ختم الإضبارة',
        details: `${notes}\n\nتم كسب الدعوى لصالح الموكل.\nخُتمت الإضبارة — لا مصلحة قانونية للطعن من جانب المدعي.`,
        isNew: true,
        color: 'emerald',
    }, ...(currentStage.timeline ?? [])];

    setStatus('ختم المرافعة');
    SmartToast.success('تم ختم الإضبارة — كسب الدعوى ✅');
}
}
