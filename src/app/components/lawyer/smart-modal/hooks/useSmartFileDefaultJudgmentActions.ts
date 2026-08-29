import { useCallback } from 'react';
import type { CaseStage, TimelineEvent } from '../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { patchActiveStage } from '../smartFile/stageMutations';
import { syncLawsuitTimelineAppointment } from '@/app/services/calendar/dossierSyncLazy';
import {
    ABSENT_JUDGMENT_OBJECTION_DAYS,
    computeAbsentObjectionDeadline,
} from '../smartFile/absentJudgmentFlow';
import { openAbsentObjectionStage } from '../smartFile/absentObjectionStageOpen';

type SaveToCloud = (
    updatedStages: CaseStage[],
    updatedParent?: unknown,
    stageIndex?: number,
) => void;

export function useSmartFileDefaultJudgmentActions(options: {
    stages: CaseStage[];
    setStages: React.Dispatch<React.SetStateAction<CaseStage[]>>;
    activeStageIndex: number;
    setActiveStageIndex: React.Dispatch<React.SetStateAction<number>>;
    setViewingStageIndex: React.Dispatch<React.SetStateAction<number>>;
    currentStage: CaseStage;
    saveToCloud: SaveToCloud;
    setStatus: React.Dispatch<React.SetStateAction<string>>;
    setShowObjectionRegistrationModal: (v: boolean) => void;
    setShowAbsentJudgmentNotificationModal: (v: boolean) => void;
    setShowOpponentAbsentObjectionModal: (v: boolean) => void;
    calendarUserId?: string | null;
    lawsuitFileId?: string | number;
    caseNo?: string;
    court?: string;
    parties?: unknown;
    clientName?: string;
}) {
    const {
        stages,
        setStages,
        activeStageIndex,
        setActiveStageIndex,
        setViewingStageIndex,
        currentStage,
        saveToCloud,
        setStatus,
        setShowObjectionRegistrationModal,
        setShowAbsentJudgmentNotificationModal,
        setShowOpponentAbsentObjectionModal,
        calendarUserId,
        lawsuitFileId,
        caseNo,
        court,
        parties,
        clientName,
    } = options;

    const stageExt = currentStage as CaseStage & {
        stageName?: string;
        timeline?: TimelineEvent[];
        judgmentForm?: string;
        legalTimers?: CaseStage['legalTimers'];
    };

    const commit = useCallback(
        (updated: CaseStage[], stageIndex?: number) => {
            setStages(updated);
            saveToCloud(updated, undefined, stageIndex);
        },
        [setStages, saveToCloud],
    );

    const handleDefaultObjection = useCallback(() => {
        setShowObjectionRegistrationModal(true);
    }, [setShowObjectionRegistrationModal]);

    const handleOpenAbsentJudgmentNotification = useCallback(() => {
        setShowAbsentJudgmentNotificationModal(true);
    }, [setShowAbsentJudgmentNotificationModal]);

    const handleOpenOpponentAbsentObjection = useCallback(() => {
        setShowOpponentAbsentObjectionModal(true);
    }, [setShowOpponentAbsentObjectionModal]);

    const handleAbsentJudgmentNotification = useCallback(
        (data: { notificationDate: string }) => {
            const { notificationDate } = data;
            const objectionDeadline = computeAbsentObjectionDeadline(notificationDate);

            const timeline: TimelineEvent[] = [
                {
                    id: `abs_notif_${Date.now()}`,
                    type: 'decision',
                    date: notificationDate,
                    title: '📬 التبليغ بالحكم الغيابي',
                    details: `تم تسجيل تبليغ الحكم الغيابي بتاريخ ${notificationDate}.\nمهلة الاعتراض: ${ABSENT_JUDGMENT_OBJECTION_DAYS} أيام من تاريخ التبليغ — تنتهي في ${objectionDeadline}.`,
                    isSystemLog: true,
                    isNew: true,
                },
                ...(stageExt.timeline ?? []),
            ];

            const updated = patchActiveStage(stages, activeStageIndex, {
                absentJudgmentNotificationDate: notificationDate,
                awaitingAbsentJudgmentNotification: false,
                appealDeadline: objectionDeadline,
                finalDecision: 'حكم غيابي — بانتظار اعتراض المدعى عليه',
                legalTimers: {
                    ...(stageExt.legalTimers ?? {}),
                    defaultObjectionDeadline: objectionDeadline,
                },
                timeline,
            });
            commit(updated);
            SmartToast.success('تم تسجيل التبليغ — بدأ احتساب مهلة الاعتراض ⏳');
        },
        [stages, activeStageIndex, stageExt.timeline, stageExt.legalTimers, commit],
    );

    const handleOpponentAbsentObjection = useCallback(
        (data: { newCaseNumber: string; filingDate: string }) => {
            const { newCaseNumber, filingDate } = data;
            const archiveEvent: TimelineEvent = {
                id: `opp_abs_obj_${Date.now()}`,
                type: 'decision',
                date: filingDate,
                title: '🛡️ اعتراض المدعى عليه بالحكم الغيابي',
                details: `قام المدعى عليه بالاعتراض على الحكم الغيابي.\nتاريخ التقديم: ${filingDate}`,
                isNew: true,
            };

            const { updatedStages, newActiveIndex } = openAbsentObjectionStage({
                stages,
                activeStageIndex,
                currentStage,
                filingDate,
                sourceCaseNo: currentStage.caseNo ?? caseNo,
                newCaseNumber,
                archiveTimelineEvent: archiveEvent,
                archiveFinalDecision: 'حكم غيابي — اعترض المدعى عليه',
                archiveDecisionDate: stageExt.decisionDate ?? filingDate,
            });

            const newStage = updatedStages[newActiveIndex];
            setStages(updatedStages);
            setActiveStageIndex(newActiveIndex);
            setViewingStageIndex(newActiveIndex);
            saveToCloud(updatedStages, undefined, newActiveIndex);
            setStatus(`مرحلة ${newStage?.stageName ?? 'الاعتراض على الحكم الغيابي'}`);
            SmartToast.success(`تم فتح إضبارة ${newStage?.stageName ?? 'الاعتراض'} — انقلاب المراكز القانونية ✅`);
        },
        [
            stages,
            activeStageIndex,
            currentStage,
            caseNo,
            stageExt.decisionDate,
            setStages,
            setActiveStageIndex,
            setViewingStageIndex,
            saveToCloud,
            setStatus,
        ],
    );

    const handleOpponentAppealWaived = useCallback(() => {
        const today = getLocalTodayYmd();
        const timeline: TimelineEvent[] = [
            {
                id: `opp_waive_${Date.now()}`,
                type: 'decision',
                date: today,
                title: 'سقوط حق الخصم في الاستئناف',
                details:
                    'انتهت مهلة الاستئناف (15 يوماً من اليوم التالي لصدور القرار) دون تقديم طعن من الخصم — اكتسب الحكم الدرجة القطعية.',
                isSystemLog: true,
                isNew: true,
            },
            ...(stageExt.timeline ?? []),
        ];

        const updated = patchActiveStage(stages, activeStageIndex, {
            status: 'completed',
            finalDecision: 'مكتسبة الدرجة القطعية — لم يطعن الخصم بالاستئناف',
            awaitingOpponentAppeal: false,
            timeline,
        });
        commit(updated);
        setStatus('مكتسبة الدرجة القطعية');
        SmartToast.success('تم تثبيت سقوط حق الاستئناف — الحكم مكتسب الدرجة القطعية');
    }, [stages, activeStageIndex, stageExt.timeline, commit, setStatus]);

    const handleWaiveObjection = useCallback(() => {
        const timeline = [
            {
                id: `waive_obj_${Date.now()}`,
                type: 'decision' as const,
                date: getLocalTodayYmd(),
                title: '⏭️ ترك الحكم الغيابي',
                details:
                    'تم اختيار ترك الحكم غيابياً وتجاوز مرحلة الاعتراض لغرض الطعن الاستئنافي/التمييزي مباشرة.',
                isSystemLog: true,
                isNew: true,
            },
            ...(stageExt.timeline ?? []),
        ];

        const updated = patchActiveStage(stages, activeStageIndex, {
            judgmentForm: 'غيابي (تم ترك حق الاعتراض)',
            lastJudgmentType: 'غيابي (متروك)',
            awaitingAbsentJudgmentNotification: false,
            timeline,
        });
        commit(updated);
        SmartToast.info('تم تجاوز مرحلة الاعتراض. يمكنك الآن تقديم الطعن 🔓');
    }, [stages, activeStageIndex, stageExt.timeline, commit]);

    const handleRegisterObjection = useCallback(
        (data: { objectionDate: string; sessionDate: string; receiptNumber: string }) => {
            const { objectionDate, sessionDate } = data;
            const archiveEvent: TimelineEvent = {
                id: `reg_obj_${Date.now()}`,
                type: 'decision',
                date: objectionDate,
                title: '🛡️ تسجيل اعتراض غيابي',
                details: `تم تقديم الاعتراض الغيابي وتحديد موعد الجلسة الأولى بتاريخ ${sessionDate}.`,
                isNew: true,
            };

            const { updatedStages, newActiveIndex, resolvedCaseNumber, sessionEventId } =
                openAbsentObjectionStage({
                    stages,
                    activeStageIndex,
                    currentStage,
                    filingDate: objectionDate,
                    sourceCaseNo: currentStage.caseNo ?? caseNo,
                    archiveTimelineEvent: archiveEvent,
                    archiveFinalDecision: 'حكم غيابي — اعترض المدعى عليه',
                    archiveDecisionDate: stageExt.decisionDate ?? objectionDate,
                    sessionDate,
                });

            const newStage = updatedStages[newActiveIndex];
            setStages(updatedStages);
            setActiveStageIndex(newActiveIndex);
            setViewingStageIndex(newActiveIndex);
            saveToCloud(updatedStages, undefined, newActiveIndex);
            setStatus(`مرحلة ${newStage?.stageName ?? 'الاعتراض على الحكم الغيابي'}`);

            if (lawsuitFileId != null && sessionEventId) {
                syncLawsuitTimelineAppointment({
                    userId: calendarUserId,
                    fileId: lawsuitFileId,
                    event: {
                        id: sessionEventId,
                        date: sessionDate,
                        title: 'جلسة مرافعة (اعتراض غيابي)',
                        details: 'نظر الاعتراض الغيابي',
                    },
                    caseNo: resolvedCaseNumber || caseNo,
                    court,
                    parties,
                    clientName,
                });
            }
            SmartToast.success(
                `تم فتح إضبارة ${newStage?.stageName ?? 'الاعتراض'} — انقلاب المراكز القانونية ✅`,
            );
        },
        [
            stages,
            activeStageIndex,
            currentStage,
            caseNo,
            stageExt.decisionDate,
            setStages,
            setActiveStageIndex,
            setViewingStageIndex,
            saveToCloud,
            setStatus,
            calendarUserId,
            lawsuitFileId,
            court,
            parties,
            clientName,
        ],
    );

    const handleOtherAppeals = useCallback(() => {
        const updated = patchActiveStage(stages, activeStageIndex, {
            isPleadingsClosed: false,
            status: 'active',
        });
        commit(updated);
        SmartToast.info('تم فك قفل الدعوى. يرجى تسجيل مرحلة الطعن يدوياً 🔓');
    }, [stages, activeStageIndex, commit]);

    return {
        handleDefaultObjection,
        handleWaiveObjection,
        handleOpponentAppealWaived,
        handleRegisterObjection,
        handleOtherAppeals,
        handleOpenAbsentJudgmentNotification,
        handleAbsentJudgmentNotification,
        handleOpenOpponentAbsentObjection,
        handleOpponentAbsentObjection,
    };
}
