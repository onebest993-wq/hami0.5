import { useCallback } from 'react';
import type { CaseStage, TimelineEvent } from '../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { SmartFileParentData } from '../smartFile/parentDataInit';
import { patchActiveStage } from '../smartFile/stageMutations';
import {
    applyAppealStageTransition,
    resolveOpponentAsAppellant,
} from '../smartFile/appealStageTransition';
import { resolveOpponentRegistrationAppealLayout } from '../smartFile/appealPartyEngine';
import { isAbsentJudgmentForm } from '../smartFile/absentJudgmentFlow';

type SaveToCloud = (updatedStages: CaseStage[], parent?: SmartFileParentData) => void;

export function useSmartFilePleadingsActions(options: {
    stages: CaseStage[];
    setStages: React.Dispatch<React.SetStateAction<CaseStage[]>>;
    activeStageIndex: number;
    setActiveStageIndex: React.Dispatch<React.SetStateAction<number>>;
    setViewingStageIndex: React.Dispatch<React.SetStateAction<number>>;
    currentStage: CaseStage;
    parentData: SmartFileParentData;
    saveToCloud: SaveToCloud;
    setStatus: React.Dispatch<React.SetStateAction<string>>;
}) {
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
    } = options;

    const stageExt = currentStage as CaseStage & { stageName?: string; timeline?: TimelineEvent[] };

    const commit = useCallback(
        (updated: CaseStage[]) => {
            setStages(updated);
            saveToCloud(updated, parentData);
        },
        [setStages, saveToCloud, parentData],
    );

    const handleClosePleadings = useCallback(() => {
        const updated = patchActiveStage(stages, activeStageIndex, { isPleadingsClosed: true });
        commit(updated);
        SmartToast.success('تم حجز الدعوى للقرار - الإضبارة قيد التدقيق 🔒');
    }, [stages, activeStageIndex, commit]);

    const handleReopenPleadings = useCallback(() => {
        const now = getLocalTodayYmd();
        const timeline = [
            {
                id: `reopen_${Date.now()}`,
                type: 'decision' as const,
                date: now,
                title: 'قرار محكمة',
                details: 'تم فتح باب المرافعة مجدداً لاستكمال الإجراءات القانونية.',
                isSystemLog: true,
                isNew: true,
            },
            ...(stageExt.timeline ?? []),
        ];

        const updated = patchActiveStage(stages, activeStageIndex, {
            isPleadingsClosed: false,
            wasReopened: true,
            timeline,
        });
        commit(updated);
        SmartToast.info('تم فتح باب المرافعة مجدداً 🔓');
    }, [stages, activeStageIndex, stageExt.timeline, commit]);

    const handleAppealRegistration = useCallback(
        (appealData: {
            appealMethod: string;
            appealCaseNo: string;
            appealCourt: string;
            appellant?: string;
            filingDate?: string;
            includedAppellantPartyIds?: Array<number | string>;
            includedOpponentPartyIds?: Array<number | string>;
            appealDossierMode?: 'standard' | 'interpleader_appellant' | 'against_interpleader';
        }) => {
            try {
                const {
                    appealMethod,
                    appealCaseNo,
                    appealCourt,
                    appellant: appellantOverride,
                    filingDate: filingDateOverride,
                    includedAppellantPartyIds,
                    includedOpponentPartyIds,
                } = appealData;
                const now = filingDateOverride || getLocalTodayYmd();
                const appellant =
                    appellantOverride
                    ?? resolveOpponentAsAppellant(
                        parentData.representedParty,
                        currentStage.parties,
                    );
                const isGhayabi = isAbsentJudgmentForm(
                    currentStage.judgmentForm,
                    currentStage.lastJudgmentType,
                );
                const isObjectionAppeal = appealMethod.includes('اعتراض');
                const appealType = appealMethod === 'اعتراض غيابي'
                    ? 'اعتراض على الحكم الغيابي'
                    : appealMethod;

                const archiveTitle = isObjectionAppeal
                    ? '🛡️ اعتراض المدعى عليه بالحكم الغيابي'
                    : '⚖️ تسجيل طعن من الخصم';
                const archiveDetails = isObjectionAppeal
                    ? `قام المدعى عليه بالاعتراض على الحكم الغيابي.\nرقم دعوى الاعتراض: ${appealCaseNo || 'غير محدد'}\nتاريخ التقديم: ${now}`
                    : `قام الخصم بالطعن في القرار بطريق (${appealType}).\n\nرقم دعوى الطعن: ${appealCaseNo || 'غير محدد'}\nالمحكمة المختصة: ${appealCourt || 'غير محدد'}\n\n🔒 بقيت إضبارة هذه المرحلة محفوظة ومقفولة، ويمكن الرجوع إليها من شريط المراحل.`;

                const archiveEvent: TimelineEvent = {
                    id: `appeal_opp_${Date.now()}`,
                    type: 'decision',
                    title: archiveTitle,
                    details: archiveDetails,
                    date: now,
                    isSystemLog: true,
                    isNew: true,
                };

                let stagesForTransition = stages;
                if (isGhayabi && !isObjectionAppeal) {
                    stagesForTransition = patchActiveStage(stages, activeStageIndex, {
                        judgmentForm: 'غيابي (تم ترك حق الاعتراض)',
                        lastJudgmentType: 'غيابي (متروك)',
                        awaitingAbsentJudgmentNotification: false,
                    });
                }

                const dossierLayout = resolveOpponentRegistrationAppealLayout(
                    currentStage.parties ?? [],
                    parentData.representedParty,
                    currentStage.incidentalCases,
                );
                const { updatedStages, newActiveIndex } = applyAppealStageTransition(
                    stagesForTransition,
                    activeStageIndex,
                    stagesForTransition[activeStageIndex] ?? currentStage,
                    {
                        appealType,
                        appellant,
                        filingDate: now,
                        newCaseNumber: appealCaseNo,
                        newCourt: appealCourt,
                        archiveTimelineEvent: archiveEvent,
                        archiveFinalDecision: isObjectionAppeal
                            ? 'حكم غيابي — اعترض المدعى عليه'
                            : isGhayabi
                              ? `حكم غيابي — ترك الاعتراض وطعن بـ${appealType}`
                              : undefined,
                        archiveDecisionDate: currentStage.decisionDate ?? now,
                        includedAppellantPartyIds,
                        includedOpponentPartyIds,
                        dossierLayout: {
                            ...dossierLayout,
                            appellantLegalSide: appellant,
                            defaultAppellantIds:
                                includedAppellantPartyIds ?? dossierLayout.defaultAppellantIds,
                            defaultOpponentIds:
                                includedOpponentPartyIds ?? dossierLayout.defaultOpponentIds,
                        },
                        priorJudgmentType:
                            currentStage.lastJudgmentType
                            ?? currentStage.finalDecision
                            ?? undefined,
                    },
                );

                setStages(updatedStages);
                setActiveStageIndex(newActiveIndex);
                setViewingStageIndex(newActiveIndex);
                saveToCloud(updatedStages, parentData, newActiveIndex);

                const nextStage = updatedStages[newActiveIndex];
                const nextName = nextStage?.stageName ?? appealMethod;
                setStatus(`مرحلة ${nextName}`);
                SmartToast.success(`تم تسجيل طعن الخصم — انتقلت الدعوى إلى ${nextName} مع نقل الملاحظات والمستندات`);
            } catch (error) {
                throw error;
            }
        },
        [
            stages,
            activeStageIndex,
            currentStage,
            parentData,
            saveToCloud,
            setStages,
            setActiveStageIndex,
            setViewingStageIndex,
            setStatus,
        ],
    );

    return {
        handleClosePleadings,
        handleReopenPleadings,
        handleAppealRegistration,
    };
}
