import { useCallback } from 'react';
import type { CaseStage, TimelineEvent } from '../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { patchActiveStage } from '../smartFile/stageMutations';
import { syncLawsuitTimelineAppointment } from '@/app/services/calendarDossierSync';

type SaveToCloud = (updatedStages: CaseStage[]) => void;

export function useSmartFileDefaultJudgmentActions(options: {
    stages: CaseStage[];
    setStages: React.Dispatch<React.SetStateAction<CaseStage[]>>;
    activeStageIndex: number;
    currentStage: CaseStage;
    saveToCloud: SaveToCloud;
    setShowObjectionRegistrationModal: (v: boolean) => void;
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
        currentStage,
        saveToCloud,
        setShowObjectionRegistrationModal,
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
    };

    const commit = useCallback(
        (updated: CaseStage[]) => {
            setStages(updated);
            saveToCloud(updated);
        },
        [setStages, saveToCloud],
    );

    const handleDefaultObjection = useCallback(() => {
        setShowObjectionRegistrationModal(true);
    }, [setShowObjectionRegistrationModal]);

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
            timeline,
        });
        commit(updated);
        SmartToast.info('تم تجاوز مرحلة الاعتراض. يمكنك الآن تقديم الطعن 🔓');
    }, [stages, activeStageIndex, stageExt.timeline, commit]);

    const handleRegisterObjection = useCallback(
        (data: { objectionDate: string; sessionDate: string; receiptNumber: string }) => {
            const { objectionDate, sessionDate, receiptNumber } = data;
            const baseName = String(stageExt.stageName ?? '').split(' (')[0];

            let timeline: TimelineEvent[] = [
                {
                    id: `reg_obj_${Date.now()}`,
                    type: 'decision',
                    date: objectionDate,
                    title: '🛡️ تسجيل اعتراض غيابي',
                    details: `تم تقديم الاعتراض الغيابي وتحديد موعد الجلسة الأولى بتاريخ ${sessionDate}.\nرقم الوصل: ${receiptNumber || 'غير مدخل'}`,
                    isNew: true,
                },
                ...(stageExt.timeline ?? []),
            ];

            const apptId = `appt_obj_${Date.now()}`;
            timeline = [
                {
                    id: apptId,
                    type: 'appointment',
                    date: sessionDate,
                    title: 'جلسة مرافعة (اعتراض غيابي)',
                    details: 'نظر الاعتراض الغيابي',
                    isNew: true,
                },
                ...timeline,
            ];

            const updated = patchActiveStage(stages, activeStageIndex, {
                isPleadingsClosed: false,
                stageName: `${baseName} (اعتراض غيابي)`,
                status: 'active',
                isUnderObjection: true,
                timeline,
            });
            commit(updated);
            if (lawsuitFileId != null) {
                syncLawsuitTimelineAppointment({
                    userId: calendarUserId,
                    fileId: lawsuitFileId,
                    event: {
                        id: apptId,
                        date: sessionDate,
                        title: 'جلسة مرافعة (اعتراض غيابي)',
                        details: 'نظر الاعتراض الغيابي',
                    },
                    caseNo,
                    court,
                    parties,
                    clientName,
                });
            }
            SmartToast.success('تم بدء مرافعة الاعتراض الغيابي بنجاح ✅');
        },
        [
            stages,
            activeStageIndex,
            stageExt.stageName,
            stageExt.timeline,
            commit,
            calendarUserId,
            lawsuitFileId,
            caseNo,
            court,
            parties,
            clientName,
        ],
    );

    const handleObjectionJudgment = useCallback(
        (data: { outcome: string; details: string }) => {
            const { outcome, details } = data;
            const now = getLocalTodayYmd();

            let decisionTitle = 'قرار حكم في الاعتراض';
            let decisionText = '';
            const newStatus = 'completed';
            let newJudgmentForm = stageExt.judgmentForm;

            switch (outcome) {
                case 'rejected_formally':
                    decisionTitle = 'رد الاعتراض شكلاً';
                    decisionText = 'رد الاعتراض شكلاً وتأييد الحكم الغيابي.';
                    newJudgmentForm = 'حضوري (تأييد الغيابي)';
                    break;
                case 'petition_nullified':
                    decisionTitle = 'إبطال عريضة الاعتراض';
                    decisionText = 'إبطال عريضة الاعتراض لعدم الحضور/الترك.';
                    newJudgmentForm = 'حضوري (تأييد الغيابي)';
                    break;
                case 'upheld':
                    decisionTitle = 'قبول شكلاً وتأييد الحكم';
                    decisionText = 'قبول الاعتراض شكلاً ورده موضوعاً وتأييد الحكم الغيابي.';
                    newJudgmentForm = 'حضوري (تأييد الغيابي)';
                    break;
                case 'cancelled_new_judgment':
                    decisionTitle = 'إلغاء الحكم الغيابي';
                    decisionText = 'إلغاء الحكم الغيابي وإصدار حكم جديد.';
                    newJudgmentForm = 'حضوري';
                    break;
            }

            const timeline = [
                {
                    id: `judg_obj_${Date.now()}`,
                    type: 'decision' as const,
                    date: now,
                    title: `⚖️ ${decisionTitle}`,
                    details: `${details || decisionText}\n\n(أصبحت الدعوى قابلة للطعن حسب الطرق القانونية)`,
                    isSystemLog: true,
                    isNew: true,
                },
                ...(stageExt.timeline ?? []),
            ];

            const updated = patchActiveStage(stages, activeStageIndex, {
                isPleadingsClosed: true,
                status: newStatus,
                finalDecision: decisionText,
                judgmentForm: newJudgmentForm,
                isUnderObjection: false,
                timeline,
            });
            commit(updated);
            SmartToast.success('تم حسم الاعتراض الغيابي وإصدار القرار ⚖️');
        },
        [stages, activeStageIndex, stageExt.judgmentForm, stageExt.timeline, commit],
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
        handleRegisterObjection,
        handleObjectionJudgment,
        handleOtherAppeals,
    };
}
