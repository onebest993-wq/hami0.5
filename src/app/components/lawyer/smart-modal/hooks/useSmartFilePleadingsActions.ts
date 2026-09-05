import { useCallback } from 'react';
import type { CaseStage, TimelineEvent } from '../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import type { SmartFileParentData } from '../smartFile/parentDataInit';
import { patchActiveStage } from '../smartFile/stageMutations';
import {
    applyAppealStageTransition,
    buildOpponentAppealArchiveDetails,
    resolveOpponentAsAppellant,
} from '../smartFile/appealStageTransition';
import { resolveOpponentRegistrationAppealLayout } from '../smartFile/appealPartyEngine';
import { isAbsentJudgmentForm } from '../smartFile/absentJudgmentFlow';
import { resolveAppealStageCaseNumber } from '../smartFile/absentObjectionCaseNumber';
import {
    normalizePersonalStatusAppealMethod,
} from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import {
    applyAppealWindowLapse,
    applyCassationWindowLapse,
    isAppealWindowLapseMethod,
    isCassationWindowLapseMethod,
} from '../smartFile/appealWindowLapseEngine';
import { resolveTransitionPartyIds, resolveOpponentAppealPriorOutcome } from '../smartFile/stageOutcomeResolution';
import { resolveSelectedOpponentPartyIds } from '../smartFile/appealPartyListHelpers';
import { overlayAppellantLanesAfterAppealHop } from '../smartFile/appealChallengeTruth';
import { shouldSpawnIndependentChallengeDossier } from '@/app/domain/lawsuit/independentChallengeDossier';
import { buildIndependentChallengeSpawnInput } from '../smartFile/independentChallengeSpawnApply';
import { resolveOpponentChallengeHopSource } from '../smartFile/opponentRegistrationContext';
import { isMixedJudgmentForm } from '@/app/domain/lawsuit/partyJudgmentDisposition';
import { isAppealStageName } from '../smartFile/judgmentStageNames';
import { resolveClientMarkedParty } from '../smartFile/clientMarkedParty';
import { resolveDirectCassationBlockMessage } from '../smartFile/directCassationGate';
import { isCassationAppealMethod } from '@/app/domain/lawsuit/cassationArt210';
import { LANE_STATE_WAIVED, markLanesState } from '@/app/domain/lawsuit/partyChallengeLanes';
import {
    ART172_COVERAGE_NOTICE,
    ART172_RESUME_LABEL,
    ART172_STAY_LABEL,
    ART191_EXECUTION_STAY_NOTICE,
    applyArt172AppealResume,
    applyArt172AppealStay,
    blocksCivilDossierFinality,
    canOfferArt172AppealResume,
    canOfferArt172AppealStay,
    isAbsentClientCoveredByCoDefendantAppeal,
} from '../smartFile/art172AppealStay';
import { resolveArt172ResumeWarning } from '../smartFile/objectionAppealGuidance';
import { isGhayabiObjectionAppealType } from '@/app/domain/lawsuit/challengeAppellantEligibility';

type SaveToCloud = (
    updatedStages: CaseStage[],
    parent?: SmartFileParentData,
    stageIndex?: number,
) => void;

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
    setEditingEvent?: (event: TimelineEvent | null) => void;
    onSpawnIndependentChallengeFile?: (input: import('@/app/domain/lawsuit/independentChallengeDossier').IndependentChallengeSpawnInput) => void;
    sourceFile?: import('../../LawyerShared').FileData | null;
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
        setEditingEvent,
        onSpawnIndependentChallengeFile,
        sourceFile,
    } = options;

    const stageExt = currentStage as CaseStage & { stageName?: string; timeline?: TimelineEvent[] };

    const commit = useCallback(
        (updated: CaseStage[]) => {
            setStages(updated);
            saveToCloud(updated, parentData);
        },
        [setStages, saveToCloud, parentData],
    );

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

    const handleArt172AppealStay = useCallback(() => {
        if (
            !canOfferArt172AppealStay({
                currentStage,
                stages,
                parentIntegrity: parentData.disputeIntegrity,
            })
        ) {
            return;
        }
        const patch = applyArt172AppealStay(currentStage);
        const updated = patchActiveStage(stages, activeStageIndex, patch);
        commit(updated);
        SmartToast.success(ART172_STAY_LABEL);
    }, [stages, activeStageIndex, currentStage, parentData.disputeIntegrity, commit]);

    const handleArt172AppealResume = useCallback(() => {
        if (!canOfferArt172AppealResume(currentStage)) return;
        const patch = applyArt172AppealResume(currentStage);
        const updated = patchActiveStage(stages, activeStageIndex, patch);
        commit(updated);
        SmartToast.success(ART172_RESUME_LABEL);
        const resumeWarning = resolveArt172ResumeWarning({ stages });
        if (resumeWarning) SmartToast.info(resumeWarning);
    }, [stages, activeStageIndex, currentStage, commit]);

    const handleJoinCoObjector = useCallback((_partyId: string) => {
        SmartToast.info('المعترض اللاحق يُفتح بإضبارة مستقلة — لا يُضمّ للاعتراض القائم');
    }, []);

    const handleAppealRegistration = useCallback(
        (appealData: {
            appealMethod: string;
            appealCaseNo: string;
            appealCourt?: string;
            appellant?: string;
            filingDate?: string;
            includedAppellantPartyIds?: Array<number | string>;
            includedOpponentPartyIds?: Array<number | string>;
            appealDossierMode?: 'standard' | 'interpleader_appellant' | 'against_interpleader';
        }) => {
            try {
                const rawMethod = String(appealData.appealMethod ?? '').trim();
                if (isAppealWindowLapseMethod(rawMethod)) {
                    const patch = applyAppealWindowLapse(currentStage);
                    const updated = patchActiveStage(stages, activeStageIndex, patch);
                    commit(updated);
                    setStatus('انتهت مدة الاستئناف — يبقى طريق التمييز');
                    SmartToast.success('سُجّل انتهاء مدة الاستئناف — يبقى طريق التمييز');
                    return;
                }
                if (isCassationWindowLapseMethod(rawMethod)) {
                    const finalityParams = {
                        stages,
                        parties: currentStage.parties,
                        parentIntegrity: parentData.disputeIntegrity,
                    };
                    if (blocksCivilDossierFinality(finalityParams)) {
                        SmartToast.info(
                            isAbsentClientCoveredByCoDefendantAppeal(finalityParams)
                                ? ART172_COVERAGE_NOTICE
                                : ART191_EXECUTION_STAY_NOTICE,
                        );
                        return;
                    }
                    const patch = applyCassationWindowLapse(currentStage);
                    const updated = patchActiveStage(stages, activeStageIndex, patch);
                    commit(updated);
                    setStatus('مكتسبة الدرجة القطعية');
                    SmartToast.success('سُجّل انتهاء مدة التمييز');
                    return;
                }

                const {
                    appealMethod: rawAppealMethod,
                    appealCaseNo,
                    appealCourt,
                    appellant: appellantOverride,
                    filingDate: filingDateOverride,
                    includedAppellantPartyIds,
                    includedOpponentPartyIds,
                } = appealData;
                const appealMethod = normalizePersonalStatusAppealMethod(rawAppealMethod, {
                    stageName: currentStage.stageName,
                    stages,
                });
                const now = filingDateOverride || getLocalTodayYmd();
                const isObjectionAppeal = appealMethod.includes('اعتراض');
                const appealType = appealMethod === 'اعتراض غيابي'
                    ? 'اعتراض على الحكم الغيابي'
                    : appealMethod;
                if (isGhayabiObjectionAppealType(appealType)) {
                    // لا ضم لمعترض لاحق — إن وُجد اعتراض قائم يمرّ المسار عبر إضبارة مستقلة أدناه
                }
                const hop = resolveOpponentChallengeHopSource(stages, activeStageIndex, appealType);
                const sourceStage = hop.stage;
                const hopIndex = hop.index;
                const appellant =
                    appellantOverride
                    ?? resolveOpponentAsAppellant(
                        parentData.representedParty,
                        sourceStage.parties,
                    );
                const sourceIsGhayabi = isAbsentJudgmentForm(
                    sourceStage.judgmentForm,
                    sourceStage.lastJudgmentType,
                );
                const mixedSource = isMixedJudgmentForm(sourceStage.judgmentForm);
                const resolvedCaseNo = resolveAppealStageCaseNumber(
                    appealType,
                    appealCaseNo,
                    sourceStage.caseNo ?? parentData.caseNo,
                );

                const archiveTitle = isObjectionAppeal
                    ? '🛡️ اعتراض المدعى عليه بالحكم الغيابي'
                    : '⚖️ تسجيل طعن من الخصم';
                const archiveDetails = isObjectionAppeal
                    ? `قام المدعى عليه بالاعتراض على الحكم الغيابي.\nرقم دعوى الاعتراض: ${resolvedCaseNo || 'غير محدد'}\nتاريخ التقديم: ${now}`
                    : buildOpponentAppealArchiveDetails({
                        appealType,
                        caseNo: resolvedCaseNo,
                        court: appealCourt,
                    });

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
                if (sourceIsGhayabi && !isObjectionAppeal && !mixedSource) {
                    stagesForTransition = patchActiveStage(stages, hopIndex, {
                        judgmentForm: 'غيابي (تم ترك حق الاعتراض)',
                        lastJudgmentType: 'غيابي (متروك)',
                        awaitingAbsentJudgmentNotification: false,
                    });
                }

                const dossierLayout = resolveOpponentRegistrationAppealLayout(
                    sourceStage.parties ?? [],
                    parentData.representedParty,
                    sourceStage.incidentalCases,
                );
                const { appellantPartyIds } = resolveTransitionPartyIds(
                    sourceStage.parties,
                    'opponent_appeal',
                    includedAppellantPartyIds,
                    includedOpponentPartyIds,
                );
                const opponentPartyIds = resolveSelectedOpponentPartyIds(
                    sourceStage.parties,
                    appellantPartyIds,
                    includedOpponentPartyIds,
                    sourceStage.incidentalCases,
                );
                const sourceName = String(sourceStage.stageName ?? sourceStage.name ?? '');
                const lanesForGate =
                    sourceIsGhayabi && !isObjectionAppeal && isCassationAppealMethod(appealType)
                        ? markLanesState(
                            sourceStage.partyChallengeLanes,
                            appellantPartyIds,
                            LANE_STATE_WAIVED,
                        )
                        : sourceStage.partyChallengeLanes;
                const directCassationBlock = resolveDirectCassationBlockMessage({
                    sourceStageName: sourceName,
                    appealType,
                    lanes: lanesForGate,
                    partyIds: appellantPartyIds,
                    today: now,
                });
                if (directCassationBlock) {
                    SmartToast.error(directCassationBlock);
                    return;
                }

                const hopParams = {
                    appealType,
                    appellant,
                    filingDate: now,
                    newCaseNumber: resolvedCaseNo,
                    newCourt: appealCourt,
                    archiveTimelineEvent: archiveEvent,
                    archiveFinalDecision: isObjectionAppeal
                        ? 'حكم غيابي — اعترض المدعى عليه'
                        : sourceIsGhayabi
                          ? `حكم غيابي — ترك الاعتراض وطعن بـ${appealType}`
                          : undefined,
                    archiveDecisionDate: sourceStage.decisionDate ?? now,
                    includedAppellantPartyIds: appellantPartyIds,
                    includedOpponentPartyIds: opponentPartyIds,
                    priorStageOutcome: resolveOpponentAppealPriorOutcome(
                        stagesForTransition[hopIndex] ?? sourceStage,
                    ),
                    dossierLayout: {
                        ...dossierLayout,
                        appellantLegalSide: appellant,
                        defaultAppellantIds:
                            includedAppellantPartyIds ?? dossierLayout.defaultAppellantIds,
                        defaultOpponentIds:
                            includedOpponentPartyIds ?? dossierLayout.defaultOpponentIds,
                    },
                    priorJudgmentType:
                        sourceStage.lastJudgmentType
                        ?? sourceStage.finalDecision
                        ?? undefined,
                };

                const hopSource = stagesForTransition[hopIndex] ?? sourceStage;
                if (
                    shouldSpawnIndependentChallengeDossier({
                        stages: stagesForTransition,
                        sourceStage: hopSource,
                        appealType,
                    })
                ) {
                    const sourceFileId = Number(sourceFile?.id ?? parentData.id);
                    if (!onSpawnIndependentChallengeFile) {
                        SmartToast.error('تعذّر إنشاء إضبارة طعن مستقلة — المسار غير متصل');
                        return;
                    }
                    const spawn = buildIndependentChallengeSpawnInput({
                        sourceFileId,
                        stages: stagesForTransition,
                        sourceStageIndex: hopIndex,
                        sourceStage: hopSource,
                        hop: hopParams,
                        sourceFile,
                    });
                    if ('error' in spawn) {
                        SmartToast.error(spawn.error);
                        return;
                    }
                    onSpawnIndependentChallengeFile(spawn);
                    return;
                }

                const { updatedStages: transitionedStages, newActiveIndex } = applyAppealStageTransition(
                    stagesForTransition,
                    hopIndex,
                    hopSource,
                    hopParams,
                );
                const updatedStages = overlayAppellantLanesAfterAppealHop({
                    stages: transitionedStages,
                    sourceIndex: hopIndex,
                    destIndex: newActiveIndex,
                    appellantPartyIds,
                    today: now,
                });

                const clientParty = resolveClientMarkedParty(sourceStage.parties);
                const clientId = String((clientParty as { id?: unknown } | null)?.id ?? '').trim();
                const clientIsObjector =
                    Boolean(clientId)
                    && appellantPartyIds.some((id) => String(id) === clientId);
                const keepAppealFocus =
                    isObjectionAppeal
                    && hopIndex !== activeStageIndex
                    && isAppealStageName(String(currentStage.stageName ?? currentStage.name ?? ''))
                    && !clientIsObjector;
                const focusIndex = keepAppealFocus ? activeStageIndex : newActiveIndex;

                setEditingEvent?.(null);
                setStages(updatedStages);
                setActiveStageIndex(focusIndex);
                setViewingStageIndex(focusIndex);
                saveToCloud(updatedStages, parentData, focusIndex);

                const nextStage = updatedStages[focusIndex];
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
            setEditingEvent,
            commit,
            onSpawnIndependentChallengeFile,
            sourceFile,
        ],
    );

    return {
        handleReopenPleadings,
        handleArt172AppealStay,
        handleArt172AppealResume,
        handleJoinCoObjector,
        handleAppealRegistration,
    };
}
