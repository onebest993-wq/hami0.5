import type { TimelineEvent } from '../../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';
import {
    applyAppealStageTransition,
} from '../../smartFile/appealStageTransition';
import type {
    AppealTransitionPayload,
} from '../../smartFile/judgmentTypes';
import {
    str,
    resolveFirstInstanceHadoriAppealRights,
    resolveLawyerSide,
} from '../../smartFile/judgmentTypes';
import {
    stageOutcomeFromFirstInstanceRights,
    resolveTransitionPartyIds,
} from '../../smartFile/stageOutcomeResolution';


import { resolveAppealDossierLayout, inferAppellantSideFromLawyer } from '../../smartFile/appealPartyEngine';
import { resolveSelectedOpponentPartyIds } from '../../smartFile/appealPartyListHelpers';
import {
    buildAppealArchiveTimelineTitle,
    resolveAppealStageClientOutcome,
    resolveClientAppealRole,
    toAppealClientOutcome,
} from '../../smartFile/appealStageJudgmentEngine';


import type { UseSmartFileJudgmentActionsOptions } from './judgmentHookTypes';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import { buildLawsuitCalendarContext } from '../procedural/lawsuitCalendarContext';
import { overlayMirrorStageLegalDatesToCalendar } from '@/app/services/lawsuitTimelineCalendarMirrorLazy';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { normalizePersonalStatusAppealMethod } from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import {
    shouldPersistPartyJudgmentStamp,
    stampPartyJudgmentOnStage,
} from '@/app/domain/lawsuit/partyJudgmentDisposition';
import { overlayAppellantLanesAfterAppealHop } from '../../smartFile/appealChallengeTruth';
import { resolveDirectCassationBlockMessage } from '../../smartFile/directCassationGate';
import { buildIndependentChallengeSpawnInput } from '../../smartFile/independentChallengeSpawnApply';
import { inferJudgmentTypeFromStage } from '../../smartFile/inferStageJudgmentType';
import { isAbsentObjectionStageName } from '../../smartFile/absentJudgmentStageNames';
import { resolveAppealTransitionSpawnDecision } from '../../smartFile/appealTransitionSpawnDecision';

export function useAppealTransitionAction(options: UseSmartFileJudgmentActionsOptions) {
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
        setEditingEvent,
        onSpawnIndependentChallengeFile,
        sourceFile,
    } = options;

const handleAppealTransition = (appealData: AppealTransitionPayload) => {
    debug.log('🔄 بدء معالجة الانتقال للطعن:', appealData);

    if (!tempJudgmentData) {
        debug.error('❌ خطأ: لا توجد بيانات حكم مؤقتة');
        return;
    }

    const sourceStageName = String(currentStage.stageName ?? currentStage.name ?? '');
    const judgmentType = isAbsentObjectionStageName(sourceStageName)
        ? inferJudgmentTypeFromStage(currentStage)
        : str(tempJudgmentData.judgmentType);
    const judgmentForm = str(tempJudgmentData.judgmentForm);
    const judgmentDate = str(tempJudgmentData.judgmentDate);
    const judgmentNotes = str(tempJudgmentData.notes);
    const { appealType: rawAppealType, appellant, filingDate, newCaseNumber, notes: appealNotes, newCourt, includedOpponentPartyIds, includedAppellantPartyIds } = appealData;
    const appealType = normalizePersonalStatusAppealMethod(rawAppealType, {
        stageName: currentStage.stageName,
        stages,
    });

    const dossierLayout = resolveAppealDossierLayout(currentStage.parties ?? [], {
        judgmentType,
        representedParty: parentData.representedParty,
        incidentalCases: currentStage.incidentalCases,
        standardAppellantSide: inferAppellantSideFromLawyer(
            parentData.representedParty,
            currentStage.parties,
        ),
    });

    const clientRole = resolveClientAppealRole(currentStage.parties, {
        appealMetadata: currentStage.appealMetadata,
    });
    const appealOutcome = toAppealClientOutcome(
        resolveAppealStageClientOutcome(judgmentType, clientRole),
    );
    const toCassation =
        appealType === 'تمييز' || String(appealType).includes('تمييز');

    const hadoriRights = resolveFirstInstanceHadoriAppealRights(judgmentType, resolveLawyerSide(
        parentData.representedParty,
        currentStage.parties,
    ), {
        parties: currentStage.parties,
        representedParty: parentData.representedParty,
    });
    const priorStageOutcome =
        currentStage.clientStageOutcome
        ?? stageOutcomeFromFirstInstanceRights(hadoriRights, judgmentType);

    const { appellantPartyIds } = resolveTransitionPartyIds(
        currentStage.parties,
        'client_appeal',
        includedAppellantPartyIds,
        includedOpponentPartyIds,
    );
    const opponentPartyIds = resolveSelectedOpponentPartyIds(
        currentStage.parties,
        appellantPartyIds,
        includedOpponentPartyIds,
        currentStage.incidentalCases,
    );

    const directCassationBlock = resolveDirectCassationBlockMessage({
        sourceStageName: sourceStageName,
        appealType,
        lanes: currentStage.partyChallengeLanes,
        partyIds: appellantPartyIds,
        today: getLocalTodayYmd(),
    });
    if (directCassationBlock) {
        SmartToast.error(directCassationBlock);
        return;
    }

    let decisionText = `انتقال لمرحلة ${appealType} (${judgmentType})`;
    let timelineTitle = buildAppealArchiveTimelineTitle(judgmentType, clientRole, toCassation);

    if (judgmentType === 'إجابة الدعوى' || judgmentType === 'إجابة الدعوى بالكامل') {
        decisionText = 'إجابة الدعوى (حكم لصالح الموكل)';
        timelineTitle = '✅ حكم بإجابة الدعوى (حكم لصالح الموكل)';
    } else if (judgmentType === 'رد الدعوى' || judgmentType === 'رد الدعوى كلياً') {
        decisionText = 'رد الدعوى (حكم ضد الموكل)';
        timelineTitle = '❌ حكم برد الدعوى (حكم ضد الموكل)';
    } else if (judgmentType === 'رد الدعوى جزئياً') {
        decisionText = 'رد الدعوى جزئياً (حكم جزئي)';
        timelineTitle = '⚠️ حكم برد الدعوى جزئياً';
    } else if (appealOutcome === 'win') {
        decisionText = `محسومة لصالح الموكل — انتقال لمرحلة ${appealType}`;
    } else if (appealOutcome === 'loss') {
        decisionText = `محسومة ضد الموكل — انتقال لمرحلة ${appealType}`;
    }

    const courtLine = String(newCourt ?? '').trim()
        ? `\n- المحكمة: ${String(newCourt).trim()}`
        : '';

    const archiveJudgmentEvent: TimelineEvent = {
        id: `judgment_${Date.now()}`,
        type: 'decision',
        date: judgmentDate,
        title: timelineTitle,
        details: `${judgmentNotes}\n\n⚖️ صدر الحكم بـ "${judgmentType}".\n➡️ تم الطعن في الحكم والانتقال لمرحلة ${appealType}\n\n📋 تفاصيل الطعن:\n- مقدم الطعن: ${appellant}\n- رقم دعوى ${appealType}: ${newCaseNumber}\n- تاريخ تقديم اللائحة: ${filingDate}${courtLine}\n\n📁 بقيت إضبارة المرحلة السابقة محفوظة ومقفولة.`,
        isNew: true,
    };

    const hopParams = {
        appealType,
        appellant,
        filingDate,
        newCaseNumber,
        newCourt: String(newCourt ?? '').trim(),
        notes: appealNotes,
        archiveTimelineEvent: archiveJudgmentEvent,
        archiveFinalDecision: decisionText,
        archiveDecisionDate: judgmentDate,
        includedOpponentPartyIds: opponentPartyIds,
        includedAppellantPartyIds: appellantPartyIds,
        dossierLayout,
        priorJudgmentType: judgmentType,
        priorStageOutcome: priorStageOutcome ?? undefined,
    };

    const spawnDecision = resolveAppealTransitionSpawnDecision({
        stages,
        currentStage,
        activeStageIndex,
        appealType,
        forceIndependentChallengeSpawn: Boolean(
            tempJudgmentData.forceIndependentChallengeSpawn
            || tempJudgmentData.preferredChallengerPartyId,
        ),
    });

    if (spawnDecision.spawn) {
        const sourceFileId = Number(sourceFile?.id ?? parentData.id);
        if (!onSpawnIndependentChallengeFile) {
            SmartToast.error('تعذّر إنشاء إضبارة طعن مستقلة — المسار غير متصل');
            return;
        }
        const spawn = buildIndependentChallengeSpawnInput({
            sourceFileId,
            stages,
            sourceStageIndex: spawnDecision.sourceStageIndex,
            sourceStage: spawnDecision.sourceStage,
            hop: hopParams,
            sourceFile,
        });
        if ('error' in spawn) {
            SmartToast.error(spawn.error);
            return;
        }
        onSpawnIndependentChallengeFile(spawn);
        setShowAppealTransitionModal(false);
        setTempJudgmentData(null);
        return;
    }

    const { updatedStages: transitionedStages, newActiveIndex } = applyAppealStageTransition(
        stages,
        activeStageIndex,
        currentStage,
        {
            appealType,
            appellant,
            filingDate,
            newCaseNumber,
            newCourt: String(newCourt ?? '').trim(),
            notes: appealNotes,
            archiveTimelineEvent: archiveJudgmentEvent,
            archiveFinalDecision: decisionText,
            archiveDecisionDate: judgmentDate,
            includedOpponentPartyIds: opponentPartyIds,
            includedAppellantPartyIds: appellantPartyIds,
            dossierLayout,
            priorJudgmentType: judgmentType,
            priorStageOutcome: priorStageOutcome ?? undefined,
        },
    );

    let updatedStages = transitionedStages;
    if (
        shouldPersistPartyJudgmentStamp(String(currentStage.stageName ?? currentStage.name ?? ''), tempJudgmentData)
        && updatedStages[activeStageIndex]
    ) {
        updatedStages[activeStageIndex] = stampPartyJudgmentOnStage(
            updatedStages[activeStageIndex],
            tempJudgmentData,
        );
    }
    updatedStages = overlayAppellantLanesAfterAppealHop({
        stages: updatedStages,
        sourceIndex: activeStageIndex,
        destIndex: newActiveIndex,
        appellantPartyIds,
        today: getLocalTodayYmd(),
    });

    const newStage = updatedStages[newActiveIndex];
    debug.log(`📁 تم قفل مرحلة "${currentStage.stageName}" مع الإبقاء على سجلها`);
    debug.log(`✨ تم انقلاب المراكز — مقدم الطعن: ${appellant}`);
    debug.log('👥 الأطراف بعد انقلاب المراكز:', newStage?.parties?.map((p) => `${p.role}: ${p.name}`).join(', '));

    const calCtx = buildLawsuitCalendarContext(parentData, resolveCalendarUserId());
    setEditingEvent?.(null);
    setStages(updatedStages);
    setActiveStageIndex(newActiveIndex);
    setViewingStageIndex(newActiveIndex);
    saveToCloud(updatedStages, parentData, newActiveIndex);
    overlayMirrorStageLegalDatesToCalendar(updatedStages, activeStageIndex, calCtx, (mirrored) => {
        setStages(mirrored);
        saveToCloud(mirrored, parentData, newActiveIndex);
    });
    setShowAppealTransitionModal(false);
    setTempJudgmentData(null);
    setStatus(`مرحلة ${newStage?.stageName ?? appealType}`);

    SmartToast.success(`تم الانتقال لمرحلة ${appealType} — بقيت إضبارة المرحلة السابقة متاحة للعرض`);
    debug.log(`✅ تم الانتقال بنجاح لمرحلة ${appealType} برقم ${newCaseNumber}`);
};


    return {
        handleAppealTransition,
    };
}
