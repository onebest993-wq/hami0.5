import { SmartToast } from '@/app/components/ui/SmartToast';
import { validateJudgmentData } from '@/app/utils/validationUtils';
import { logError } from '@/app/utils/errorLog';
import { debug } from '@/app/utils/debug';
import {
    coerceJudgmentTypeForReleasedOperatives,
} from '@/app/domain/lawsuit/partyJudgmentDisposition';
import type { JudgmentPayload } from '../../../smartFile/judgmentTypes';
import { addDaysYmd, parseJudgmentDateInput, str } from '../../../smartFile/judgmentTypes';
import type { UseSmartFileJudgmentActionsOptions } from '../judgmentHookTypes';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from './judgmentConfirmTypes';
import { dispatchJudgmentScenarios } from './dispatchJudgmentScenarios';
import { syncAttachmentShieldOnJudgment } from './syncAttachmentShield';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import { buildLawsuitCalendarContext } from '../../procedural/lawsuitCalendarContext';
import { overlayMirrorStageLegalDatesToCalendar } from '@/app/services/lawsuitTimelineCalendarMirrorLazy';
import {
    parseDisputeIntegrity,
    shouldPersistPartyJudgmentStamp,
    stampPartyJudgmentOnStage,
} from '@/app/domain/lawsuit/partyJudgmentDisposition';
import { formatDateToLocalYmd } from '@/app/utils/localYmd';
import { attachPartyChallengeLanes } from '@/app/domain/lawsuit/partyChallengeLanes';
import {
    ART172_STAY_BADGE,
    isArt172AppealStayActive,
} from '../../../smartFile/art172AppealStay';

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
        const judgmentForm = str(judgmentData.judgmentForm) || 'حضوري';
        const judgmentDate = str(judgmentData.judgmentDate);
        const notes = str(judgmentData.notes);
        const nextStage = str(judgmentData.nextStage);
        const openAppealTransitionModal = Boolean(judgmentData.openAppealTransitionModal);
        const judgmentType = coerceJudgmentTypeForReleasedOperatives(
            str(judgmentData.judgmentType),
            judgmentData.partyJudgmentDispositions,
        );

        debug.log('⚖️ بدء معالجة قرار الحكم:', action);

        if (isArt172AppealStayActive(currentStage)) {
            SmartToast.info(ART172_STAY_BADGE);
            return false;
        }

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
            stageName:
                str(judgmentData.stageName)
                || currentStage.stageName
                || currentStage.name
                || '',
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
        if (
            rt.handled
            && shouldPersistPartyJudgmentStamp(rt.stageName, judgmentData)
            && rt.updatedStages[activeStageIndex]
        ) {
            rt.updatedStages[activeStageIndex] = attachPartyChallengeLanes(
                stampPartyJudgmentOnStage(
                    rt.updatedStages[activeStageIndex],
                    judgmentData,
                ),
                {
                    dispositions: judgmentData.partyJudgmentDispositions,
                    judgmentDate: rt.judgmentDate,
                    integrity: judgmentData.disputeIntegrity,
                    today: formatDateToLocalYmd(rt.now),
                },
            );
        }
        syncAttachmentShieldOnJudgment(scope, rt);

        if (!rt.handled) {
            debug.error('❌ إجراء حكم غير معروف:', action);
            SmartToast.error('تعذّر حفظ الحكم — إجراء غير معروف');
            return false;
        }

        const cloudStageIndex = rt.remandNewActiveIndex ?? activeStageIndex;
        const cloudStatus = rt.nextCaseStatus ?? status;
        const stampedIntegrity = parseDisputeIntegrity(judgmentData.disputeIntegrity);
        const cloudParent = {
            ...parentData,
            ...(rt.nextCaseStatus ? { status: rt.nextCaseStatus } : {}),
            ...(stampedIntegrity ? { disputeIntegrity: stampedIntegrity } : {}),
        };
        const calCtx = buildLawsuitCalendarContext(parentData, resolveCalendarUserId());

        const persistStages = (nextStages: typeof rt.updatedStages) => {
            setStages(nextStages);
            if (rt.remandNewActiveIndex !== null) {
                setActiveStageIndex(rt.remandNewActiveIndex);
                setViewingStageIndex(rt.remandNewActiveIndex);
            }
            if (rt.nextCaseStatus) {
                setStatus(rt.nextCaseStatus);
            }
            saveToCloud(nextStages, cloudParent, cloudStageIndex, cloudStatus);
        };

        persistStages(rt.updatedStages);
        overlayMirrorStageLegalDatesToCalendar(
            rt.updatedStages,
            activeStageIndex,
            calCtx,
            persistStages,
        );
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
