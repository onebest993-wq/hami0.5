import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { addCalendarDaysYmd } from '@/app/utils/executionYmdCalendar';
import type { UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import { stageTasks, stageTimeline } from '../../smartFile/proceduralTypes';
import {
    hasBlockingCourtReferral,
    mergeDraftIntoPendingStage,
    inferCourtReferralAcceptance,
    type PendingCourtReferral,
} from '@/app/domain/lawsuit/courtReferral';
import { replaceStageAt } from '../../smartFile/stageImmutable';

export function createProceduralIncidentalJurisdictionHandlers(
    options: UseSmartFileProceduralActionsOptions,
) {
    const {
        stages,
        setStages,
        activeStageIndex,
        parentData,
        saveToCloud,
        setShowJudgeRecusalModal,
        setShowTransferJurisdictionModal,
    } = options;

    // 🔥 NEW: COMMAND CENTER HANDLERS - Procedural Maneuvers & Lifecycle

    const handleJudgeRecusal = (data: { reason: string; requestDate: string }) => {
        const currentStage = stages[activeStageIndex];
        if (!currentStage) return;

        const nextStage = {
            ...currentStage,
            isJudgeRecusalPending: true,
            judgeRecusalData: data,
            timeline: [
                {
                    id: `judge_recusal_${Date.now()}`,
                    type: 'alert' as const,
                    date: data.requestDate,
                    title: '🛑 تم تقديم طلب رد القاضي - الدعوى مجمدة',
                    details: `السبب: ${data.reason}\n\n⚠️ الدعوى قيد التجميد حتى البت في طلب الرد.`,
                    isNew: true,
                    color: 'rose',
                },
                ...(stageTimeline(currentStage) || []),
            ],
            tasks: [
                {
                    id: `task_recusal_${Date.now()}`,
                    title: '⏳ متابعة طلب رد القاضي - الدعوى مجمدة',
                    dueDate: addCalendarDaysYmd(getLocalTodayYmd(), 7),
                    isCompleted: false,
                    priority: 'high' as const,
                    isNew: true,
                },
                ...(stageTasks(currentStage) || []),
            ],
        };
        const updatedStages = replaceStageAt(stages, activeStageIndex, nextStage);
        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.info('تم تجميد الدعوى - قيد نظر طلب الرد 🛑');
        setShowJudgeRecusalModal(false);
    };

    const handleTransferJurisdiction = (data: {
        newCourt: string;
        transferDate: string;
        notes: string;
    }): boolean => {
        const prevStage = stages[activeStageIndex];
        if (!prevStage) return false;
        const newCourt = data.newCourt.trim();
        const previousCourt = String(prevStage.court ?? parentData.court ?? '').trim();

        if (hasBlockingCourtReferral(prevStage)) {
            SmartToast.error('يوجد إحالة لم تُستكمل — أكمل قبول المحكمة المحال إليها أو ارفضها');
            return false;
        }

        const nextStage = {
            ...prevStage,
            previousCourtName: previousCourt,
            referredToCourt: newCourt,
            courtReferralDate: data.transferDate,
            courtReferralNotes: data.notes.trim() || undefined,
            courtReferralAcceptance: 'pending',
            timeline: [
                {
                    id: `transfer_${Date.now()}`,
                    type: 'milestone',
                    date: data.transferDate,
                    title: `🔀 إحالة لعدم الاختصاص → ${newCourt}`,
                    details: [
                        previousCourt ? `المحكمة السابقة: ${previousCourt}` : '',
                        `المحكمة المحال إليها: ${newCourt}`,
                        data.notes ? `السبب: ${data.notes}` : '',
                    ]
                        .filter(Boolean)
                        .join('\n'),
                    isNew: true,
                    color: 'purple',
                },
                ...stageTimeline(prevStage),
            ],
        };

        const updatedStages = replaceStageAt(stages, activeStageIndex, nextStage);
        setStages(updatedStages);
        saveToCloud(updatedStages);
        return true;
    };

    const handleCourtReferralAcceptance = (data: {
        decision: 'accept' | 'reject';
        decisionDate: string;
        notes?: string;
        draft?: PendingCourtReferral | null;
    }) => {
        let savedStages: typeof stages | null = null;

        setStages((prevStages) => {
            let prevStage = { ...(prevStages[activeStageIndex] ?? {}) };

            if (data.draft) {
                prevStage = mergeDraftIntoPendingStage(prevStage, data.draft);
            }

            const referred = String(prevStage.referredToCourt ?? '').trim();
            const previousCourt = String(
                prevStage.previousCourtName ?? prevStage.court ?? parentData.court ?? '',
            ).trim();

            if (!referred || inferCourtReferralAcceptance(prevStage) !== 'pending') {
                return prevStages;
            }

            let nextStage;
            if (data.decision === 'reject') {
                nextStage = {
                    ...prevStage,
                    referredToCourt: undefined,
                    courtReferralDate: undefined,
                    courtReferralNotes: undefined,
                    previousCourtName: undefined,
                    courtReferralAcceptance: 'rejected',
                    courtReferralDecisionDate: data.decisionDate,
                    timeline: [
                        {
                            id: `transfer_reject_${Date.now()}`,
                            type: 'milestone',
                            date: data.decisionDate,
                            title: '❌ رفض قبول المحكمة المحال إليها',
                            details: [
                                previousCourt ? `عادت المحكمة إلى: ${previousCourt}` : '',
                                `المحكمة المرفوضة: ${referred}`,
                                data.notes ? `السبب: ${data.notes}` : '',
                            ]
                                .filter(Boolean)
                                .join('\n'),
                            isNew: true,
                            color: 'red',
                        },
                        ...stageTimeline(prevStage),
                    ],
                };
            } else {
                nextStage = {
                    ...prevStage,
                    court: referred,
                    previousCourtName: previousCourt || prevStage.previousCourtName,
                    courtReferralAcceptance: 'accepted',
                    courtReferralDecisionDate: data.decisionDate,
                    timeline: [
                        {
                            id: `transfer_accept_${Date.now()}`,
                            type: 'milestone',
                            date: data.decisionDate,
                            title: `✅ قبول المحكمة المحال إليها — ${referred}`,
                            details: [
                                previousCourt ? `المحكمة السابقة: ${previousCourt}` : '',
                                `المحكمة المقبولة: ${referred}`,
                                data.notes ? `ملاحظات: ${data.notes}` : '',
                                '',
                                'اكتمل إجراء الإحالة.',
                            ]
                                .filter(Boolean)
                                .join('\n'),
                            isNew: true,
                            color: 'green',
                        },
                        ...stageTimeline(prevStage),
                    ],
                };
            }

            const updatedStages = replaceStageAt(prevStages, activeStageIndex, nextStage);
            savedStages = updatedStages;
            return updatedStages;
        });

        if (!savedStages) {
            SmartToast.error('لا توجد إحالة قيد الانتظار');
            return;
        }

        saveToCloud(savedStages);
        if (data.decision === 'reject') {
            SmartToast.info('تم رفض قبول المحكمة المحال إليها — عادت المحكمة كما كانت');
        } else {
            SmartToast.success(
                `تم قبول المحكمة المحال إليها: ${data.draft?.referredToCourt ?? 'المحكمة الجديدة'}`,
            );
        }
        setShowTransferJurisdictionModal(false);
    };

    return {
        handleJudgeRecusal,
        handleTransferJurisdiction,
        handleCourtReferralAcceptance,
    };
}
