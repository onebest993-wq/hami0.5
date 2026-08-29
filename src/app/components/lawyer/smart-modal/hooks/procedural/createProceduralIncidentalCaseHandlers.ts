import type {
    IncidentalCase,
    IncidentalStatus,
} from '../../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import type { UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import {
    stageIncidentalCases,
    stageTimeline,
} from '../../smartFile/proceduralTypes';
import {
    buildIncidentalEntryDecisionEvent,
    buildIncidentalResolveEvent,
    buildIncidentalTimelineEvent,
    filterHeaderIncidentalCases,
    isLinkedSpawnIncidentalType,
} from '../../smartFile/incidentalCaseLinking';
import { replaceStageAt } from '../../smartFile/stageImmutable';

export function createProceduralIncidentalCaseHandlers(
    options: UseSmartFileProceduralActionsOptions,
) {
    const {
        stages,
        setStages,
        activeStageIndex,
        saveToCloud,
        setEditingIncidental,
    } = options;

    const handleAddIncidentalCase = (data: IncidentalCase) => {
        const prevStage = stages[activeStageIndex];
        if (!prevStage) return;
        const existingTimeline = stageTimeline(prevStage);

        let nextStage;
        if (data.id && stageIncidentalCases(prevStage).some((c) => c.id === data.id)) {
            nextStage = {
                ...prevStage,
                incidentalCases: stageIncidentalCases(prevStage).map((c: IncidentalCase) =>
                    c.id === data.id ? { ...c, ...data } : c,
                ),
            };
            setEditingIncidental(null);
        } else {
            const newCase: IncidentalCase = {
                id: data.id || `inc_${Date.now()}`,
                type: data.type,
                partyName: data.partyName,
                partyRole: data.partyRole,
                details: data.details,
                date: data.date || getLocalTodayYmd(),
                status: data.status || 'active',
                thirdPartyEntryMode: data.thirdPartyEntryMode,
                affiliationSide: data.affiliationSide,
                affiliationPartyId: data.affiliationPartyId,
                affiliationPartyName: data.affiliationPartyName,
                entryDecision: data.entryDecision ?? (data.type === 'thirdParty' ? 'pending' : undefined),
                linkedFileId: data.linkedFileId,
                linkedCaseNo: data.linkedCaseNo,
                parentFileId: data.parentFileId,
                parentCaseNo: data.parentCaseNo,
            };
            nextStage = {
                ...prevStage,
                incidentalCases: [newCase, ...stageIncidentalCases(prevStage)],
                timeline: [buildIncidentalTimelineEvent(newCase), ...existingTimeline],
            };
        }

        const updatedStages = replaceStageAt(stages, activeStageIndex, nextStage);
        setStages(updatedStages);
        saveToCloud(updatedStages);
        if (data.type === 'thirdParty') {
            SmartToast.success('تم تسجيل طلب دخول الشخص الثالث');
        } else if (!isLinkedSpawnIncidentalType(data.type)) {
            SmartToast.success('تم تسجيل الدعوى الحادثة');
        }
    };

    const handleAddCrossAppeal = () => {
        const prevStage = stages[activeStageIndex];
        if (!prevStage) return;
        const nextStage = {
            ...prevStage,
            hasCrossAppeal: true,
        };
        const updatedStages = replaceStageAt(stages, activeStageIndex, nextStage);
        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.success('تم إضافة الاستئناف المتقابل بنجاح ⚖️');
    };

    const handleCancelCrossAppeal = () => {
        const stage = stages[activeStageIndex];
        if (!stage) return;

        const resetParties = (stage.parties ?? []).map((party) => ({
            ...party,
            role: String(party.role ?? '')
                .replace(/\s*\(مستأنف متقابل\)/g, '')
                .replace(/\s*— مستأنف متقابل/g, ''),
        }));

        const nextStage = {
            ...stage,
            hasCrossAppeal: false,
            parties: resetParties,
            appealMetadata: stage.appealMetadata
                ? {
                      ...stage.appealMetadata,
                      hasCrossAppeal: false,
                      crossAppealDate: undefined,
                      crossAppealReceipt: undefined,
                      crossAppealPartyIds: [],
                  }
                : stage.appealMetadata,
        };
        const updatedStages = replaceStageAt(stages, activeStageIndex, nextStage);
        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.info('تم إلغاء الاستئناف المتقابل');
    };

    const handleResolveIncidentalCase = (id: string, status: IncidentalStatus) => {
        const prevStage = stages[activeStageIndex];
        if (!prevStage) return;
        const target = stageIncidentalCases(prevStage).find((c) => c.id === id);
        if (!target) return;
        if (isLinkedSpawnIncidentalType(target.type)) {
            SmartToast.info(
                'نتيجة الدعوى المنضمة/المتقابلة تُسجَّل تلقائياً من الإضبارة المرتبطة عند ختام المرافعة',
            );
            return;
        }
        const nextIncidental = stageIncidentalCases(prevStage).map((c: IncidentalCase) =>
            c.id === id ? { ...c, status } : c,
        );
        const nextTimeline =
            target && (status === 'resolved' || status === 'rejected')
                ? [buildIncidentalResolveEvent(target, status), ...stageTimeline(prevStage)]
                : stageTimeline(prevStage);

        const nextStage = {
            ...prevStage,
            incidentalCases: nextIncidental,
            timeline: nextTimeline,
        };
        const updatedStages = replaceStageAt(stages, activeStageIndex, nextStage);
        setStages(updatedStages);
        saveToCloud(updatedStages);
    };

    const handleUpdateIncidentalEntryDecision = (
        id: string,
        entryDecision: 'accepted' | 'rejected',
    ) => {
        const prevStage = stages[activeStageIndex];
        if (!prevStage) return;
        const target = stageIncidentalCases(prevStage).find((c) => c.id === id);
        if (!target) return;

        const decisionEvent = buildIncidentalEntryDecisionEvent(target, entryDecision);
        const prunedIncidental = filterHeaderIncidentalCases(stageIncidentalCases(prevStage));
        const nextIncidental =
            entryDecision === 'rejected'
                ? prunedIncidental.filter((c) => c.id !== id)
                : prunedIncidental.map((c: IncidentalCase) =>
                      c.id === id ? { ...c, entryDecision } : c,
                  );

        const nextStage = {
            ...prevStage,
            incidentalCases: nextIncidental,
            timeline: [decisionEvent, ...stageTimeline(prevStage)],
        };

        const updatedStages = replaceStageAt(stages, activeStageIndex, nextStage);
        setStages(updatedStages);
        saveToCloud(updatedStages);

        if (entryDecision === 'rejected') {
            SmartToast.info('تم رفض الدخول وإزالة الطلب');
        } else {
            SmartToast.success('تم قبول دخول الشخص الثالث');
        }
    };

    return {
        handleAddIncidentalCase,
        handleAddCrossAppeal,
        handleCancelCrossAppeal,
        handleResolveIncidentalCase,
        handleUpdateIncidentalEntryDecision,
    };
}
