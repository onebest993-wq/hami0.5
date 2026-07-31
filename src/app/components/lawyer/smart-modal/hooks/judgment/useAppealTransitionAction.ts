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


import type { UseSmartFileJudgmentActionsOptions } from './judgmentHookTypes';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { buildLawsuitCalendarContext } from '../procedural/lawsuitCalendarContext';
import { mirrorStageLegalDatesToCalendar } from '@/app/services/lawsuitTimelineCalendarMirror';

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
        setShowTransitionModal,
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
    const { appealType, appellant, filingDate, newCaseNumber, notes: appealNotes, includedOpponentPartyIds, includedAppellantPartyIds } = appealData;

    const dossierLayout = resolveAppealDossierLayout(currentStage.parties ?? [], {
        judgmentType,
        representedParty: parentData.representedParty,
        incidentalCases: currentStage.incidentalCases,
        standardAppellantSide: inferAppellantSideFromLawyer(
            parentData.representedParty,
            currentStage.parties,
        ),
    });

    let decisionText = `انتقال لمرحلة ${appealType} (${judgmentType})`;
    let timelineTitle = `➡️ حكم بـ ${judgmentType} والانتقال`;

    if (judgmentType === 'إجابة الدعوى' || judgmentType === 'إجابة الدعوى بالكامل') {
        decisionText = 'إجابة الدعوى (حكم لصالح الموكل)';
        timelineTitle = '✅ حكم بإجابة الدعوى (حكم لصالح الموكل)';
    } else if (judgmentType === 'رد الدعوى' || judgmentType === 'رد الدعوى كلياً') {
        decisionText = 'رد الدعوى (حكم ضد الموكل)';
        timelineTitle = '❌ حكم برد الدعوى (حكم ضد الموكل)';
    } else if (judgmentType === 'رد الدعوى جزئياً') {
        decisionText = 'رد الدعوى جزئياً (حكم جزئي)';
        timelineTitle = '⚠️ حكم برد الدعوى جزئياً';
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
    const stagesForCalendar = mirrorStageLegalDatesToCalendar(updatedStages, activeStageIndex, calCtx);

    setStages(stagesForCalendar);
    setActiveStageIndex(newActiveIndex);
    setViewingStageIndex(newActiveIndex);
    saveToCloud(stagesForCalendar, parentData, newActiveIndex);
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
