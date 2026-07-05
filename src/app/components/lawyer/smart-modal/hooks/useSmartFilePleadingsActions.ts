// @ts-nocheck
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
                // #region debug-point C:appeal-registration-entry
                fetch('http://127.0.0.1:7777/event', {
                    method: 'POST',
                    body: JSON.stringify({
                        sessionId: 'opponent-appeal-crash',
                        runId: 'pre-fix',
                        hypothesisId: 'C',
                        location: 'useSmartFilePleadingsActions.ts:handleAppealRegistration:entry',
                        msg: '[DEBUG] handleAppealRegistration entry',
                        data: {
                            stageName: currentStage.stageName ?? null,
                            representedParty: parentData.representedParty ?? null,
                            appealMethod,
                            appealCaseNo,
                            appealCourt,
                            appellant,
                            partyCount: Array.isArray(currentStage.parties) ? currentStage.parties.length : 0,
                            incidentalCount: Array.isArray(currentStage.incidentalCases) ? currentStage.incidentalCases.length : 0,
                            includedAppellantPartyIds: includedAppellantPartyIds ?? [],
                            includedOpponentPartyIds: includedOpponentPartyIds ?? [],
                        },
                        ts: Date.now(),
                    }),
                }).catch(() => {});
                // #endregion

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
                // #region debug-point D:appeal-registration-layout
                fetch('http://127.0.0.1:7777/event', {
                    method: 'POST',
                    body: JSON.stringify({
                        sessionId: 'opponent-appeal-crash',
                        runId: 'pre-fix',
                        hypothesisId: 'D',
                        location: 'useSmartFilePleadingsActions.ts:handleAppealRegistration:layout',
                        msg: '[DEBUG] resolved opponent registration layout',
                        data: {
                            mode: dossierLayout.mode,
                            appellantLegalSide: dossierLayout.appellantLegalSide ?? null,
                            appellantCount: Array.isArray(dossierLayout.appellantParties) ? dossierLayout.appellantParties.length : 0,
                            opponentCount: Array.isArray(dossierLayout.opponentParties) ? dossierLayout.opponentParties.length : 0,
                            defaultAppellantIds: dossierLayout.defaultAppellantIds ?? [],
                            defaultOpponentIds: dossierLayout.defaultOpponentIds ?? [],
                        },
                        ts: Date.now(),
                    }),
                }).catch(() => {});
                // #endregion

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
                // #region debug-point E:appeal-registration-transition
                fetch('http://127.0.0.1:7777/event', {
                    method: 'POST',
                    body: JSON.stringify({
                        sessionId: 'opponent-appeal-crash',
                        runId: 'pre-fix',
                        hypothesisId: 'E',
                        location: 'useSmartFilePleadingsActions.ts:handleAppealRegistration:transition',
                        msg: '[DEBUG] applyAppealStageTransition result',
                        data: {
                            updatedStagesCount: Array.isArray(updatedStages) ? updatedStages.length : 0,
                            newActiveIndex,
                            nextStageName: updatedStages?.[newActiveIndex]?.stageName ?? null,
                            nextPartyCount: Array.isArray(updatedStages?.[newActiveIndex]?.parties)
                                ? updatedStages[newActiveIndex].parties.length
                                : 0,
                            nextTimelineCount: Array.isArray(updatedStages?.[newActiveIndex]?.timeline)
                                ? updatedStages[newActiveIndex].timeline.length
                                : 0,
                        },
                        ts: Date.now(),
                    }),
                }).catch(() => {});
                // #endregion

                setStages(updatedStages);
                setActiveStageIndex(newActiveIndex);
                setViewingStageIndex(newActiveIndex);
                saveToCloud(updatedStages, parentData, newActiveIndex);

                const nextStage = updatedStages[newActiveIndex];
                const nextName = nextStage?.stageName ?? appealMethod;
                setStatus(`مرحلة ${nextName}`);
                SmartToast.success(`تم تسجيل طعن الخصم — انتقلت الدعوى إلى ${nextName} مع نقل الملاحظات والمستندات`);
            } catch (error) {
                // #region debug-point E:appeal-registration-catch
                fetch('http://127.0.0.1:7777/event', {
                    method: 'POST',
                    body: JSON.stringify({
                        sessionId: 'opponent-appeal-crash',
                        runId: 'pre-fix',
                        hypothesisId: 'E',
                        location: 'useSmartFilePleadingsActions.ts:handleAppealRegistration:catch',
                        msg: '[DEBUG] handleAppealRegistration threw',
                        data: {
                            message: error instanceof Error ? error.message : String(error),
                            stack: error instanceof Error ? error.stack ?? null : null,
                            stageName: currentStage.stageName ?? null,
                        },
                        ts: Date.now(),
                    }),
                }).catch(() => {});
                // #endregion
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
