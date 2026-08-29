import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import {
    applyCassationRemand,
    cassationRemandSuccessMessage,
} from '../../smartFile/appealStageTransition';
import type { CrossAppealPayload } from '../../smartFile/judgmentTypes';
import {
    markPartiesAsCrossAppellants,
    resolveCrossAppealEligibility,
} from '../../smartFile/crossAppealEngine';
import {
    buildCassationRemandTimelineTitle,
    resolveCassationClientOutcome,
    resolveClientAppealRole,
    resolvePriorAppealJudgmentForCassation,
} from '../../smartFile/appealStageJudgmentEngine';
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
        setShowCrossAppealModal,
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
    const clientRole = resolveClientAppealRole(currentStage.parties);
    const priorAppealJudgment = resolvePriorAppealJudgmentForCassation(
        updatedStages,
        activeStageIndex,
    );

    if (decision === 'ratified') {
        const cassationJudgment = 'تصديق الحكم';
        const outcome = resolveCassationClientOutcome(
            cassationJudgment,
            clientRole,
            priorAppealJudgment,
        );
        const clientLost = outcome === 'loss';

        updatedStages[activeStageIndex] = {
            ...currentStage,
            status: 'completed',
            finalDecision: 'مكتسبة الدرجة القطعية',
            decisionDate: now,
        };

        updatedStages[activeStageIndex].timeline = [{
            id: `cass_ratified_${Date.now()}`,
            type: 'decision',
            date: now,
            title: clientLost
                ? 'تصديق الحكم — اكتسب الدرجة القطعية (حكم نهائي ضد الموكل)'
                : '✅ قرار تصديق الحكم (مصدق)',
            details: clientLost
                ? 'صدقت محكمة التمييز حكم محكمة الاستئناف.\nالحكم مكتسب الدرجة القطعية — نهائي ضد موكلك.'
                : 'قررت محكمة التمييز الاتحادية تصديق الحكم المميز ورد الطعون، واكتسب القرار الدرجة القطعية.',
            isNew: true,
            color: clientLost ? 'red' : 'gold',
        }, ...(currentStage.timeline ?? [])];

        SmartToast.success(
            clientLost
                ? 'خُتمت الإضبارة — الحكم نهائي ضد الموكل'
                : 'تم تصديق الحكم واكتسب الدرجة القطعية',
        );
    } else {
        const cassationJudgment = 'نقض الحكم وإعادة الإضبارة';
        const remandTitle = buildCassationRemandTimelineTitle(
            cassationJudgment,
            clientRole,
            priorAppealJudgment,
        );
        const remandOutcome = resolveCassationClientOutcome(
            cassationJudgment,
            clientRole,
            priorAppealJudgment,
        );
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
                    title: remandTitle,
                    details: 'قررت محكمة التمييز نقض الحكم المميز وإعادة الإضبارة إلى محكمتها للسير فيها مجدداً.',
                    isNew: true,
                    color: remandOutcome === 'remand_favorable' ? 'gold' : 'red',
                },
            },
        );

        setStages(remandedStages);
        setActiveStageIndex(newActiveIndex);
        setViewingStageIndex(newActiveIndex);
        setStatus(`مرحلة ${target.stageName}`);
        saveToCloud(remandedStages, parentData, newActiveIndex, `مرحلة ${target.stageName}`);
        SmartToast[remandOutcome === 'remand_favorable' ? 'success' : 'error'](cassationRemandSuccessMessage(target));
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
