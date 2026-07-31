import { SmartToast } from '@/app/components/ui/SmartToast';
import { validateJudgmentData } from '@/app/utils/validationUtils';
import { logError } from '@/app/utils/errorHandler';
import { debug } from '@/app/utils/debug';
import type { JudgmentPayload } from '../../../smartFile/judgmentTypes';
import { addDaysYmd, parseJudgmentDateInput, str } from '../../../smartFile/judgmentTypes';
import type { UseSmartFileJudgmentActionsOptions } from '../judgmentHookTypes';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from './judgmentConfirmTypes';
import { dispatchJudgmentScenarios } from './dispatchJudgmentScenarios';
import { syncAttachmentShieldOnJudgment } from './syncAttachmentShield';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { buildLawsuitCalendarContext } from '../../procedural/lawsuitCalendarContext';
import { mirrorStageLegalDatesToCalendar } from '@/app/services/lawsuitTimelineCalendarMirror';

export function applyJudgmentConfirm(
    judgmentData: JudgmentPayload,
    options: UseSmartFileJudgmentActionsOptions,
): boolean {
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
        setTempJudgmentData,
        setShowAppealTransitionModal,
        setShowAppealModal,
        setShowObjectionRegistrationModal,
        setShowJudgmentModal,
        status,
    } = options;

    try {
        const validation = validateJudgmentData(judgmentData);
        if (!validation.valid) {
            SmartToast.error(validation.error || 'بيانات الحكم غير صحيحة');
            return false;
        }

        const action = str(judgmentData.action);
        const judgmentType = str(judgmentData.judgmentType);
        const judgmentForm = str(judgmentData.judgmentForm) || 'حضوري';
        const judgmentDate = str(judgmentData.judgmentDate);
        const notes = str(judgmentData.notes);
        const nextStage = str(judgmentData.nextStage);
        const openAppealTransitionModal = Boolean(judgmentData.openAppealTransitionModal);

        debug.log('⚖️ بدء معالجة قرار الحكم:', action);

        if (openAppealTransitionModal) {
            debug.log('🔄 فتح نافذة بوابة الطعن...');
            setTempJudgmentData(judgmentData);
            setShowAppealTransitionModal(true);
            setShowJudgmentModal(false);
            return true;
        }

        const scope: JudgmentConfirmScope = {
            stages,
            currentStage,
            activeStageIndex,
            parentData,
            setStatus,
            setActiveStageIndex,
        };

        const rt: JudgmentConfirmRuntime = {
            judgmentData,
            action,
            judgmentType,
            judgmentForm,
            judgmentDate,
            notes,
            nextStage,
            now: parseJudgmentDateInput(judgmentDate),
            stageName: currentStage.stageName ?? '',
            addDays: (date: Date, days: number) => addDaysYmd(date, days),
            updatedStages: [...stages],
            handled: false,
            successToast: 'تم حفظ قرار الحكم بنجاح ⚖️',
            openAppealModalAfterSave: false,
            openObjectionModalAfterSave: false,
            remandNewActiveIndex: null,
            nextCaseStatus: undefined,
        };

        dispatchJudgmentScenarios(scope, rt);
        syncAttachmentShieldOnJudgment(scope, rt);

        const calCtx = buildLawsuitCalendarContext(parentData, resolveCalendarUserId());
        rt.updatedStages = mirrorStageLegalDatesToCalendar(rt.updatedStages, activeStageIndex, calCtx);

        if (!rt.handled) {
            debug.error('❌ إجراء حكم غير معروف:', action);
            SmartToast.error('تعذّر حفظ الحكم — إجراء غير معروف');
            return false;
        }

        const cloudStageIndex = rt.remandNewActiveIndex ?? activeStageIndex;
        const cloudStatus = rt.nextCaseStatus ?? status;
        const cloudParent = rt.nextCaseStatus
            ? { ...parentData, status: rt.nextCaseStatus }
            : parentData;

        setStages(rt.updatedStages);
        if (rt.remandNewActiveIndex !== null) {
            setActiveStageIndex(rt.remandNewActiveIndex);
            setViewingStageIndex(rt.remandNewActiveIndex);
        }
        if (rt.nextCaseStatus) {
            setStatus(rt.nextCaseStatus);
        }
        saveToCloud(rt.updatedStages, cloudParent, cloudStageIndex, cloudStatus);
        setShowJudgmentModal(false);

        debug.log('✅ تم حفظ قرار الحكم بنجاح');
        SmartToast.success(rt.successToast);

        if (rt.openObjectionModalAfterSave) {
            setShowObjectionRegistrationModal(true);
        }
        if (rt.openAppealModalAfterSave) {
            setShowAppealModal(true);
        }

        return true;
    } catch (error) {
        logError('handleJudgmentConfirm', error, judgmentData);
        SmartToast.error('حدث خطأ أثناء حفظ قرار الحكم');
        return false;
    }
}
