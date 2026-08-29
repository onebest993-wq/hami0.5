import { getLocalTodayYmd } from '@/app/utils/localYmd';
import type { CaseStage, TimelineEvent } from '../../LawyerShared';
import { resolveCorrectionAcceptReturnTargetStageIndex } from './extraordinaryAppealGateway';
import {
    collectTransferableAttachments,
    stageLabel,
} from './appealStageTransitionShared';

type CassationCorrectionOpenParams = {
    judgmentDate: string;
    judgmentType?: string;
    notes?: string;
};

/** فتح مرحلة «تصحيح قرار» بعد قفل التمييز — مرة واحدة. */
export function applyCassationCorrectionOpen(
    stages: CaseStage[],
    cassationStageIndex: number,
    params: CassationCorrectionOpenParams,
): { updatedStages: CaseStage[]; newActiveIndex: number } {
    const updatedStages = [...stages];
    const currentStage = updatedStages[cassationStageIndex];
    if (!currentStage) {
        throw new Error('applyCassationCorrectionOpen: cassation stage not found');
    }

    const now = params.judgmentDate || getLocalTodayYmd();
    const notes = String(params.notes ?? '').trim();
    const stageName = stageLabel(currentStage);
    const finalDecision =
        String(params.judgmentType ?? '').trim()
        || String(currentStage.finalDecision ?? '').trim()
        || 'مكتسبة الدرجة القطعية';

    const archiveEvent: TimelineEvent = {
        id: `cassation_correction_archive_${Date.now()}`,
        type: 'milestone',
        date: now,
        title: `🔒 أُقفلت إضبارة ${stageName} — طلب تصحيح القرار`,
        details: notes
            ? `${notes}\n\n➡️ فتح مرحلة تصحيح قرار تمييزي.`
            : '➡️ فتح مرحلة تصحيح قرار تمييزي.',
        isSystemLog: true,
        isNew: true,
    };

    updatedStages[cassationStageIndex] = {
        ...currentStage,
        status: 'completed',
        isPleadingsClosed: true,
        awaitingOpponentAppeal: false,
        finalDecision,
        decisionDate: now,
        timeline: [archiveEvent, ...(currentStage.timeline ?? [])],
    };

    const openingEvent: TimelineEvent = {
        id: `cassation_correction_open_${Date.now()}`,
        type: 'milestone',
        date: now,
        title: '📝 فتح مرحلة تصحيح قرار تمييزي',
        details: notes
            ? `${notes}\n\n⏳ بانتظار نتيجة التدقيق في محكمة التمييز.`
            : '⏳ بانتظار نتيجة التدقيق في محكمة التمييز.',
        isNew: true,
    };

    const transferredAttachments = collectTransferableAttachments(currentStage.attachments);
    const correctionStageName = 'تصحيح قرار';
    const newStage: CaseStage = {
        id: `stage_correction_${Date.now()}`,
        name: correctionStageName,
        stageName: correctionStageName,
        type: currentStage.type,
        docType: currentStage.docType,
        claimValue: currentStage.claimValue,
        caseNo: currentStage.caseNo,
        court: currentStage.court || 'محكمة التمييز الاتحادية',
        judge: '',
        parties: currentStage.parties ?? [],
        timeline: [openingEvent],
        attachments: transferredAttachments,
        tasks: [],
        incidentalCases: currentStage.incidentalCases,
        provisionalOrders: [],
        thirdParties: [],
        createdDate: now,
        finalDecision: null,
        decisionDate: null,
        status: 'active',
        isPleadingsClosed: false,
        awaitingOpponentAppeal: false,
        wasReopened: false,
        extraordinaryAppealType: 'تصحيح القرار التمييزي',
        firstInstanceCaseNumber: currentStage.firstInstanceCaseNumber,
        firstInstanceCourt: currentStage.firstInstanceCourt,
    };

    updatedStages.push(newStage);

    return {
        updatedStages,
        newActiveIndex: updatedStages.length - 1,
    };
}

type CorrectionCompleteParams = {
    completionDate?: string;
    notes?: string;
    outcome?: string;
};

/** إتمام مرحلة التصحيح والعودة لآخر مرحلة تقاضٍ (استئناف أو بداءة). */
export function applyCorrectionComplete(
    stages: CaseStage[],
    correctionStageIndex: number,
    params?: CorrectionCompleteParams,
): { updatedStages: CaseStage[]; newActiveIndex: number; targetStageName: string } {
    const updatedStages = [...stages];
    const correctionStage = updatedStages[correctionStageIndex];
    if (!correctionStage) {
        throw new Error('applyCorrectionComplete: correction stage not found');
    }

    const now = params?.completionDate ?? getLocalTodayYmd();
    const notes = String(params?.notes ?? '').trim();
    const outcome = String(params?.outcome ?? '').trim() || 'تم البت في طلب التصحيح';

    const completeEvent: TimelineEvent = {
        id: `correction_complete_${Date.now()}`,
        type: 'milestone',
        date: now,
        title: '✅ اكتملت مرحلة تصحيح القرار',
        details: notes ? `${outcome}\n\n${notes}` : outcome,
        isNew: true,
    };

    updatedStages[correctionStageIndex] = {
        ...correctionStage,
        status: 'completed',
        isPleadingsClosed: true,
        finalDecision: outcome,
        decisionDate: now,
        timeline: [completeEvent, ...(correctionStage.timeline ?? [])],
    };

    const targetIndex = resolveCorrectionAcceptReturnTargetStageIndex(updatedStages);
    const targetStage = updatedStages[targetIndex];
    if (!targetStage) {
        throw new Error('applyCorrectionComplete: litigation target stage missing');
    }

    const targetName = stageLabel(targetStage);
    const returnEvent: TimelineEvent = {
        id: `correction_return_${Date.now()}`,
        type: 'milestone',
        date: now,
        title: `↩️ العودة لمرحلة ${targetName} بعد التصحيح`,
        details: `استئناف السير في مرحلة ${targetName} وفق نتيجة طلب التصحيح.`,
        isNew: true,
    };

    updatedStages[targetIndex] = {
        ...targetStage,
        status: 'active',
        isPleadingsClosed: false,
        awaitingOpponentAppeal: false,
        finalDecision: null,
        decisionDate: null,
        wasReopened: true,
        timeline: [returnEvent, ...(targetStage.timeline ?? [])],
    };

    return {
        updatedStages,
        newActiveIndex: targetIndex,
        targetStageName: targetName,
    };
}

const CORRECTION_JUDGMENT_REJECTED = 'رد طلب التصحيح';

/** رد طلب التصحيح — يُؤيد القرار التمييزي ويُقفل الإضبارة نهائياً. */
export function applyCorrectionRejected(
    stages: CaseStage[],
    correctionStageIndex: number,
    params?: CorrectionCompleteParams,
): { updatedStages: CaseStage[] } {
    const updatedStages = [...stages];
    const correctionStage = updatedStages[correctionStageIndex];
    if (!correctionStage) {
        throw new Error('applyCorrectionRejected: correction stage not found');
    }

    const now = params?.completionDate ?? getLocalTodayYmd();
    const notes = String(params?.notes ?? '').trim();
    const outcome = String(params?.outcome ?? '').trim() || CORRECTION_JUDGMENT_REJECTED;
    const finalDecision = 'مكتسبة الدرجة القطعية';

    const rejectEvent: TimelineEvent = {
        id: `correction_rejected_${Date.now()}`,
        type: 'milestone',
        date: now,
        title: '❌ رد طلب التصحيح — اكتسب القرار التمييزي الدرجة القطعية',
        details: notes
            ? `${outcome}\n\n${notes}\n\nتم تأييد القرار التمييزي وإغلاق الإضبارة نهائياً.`
            : `${outcome}\n\nتم تأييد القرار التمييزي وإغلاق الإضبارة نهائياً.`,
        isNew: true,
        color: 'gold',
    };

    updatedStages[correctionStageIndex] = {
        ...correctionStage,
        status: 'completed',
        isPleadingsClosed: true,
        awaitingOpponentAppeal: false,
        finalDecision: `${outcome} — ${finalDecision}`,
        decisionDate: now,
        timeline: [rejectEvent, ...(correctionStage.timeline ?? [])],
    };

    return { updatedStages };
}
