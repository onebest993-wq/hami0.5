import type { Dispatch as _Dispatch, SetStateAction as _SetStateAction } from 'react';
import type { CaseStage as _CaseStage, Party as _Party, TimelineEvent as _TimelineEvent } from '../../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { validateJudgmentData as _validateJudgmentData } from '@/app/utils/validationUtils';
import { logError as _logError } from '@/app/utils/errorHandler';
import { debug } from '@/app/utils/debug';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { applyStageTransition as _applyStageTransition } from '../../smartFile/stageTransition';
import {
    applyAppealStageTransition as _applyAppealStageTransition,
    applyCassationRemand,
    cassationRemandSuccessMessage,
    resolveCassationRemandTarget as _resolveCassationRemandTarget,
} from '../../smartFile/appealStageTransition';
import type { SmartFileParentData as _SmartFileParentData } from '../../smartFile/parentDataInit';
import type {
    AppealTransitionPayload as _AppealTransitionPayload,
    CrossAppealPayload,
    JudgmentPayload as _JudgmentPayload,
    SmartFileAttachment as _SmartFileAttachment,
    StageTransitionPayload as _StageTransitionPayload,
} from '../../smartFile/judgmentTypes';
import {
    addDaysYmd as _addDaysYmd,
    isSulhJudgmentType as _isSulhJudgmentType,
    JUDGMENT_TYPE_PETITION_NULLIFIED_LEGACY as _JUDGMENT_TYPE_PETITION_NULLIFIED_LEGACY,
    JUDGMENT_TYPE_WAIVER as _JUDGMENT_TYPE_WAIVER,
    parseJudgmentDateInput as _parseJudgmentDateInput,
    prependTimeline as _prependTimeline,
    stageAttachments as _stageAttachments,
    str as _str,
} from '../../smartFile/judgmentTypes';
import {
    interpleaderClientAwaitingOpponentAppeal as _interpleaderClientAwaitingOpponentAppeal,
    interpleaderOriginalClaimOutcome as _interpleaderOriginalClaimOutcome,
    isInterpleaderJudgmentType as _isInterpleaderJudgmentType,
    resolveInterpleaderDecisionText as _resolveInterpleaderDecisionText,
    resolveLawyerJudgmentBucket as _resolveLawyerJudgmentBucket,
} from '../../smartFile/interpleaderJudgmentEngine';
import { resolveAppealDossierLayout as _resolveAppealDossierLayout, inferAppellantSideFromLawyer as _inferAppellantSideFromLawyer } from '../../smartFile/appealPartyEngine';
import {
    markPartiesAsCrossAppellants,
    resolveCrossAppealEligibility,
} from '../../smartFile/crossAppealEngine';
import type { UseSmartFileJudgmentActionsOptions } from './judgmentHookTypes';

export function useCrossAppealAndCassationActions(options: UseSmartFileJudgmentActionsOptions) {
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
        tempJudgmentData: _tempJudgmentData,
        setTempJudgmentData: _setTempJudgmentData,
        setShowAppealTransitionModal: _setShowAppealTransitionModal,
        setShowAppealModal: _setShowAppealModal,
        setShowObjectionRegistrationModal: _setShowObjectionRegistrationModal,
        setShowJudgmentModal: _setShowJudgmentModal,
        setShowCrossAppealModal,
        setShowTransitionModal: _setShowTransitionModal,
    } = options;

const handleCrossAppeal = (crossAppealData: CrossAppealPayload) => {
    debug.log('🔄 بدء معالجة الاستئناف المتقابل:', crossAppealData);

    const eligibility = resolveCrossAppealEligibility({
        appealStage: currentStage,
        stages,
        appealStageIndex: activeStageIndex,
    });

    const { filingDate, receiptNumber, notes, crossAppealPartyIds } = crossAppealData;
    const targetIds =
        crossAppealPartyIds?.length
            ? crossAppealPartyIds
            : eligibility.pendingCrossAppellants.map((p) => p.id).filter((id) => id != null) as Array<
                  number | string
              >;

    if (targetIds.length === 0) {
        SmartToast.error('لا يوجد طرف مؤهل لتسجيل الاستئناف المتقابل');
        return;
    }

    const pendingIdSet = new Set(
        eligibility.pendingCrossAppellants.map((p) => String(p.id ?? '')),
    );
    const validIds = targetIds.filter((id) => pendingIdSet.has(String(id)));
    if (validIds.length === 0) {
        SmartToast.error('الطرف المحدد غير مؤهل للاستئناف المتقابل');
        return;
    }

    const updatedStages = [...stages];
    const priorMeta = currentStage.appealMetadata ?? {};
    const mergedCrossIds = [
        ...(priorMeta.crossAppealPartyIds ?? []),
        ...validIds.map(String),
    ];
    const uniqueCrossIds = [...new Set(mergedCrossIds)];

    const crossPartyNames = eligibility.pendingCrossAppellants
        .filter((p) => validIds.some((id) => String(id) === String(p.id)))
        .map((p) => String(p.name ?? '').trim())
        .filter(Boolean)
        .join('، ');

    const updatedParties = markPartiesAsCrossAppellants(currentStage.parties ?? [], validIds);

    updatedStages[activeStageIndex] = {
        ...currentStage,
        parties: updatedParties,
        appealMetadata: {
            ...priorMeta,
            hasCrossAppeal: true,
            crossAppealDate: filingDate,
            crossAppealReceipt: receiptNumber,
            crossAppealPartyIds: uniqueCrossIds,
        },
        timeline: [{
            id: `cross_appeal_${Date.now()}`,
            type: 'milestone',
            date: filingDate,
            title: '🔄 تم تقديم لائحة استئناف متقابل',
            details: `تم تقديم لائحة استئناف متقابل${crossPartyNames ? ` من: ${crossPartyNames}` : ''}\n${receiptNumber ? `\nرقم وصل الرسوم: ${receiptNumber}` : ''}\n${notes ? `\nملاحظات: ${notes}` : ''}`,
            isNew: true,
            color: 'teal',
        }, ...(currentStage.timeline ?? [])],
    };

    setStages(updatedStages);
    saveToCloud(updatedStages, parentData);
    setShowCrossAppealModal(false);

    SmartToast.success('تم تسجيل الاستئناف المتقابل بنجاح');
    debug.log('✅ تم تسجيل الاستئناف المتقابل بنجاح');
};

// ========================================
// CASSATION OUTCOME HANDLER (Ratified / Quashed)
// ========================================
const handleCassationDecision = (decision: 'ratified' | 'quashed') => {
    const updatedStages = [...stages];
    const now = getLocalTodayYmd();

    if (decision === 'ratified') {
        // Ratified: Close the case stage as successful/final
        updatedStages[activeStageIndex] = {
            ...currentStage,
            status: 'completed',
            finalDecision: 'مصدق (القرار اكتسب الدرجة القطعية)',
            decisionDate: now
        };
        
        updatedStages[activeStageIndex].timeline = [{
            id: `cass_ratified_${Date.now()}`,
            type: 'decision',
            date: now,
            title: '✅ قرار تصديق الحكم (مصدق)',
            details: 'قررت محكمة التمييز الاتحادية تصديق الحكم المميز ورد الطعون، واكتسب القرار الدرجة القطعية.',
            isNew: true
        }, ...(currentStage.timeline ?? [])];

        SmartToast.success('تم تصديق الحكم واكتسب الدرجة القطعية');
    } else {
        const { updatedStages: remandedStages, newActiveIndex, target } = applyCassationRemand(
            stages,
            activeStageIndex,
            {
                remandDate: now,
                cassationFinalDecision: 'منقوض (إعادة للمحاكمة)',
                cassationTimelineEvent: {
                    id: `cass_quashed_${Date.now()}`,
                    type: 'decision',
                    date: now,
                    title: '❌ قرار بنقض الحكم (منقوض)',
                    details: 'قررت محكمة التمييز نقض الحكم المميز وإعادة الإضبارة إلى محكمتها للسير فيها مجدداً.',
                    isNew: true,
                },
            },
        );

        setStages(remandedStages);
        setActiveStageIndex(newActiveIndex);
        setViewingStageIndex(newActiveIndex);
        setStatus(`مرحلة ${target.stageName}`);
        saveToCloud(remandedStages, parentData, newActiveIndex, `مرحلة ${target.stageName}`);
        SmartToast.error(cassationRemandSuccessMessage(target));
        return;
    }

    const finalStatus = 'مكتسبة الدرجة القطعية';
    setStages(updatedStages);
    setStatus(finalStatus);
    saveToCloud(updatedStages, { ...parentData, status: finalStatus }, activeStageIndex, finalStatus);
};


    return {
        handleCrossAppeal,
        handleCassationDecision,
    };
}
