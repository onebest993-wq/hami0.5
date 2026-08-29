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
} from '../../smartFile/judgmentTypes';


import { resolveAppealDossierLayout, inferAppellantSideFromLawyer } from '../../smartFile/appealPartyEngine';
import {
    buildAppealArchiveTimelineTitle,
    resolveAppealStageClientOutcome,
    resolveClientAppealRole,
} from '../../smartFile/appealStageJudgmentEngine';


import type { UseSmartFileJudgmentActionsOptions } from './judgmentHookTypes';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import { buildLawsuitCalendarContext } from '../procedural/lawsuitCalendarContext';
import { overlayMirrorStageLegalDatesToCalendar } from '@/app/services/lawsuitTimelineCalendarMirrorLazy';
import { normalizePersonalStatusAppealMethod } from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';

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
    } = options;

const handleAppealTransition = (appealData: AppealTransitionPayload) => {
    debug.log('🔄 بدء معالجة الانتقال للطعن:', appealData);

    if (!tempJudgmentData) {
        debug.error('❌ خطأ: لا توجد بيانات حكم مؤقتة');
        return;
    }

    const judgmentType = str(tempJudgmentData.judgmentType);
    const judgmentForm = str(tempJudgmentData.judgmentForm);
    const judgmentDate = str(tempJudgmentData.judgmentDate);
    const judgmentNotes = str(tempJudgmentData.notes);
    const { appealType: rawAppealType, appellant, filingDate, newCaseNumber, notes: appealNotes, includedOpponentPartyIds, includedAppellantPartyIds } = appealData;
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

    const clientRole = resolveClientAppealRole(currentStage.parties);
    const appealOutcome = resolveAppealStageClientOutcome(judgmentType, clientRole);
    const toCassation =
        appealType === 'تمييز' || String(appealType).includes('تمييز');

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

    const archiveJudgmentEvent: TimelineEvent = {
        id: `judgment_${Date.now()}`,
        type: 'decision',
        date: judgmentDate,
        title: timelineTitle,
        details: `${judgmentNotes}\n\n⚖️ صدر الحكم بـ "${judgmentType}".\n➡️ تم الطعن في الحكم والانتقال لمرحلة ${appealType}\n\n📋 تفاصيل الطعن:\n- مقدم الطعن: ${appellant}\n- رقم دعوى ${appealType}: ${newCaseNumber}\n- تاريخ تقديم اللائحة: ${filingDate}\n\n📁 بقيت إضبارة المرحلة السابقة محفوظة ومقفولة.`,
        isNew: true,
    };

    const { updatedStages, newActiveIndex } = applyAppealStageTransition(
        stages,
        activeStageIndex,
        currentStage,
        {
            appealType,
            appellant,
            filingDate,
            newCaseNumber,
            notes: appealNotes,
            archiveTimelineEvent: archiveJudgmentEvent,
            archiveFinalDecision: decisionText,
            archiveDecisionDate: judgmentDate,
            includedOpponentPartyIds,
            includedAppellantPartyIds,
            dossierLayout,
            priorJudgmentType: judgmentType,
        },
    );

    const newStage = updatedStages[newActiveIndex];
    debug.log(`📁 تم قفل مرحلة "${currentStage.stageName}" مع الإبقاء على سجلها`);
    debug.log(`✨ تم انقلاب المراكز — مقدم الطعن: ${appellant}`);
    debug.log('👥 الأطراف بعد انقلاب المراكز:', newStage?.parties?.map((p) => `${p.role}: ${p.name}`).join(', '));

    const calCtx = buildLawsuitCalendarContext(parentData, resolveCalendarUserId());
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
