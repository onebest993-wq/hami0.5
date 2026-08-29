import type { TimelineEvent } from '../../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import { stageTimeline } from '../../smartFile/proceduralTypes';
import { isCassationStageName } from '../../smartFile/judgmentTypes';
import {
    findCassationStageIndex,
    resolveRetrialTargetStageIndex,
} from '../../smartFile/extraordinaryAppealGateway';
import { applyCassationCorrectionOpen } from '../../smartFile/appealStageTransition';

export function createProceduralExtraordinaryAppealHandlers(options: UseSmartFileProceduralActionsOptions) {
    const {
        stages,
        setStages,
        activeStageIndex,
        viewingStageIndex,
        setActiveStageIndex,
        setViewingStageIndex,
        currentStage,
        parentData,
        setParentData,
        saveToCloud,
        setStatus,
        setIsPaused,
        setPauseReason,
        setShowExtraordinaryAppealModal,
        status,
    } = options;

    const handleExtraordinaryAppeal = (data: { type: string; date: string; court: string; reasons: string; [key: string]: unknown }) => {
        const { type, date, court, reasons } = data;
        const updatedStages = [...stages];

        let newStatus = status;
        let timelineTitle = '';
        let timelineDetails = `تاريخ التقديم: ${date}\nمقدمة إلى: ${court}\n\nالأسباب:\n${reasons}`;
        let nextParent = parentData;

        if (type === 'إعادة المحاكمة') {
            newStatus = 'قيد نظر إعادة المحاكمة';
            timelineTitle = '🔄 تسجيل طلب إعادة المحاكمة';
            const targetIndex = resolveRetrialTargetStageIndex(updatedStages);
            const targetStage = updatedStages[targetIndex];
            if (!targetStage) {
                SmartToast.error('تعذّر تحديد مرحلة إعادة المحاكمة');
                return;
            }
            const targetName = String(targetStage.stageName ?? targetStage.name ?? '');
            updatedStages[targetIndex] = {
                ...targetStage,
                status: 'active',
                isPleadingsClosed: false,
                awaitingOpponentAppeal: false,
                finalDecision: null,
                decisionDate: null,
                wasReopened: true,
                extraordinaryAppealType: type,
                timeline: [
                    {
                        id: `extra_appeal_${Date.now()}`,
                        type: 'decision',
                        date,
                        title: timelineTitle,
                        details: timelineDetails,
                        isNew: true,
                        isSystemLog: true,
                        tags: ['#طعن_استثنائي', type],
                    },
                    ...stageTimeline(targetStage),
                ],
            };
            nextParent = {
                ...parentData,
                status: newStatus,
                retrialTargetStage: targetName,
            };
            setParentData(nextParent);
            setStatus(newStatus);
            setActiveStageIndex?.(targetIndex);
            setViewingStageIndex?.(targetIndex);
            setStages(updatedStages);
            saveToCloud(updatedStages, nextParent, targetIndex);
            setShowExtraordinaryAppealModal(false);
            SmartToast.success(`تم تسجيل ${type} بنجاح في مرحلة ${targetName} ⚖️`);
            return;
        }

        if (type === 'تصحيح القرار التمييزي') {
            newStatus = 'قيد نظر التصحيح التمييزي';
            const cassationIdx =
                viewingStageIndex >= 0 && isCassationStageName(updatedStages[viewingStageIndex]?.stageName)
                    ? viewingStageIndex
                    : findCassationStageIndex(updatedStages);
            if (cassationIdx < 0) {
                SmartToast.error('تعذّر تحديد مرحلة التمييز');
                return;
            }
            const { updatedStages: openedStages, newActiveIndex } = applyCassationCorrectionOpen(
                updatedStages,
                cassationIdx,
                { judgmentDate: date, notes: timelineDetails },
            );
            nextParent = { ...parentData, status: newStatus };
            setParentData(nextParent);
            setStatus(newStatus);
            setActiveStageIndex?.(newActiveIndex);
            setViewingStageIndex?.(newActiveIndex);
            setStages(openedStages);
            saveToCloud(openedStages, nextParent, newActiveIndex);
            setShowExtraordinaryAppealModal(false);
            SmartToast.success('تم فتح مرحلة تصحيح قرار تمييزي');
            return;
        }

        if (type === 'اعتراض الغير') {
            timelineTitle = '🙋‍♂️ تسجيل اعتراض الغير على الحكم';
        } else if (type === 'رد القاضي') {
            newStatus = 'قيد نظر طلب رد القاضي';
            timelineTitle = '⚖️ طلب رد القاضي أو نقل الدعوى';
            setIsPaused(true);
            setPauseReason('قيد نظر طلب رد القاضي');
        }

        if (newStatus !== status) {
            setStatus(newStatus);
        }

        const newEvent: TimelineEvent = {
            id: `extra_appeal_${Date.now()}`,
            type: 'decision',
            date: date,
            title: timelineTitle,
            details: timelineDetails,
            isNew: true,
            isSystemLog: true,
            tags: ['#طعن_استثنائي', type]
        };

        updatedStages[activeStageIndex].timeline = [newEvent, ...stageTimeline(currentStage)];
        updatedStages[activeStageIndex].extraordinaryAppealType = type;

        setStages(updatedStages);
        saveToCloud(updatedStages);
        setShowExtraordinaryAppealModal(false);
        SmartToast.success(`تم تسجيل ${type} بنجاح وتحديث حالة الدعوى ⚖️`);
    };

    return { handleExtraordinaryAppeal };
}
