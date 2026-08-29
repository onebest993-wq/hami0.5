import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { syncLawsuitTimelineAppointment } from '@/app/services/calendar/dossierSyncLazy';
import type { TimelineEvent } from '../../../LawyerShared';
import type { UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import {
    stageTimeline,
    ymdPlusDays,
} from '../../smartFile/proceduralTypes';
import {
    ABANDONMENT_REVIEW_DAYS,
    resolveAbandonmentReviewDeadline,
} from '../../smartFile/caseFlowStatusDisplay';
import { buildLawsuitCalendarContext } from './lawsuitCalendarContext';
import {
    isPetitionVoidRevivalExpired,
    PETITION_VOID_APPEAL_DAYS,
    resolvePetitionVoidMenuLabel,
} from '../../smartFile/petitionVoidFlow';

export function useProceduralLifecycleActions(options: UseSmartFileProceduralActionsOptions) {
    const {
        stages,
        setStages,
        activeStageIndex,
        viewingStageIndex,
        currentStage,
        parentData,
        setParentData,
        saveToCloud,
        setStatus,
        setIsPaused,
        setPauseReason,
        setLinkedCaseNo,
        setIsInterrupted,
        setInterruptionData,
        setEditingTask,
        setEditingIncidental,
        setEditingFastTrack,
        setEditingAttachment,
        setEditingEvent,
        setShowFastTrackModal,
        setShowAttachmentModal,
        setShowJudgeRecusalModal,
        setShowTransferJurisdictionModal,
        setShowCaseConsolidationModal,
        setShowMaterialErrorModal,
        setShowPauseModal,
        setShowInterruptionModal,
        setShowResumeInterruptionModal,
        setShowAbandonmentRenewalModal,
        setShowExtraordinaryAppealModal,
        setShowProvisionalOrderModal,
        setShowInterlocutoryModal,
        isPaused,
        pauseReason,
        isInterrupted,
        interruptionData,
        status,
        calendarUserId,
        setAppealOutcomeTask,
    } = options;

    const lawsuitCalendarContext = () => buildLawsuitCalendarContext(parentData, calendarUserId);

const handleAbandonment = () => {
    const updatedStages = [...stages];
    const currentCount = currentStage.abandonmentCount || 0;
    const today = getLocalTodayYmd();
    
    if (currentCount === 0) {
        const reviewDeadline = resolveAbandonmentReviewDeadline(today);
        updatedStages[activeStageIndex] = {
            ...currentStage,
            abandonmentDate: new Date().toISOString(),
            abandonmentCount: 1,
            status: 'active',
        };
        
        updatedStages[activeStageIndex].timeline = [{
            id: `abandon_${Date.now()}`,
            type: 'decision',
            date: today,
            title: 'ترك الدعوى للمراجعة (للمرة الأولى)',
            details: `تم ترك الدعوى للمراجعة. يجب تجديدها خلال ${ABANDONMENT_REVIEW_DAYS} أيام من اليوم التالي. آخر مهلة للتجديد: ${reviewDeadline}`,
            isNew: true
        }, ...(stageTimeline(currentStage) || [])];
        
        setStatus('متروكة للمراجعة');
        SmartToast.warning(
            `تم ترك الدعوى للمراجعة — مهلة التجديد ${ABANDONMENT_REVIEW_DAYS} أيام (حتى ${reviewDeadline})`,
        );
    } else {
        updatedStages[activeStageIndex] = {
            ...currentStage,
            isVoided: true,
            abandonmentDate: undefined,
            status: 'voided',
            isPleadingsClosed: true,
            finalDecision: 'مبطلة — ترك للمراجعة للمرة الثانية',
        };
        
        updatedStages[activeStageIndex].timeline = [{
            id: `void_${Date.now()}`,
            type: 'decision',
            date: today,
            title: 'إبطال عريضة الدعوى',
            details: 'تم إبطال عريضة الدعوى قانوناً لتركها للمراجعة للمرة الثانية.',
            isNew: true
        }, ...(stageTimeline(currentStage) || [])];
        
        setStatus('مبطلة');
        SmartToast.error("تم إبطال عريضة الدعوى قانوناً!");
    }

    setStages(updatedStages);
    saveToCloud(updatedStages);
};

const handleResumeAbandonment = (data?: { nextHearingDate?: string }) => {
    const updatedStages = [...stages];
    const nextHearingDate = String(data?.nextHearingDate ?? '').trim().slice(0, 10);
    const today = getLocalTodayYmd();
    const timelineEvents: TimelineEvent[] = [];

    updatedStages[activeStageIndex] = {
        ...currentStage,
        abandonmentDate: undefined,
        isPleadingsClosed: false,
        status: 'active',
    };

    if (nextHearingDate) {
        timelineEvents.push({
            id: `resume_abandon_hearing_${Date.now()}`,
            type: 'appointment',
            date: nextHearingDate,
            title: 'موعد المرافعة بعد فتح باب المراجعة',
            details: 'موعد المرافعة القادم بعد تجديد الدعوى.',
            isNew: true,
        });
        const ctx = lawsuitCalendarContext();
        if (ctx.fileId) {
            syncLawsuitTimelineAppointment({
                userId: ctx.userId,
                fileId: ctx.fileId,
                event: {
                    id: `appt_resume_abandon_${nextHearingDate}`,
                    date: nextHearingDate,
                    title: 'مرافعة بعد تجديد الدعوى',
                },
                caseNo: ctx.caseNo,
                court: ctx.court,
                parties: ctx.parties,
                clientName: ctx.clientName,
            });
        }
    }

    timelineEvents.push({
        id: `resume_abandon_${Date.now()}`,
        type: 'decision',
        date: today,
        title: 'تجديد الدعوى بعد الترك للمراجعة',
        details: nextHearingDate
            ? `تم تجديد الدعوى وفتح باب المرافعة. موعد المرافعة القادم: ${nextHearingDate}`
            : 'تم تجديد الدعوى بعد تركها للمراجعة.',
        isNew: true
    });

    updatedStages[activeStageIndex].timeline = [
        ...timelineEvents,
        ...(stageTimeline(currentStage) || []),
    ];
    
    setStatus('نشطة');
    setStages(updatedStages);
    saveToCloud(updatedStages);
    setShowAbandonmentRenewalModal?.(false);
    SmartToast.success('تم تجديد الدعوى وفتح باب المرافعة');
};

const handleRegisterPetitionVoid = () => {
    const updatedStages = [...stages];
    const voidLabel = resolvePetitionVoidMenuLabel(currentStage.stageName);
    const today = getLocalTodayYmd();

    updatedStages[activeStageIndex] = {
        ...currentStage,
        isPleadingsClosed: true,
        petitionVoidFlow: {
            status: 'registered',
            voidLabel,
            registeredDate: today,
        },
        timeline: [{
            id: `petition_void_${Date.now()}`,
            type: 'decision',
            date: today,
            title: `⚫ ${voidLabel}`,
            details: 'تم تسجيل إبطال العريضة عبر سير الدعوى. يحق للخصم الطعن في قرار الإبطال.',
            isNew: true,
        }, ...(stageTimeline(currentStage) || [])],
    };

    setStatus('إبطال العريضة — بانتظار الطعن');
    setStages(updatedStages);
    saveToCloud(updatedStages);
    SmartToast.warning('تم تسجيل إبطال العريضة — يمكن تقديم الطعن');
};

const handlePetitionVoidAppeal = () => {
    const flow = currentStage.petitionVoidFlow;
    if (!flow || flow.status !== 'registered') return;

    const updatedStages = [...stages];
    const today = getLocalTodayYmd();

    updatedStages[activeStageIndex] = {
        ...currentStage,
        petitionVoidFlow: {
            ...flow,
            status: 'appeal_pending',
            appealFiledDate: today,
        },
        timeline: [{
            id: `petition_void_appeal_${Date.now()}`,
            type: 'milestone',
            date: today,
            title: '⚖️ تقديم طعن في قرار الإبطال',
            details: 'قُدِّم طعن في قرار إبطال العريضة — سجّل نتيجة الطعن (تأييد أو نقض).',
            isNew: true,
        }, ...(stageTimeline(currentStage) || [])],
    };

    setStatus('طعن في قرار الإبطال');
    setStages(updatedStages);
    saveToCloud(updatedStages);
    SmartToast.info('تم تسجيل الطعن — اختر نتيجة الطعن أدناه');
};

const handlePetitionVoidOutcome = (outcome: 'upheld' | 'quashed') => {
    const flow = currentStage.petitionVoidFlow;
    if (!flow || flow.status !== 'appeal_pending') return;

    const updatedStages = [...stages];
    const today = getLocalTodayYmd();

    if (outcome === 'upheld') {
        updatedStages[activeStageIndex] = {
            ...currentStage,
            isVoided: true,
            status: 'voided',
            isPleadingsClosed: true,
            finalDecision: `${flow.voidLabel} — تأييد الإبطال`,
            petitionVoidFlow: {
                ...flow,
                status: 'upheld_closed',
            },
            timeline: [{
                id: `petition_void_upheld_${Date.now()}`,
                type: 'decision',
                date: today,
                title: '✅ تأييد قرار إبطال العريضة',
                details: 'أيدت محكمة الطعن قرار الإبطال — أُغلقت الإضبارة نهائياً.',
                isNew: true,
            }, ...(stageTimeline(currentStage) || [])],
        };
        setStatus('مبطلة');
        SmartToast.error('تأييد الإبطال — أُغلقت الإضبارة');
    } else {
        const revivalDeadline = ymdPlusDays(today, PETITION_VOID_APPEAL_DAYS);
        updatedStages[activeStageIndex] = {
            ...currentStage,
            isPleadingsClosed: false,
            wasReopened: true,
            finalDecision: null,
            decisionDate: null,
            isVoided: false,
            status: 'active',
            petitionVoidFlow: {
                ...flow,
                status: 'quash_revived',
                revivalDeadline,
            },
            legalTimers: {
                ...currentStage.legalTimers,
                finalAppealDeadline: revivalDeadline,
            },
            timeline: [{
                id: `petition_void_quash_${Date.now()}`,
                type: 'milestone',
                date: today,
                title: '↩️ نقض قرار الإبطال — إحياء الإضbارة',
                details: `نُقض قرار الإبطال وأُحييت الإضبارة لمدة ${PETITION_VOID_APPEAL_DAYS} أيام فقط. بعد انتهاء المهلة يُعتبر متنازلاً عن الطعن.`,
                isNew: true,
            }, ...(stageTimeline(currentStage) || [])],
        };
        setStatus('نشطة');
        SmartToast.success(`نقض الإبطال — الإضبارة حية ${PETITION_VOID_APPEAL_DAYS} أيام`);
    }

    setStages(updatedStages);
    saveToCloud(updatedStages);
};

const handlePetitionVoidWaiver = () => {
    const flow = currentStage.petitionVoidFlow;
    if (!flow || flow.status !== 'quash_revived') return;
    if (!isPetitionVoidRevivalExpired(flow)) return;

    const updatedStages = [...stages];
    const today = getLocalTodayYmd();

    updatedStages[activeStageIndex] = {
        ...currentStage,
        isPleadingsClosed: true,
        isVoided: true,
        status: 'voided',
        finalDecision: `${flow.voidLabel} — سقوط الطعن لانتهاء المهلة`,
        petitionVoidFlow: {
            ...flow,
            status: 'waived',
        },
        timeline: [{
            id: `petition_void_waived_${Date.now()}`,
            type: 'decision',
            date: today,
            title: '⏱️ سقوط الطعن — انتهاء المهلة',
            details: `انتهت مهلة ${PETITION_VOID_APPEAL_DAYS} أيام بعد نقض الإبطال — يُعتبر متنازلاً عن الطعن.`,
            isNew: true,
        }, ...(stageTimeline(currentStage) || [])],
    };

    setStatus('مبطلة');
    setStages(updatedStages);
    saveToCloud(updatedStages);
    SmartToast.error('انتهت مهلة الطعن — سقوط الحق في الطعن');
};

    return {
        handleAbandonment,
        handleResumeAbandonment,
        handleRegisterPetitionVoid,
        handlePetitionVoidAppeal,
        handlePetitionVoidOutcome,
        handlePetitionVoidWaiver,
    };
}
