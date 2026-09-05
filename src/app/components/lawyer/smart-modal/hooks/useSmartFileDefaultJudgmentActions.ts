import { useCallback } from 'react';
import type { CaseStage, TimelineEvent } from '../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { patchActiveStage } from '../smartFile/stageMutations';
import { syncLawsuitTimelineAppointment } from '@/app/services/calendar/dossierSyncLazy';
import { recordAbsentJudgmentNotification } from '../smartFile/recordAbsentJudgmentNotification';
import { openAbsentObjectionStage } from '../smartFile/absentObjectionStageOpen';
import { resolveFirstInstanceActionSource } from '../smartFile/opponentRegistrationContext';
import { applyAppealWindowLapse, applyCassationWindowLapse } from '../smartFile/appealWindowLapseEngine';
import {
    ART172_COVERAGE_NOTICE,
    ART191_EXECUTION_STAY_NOTICE,
    blocksCivilDossierFinality,
    isAbsentClientCoveredByCoDefendantAppeal,
} from '../smartFile/art172AppealStay';
import { isMixedJudgmentForm, normalizePartyJudgmentDispositions } from '@/app/domain/lawsuit/partyJudgmentDisposition';
import {
    LANE_STATE_WAIVED,
    applySeverableLaneLapses,
    attachPartyChallengeLanes,
    hasUnservedGhayabiLane,
    listUnservedGhayabiNoticeOptions,
    markLanesState,
    resolveGhayabiObjectorPartyIds,
} from '@/app/domain/lawsuit/partyChallengeLanes';

type SaveToCloud = (
    updatedStages: CaseStage[],
    updatedParent?: unknown,
    stageIndex?: number,
) => void;

export function useSmartFileDefaultJudgmentActions(options: {
    stages: CaseStage[];
    setStages: React.Dispatch<React.SetStateAction<CaseStage[]>>;
    activeStageIndex: number;
    setActiveStageIndex: React.Dispatch<React.SetStateAction<number>>;
    setViewingStageIndex: React.Dispatch<React.SetStateAction<number>>;
    currentStage: CaseStage;
    saveToCloud: SaveToCloud;
    setStatus: React.Dispatch<React.SetStateAction<string>>;
    setShowObjectionRegistrationModal: (v: boolean) => void;
    setShowAbsentJudgmentNotificationModal: (v: boolean) => void;
    setShowOpponentAbsentObjectionModal: (v: boolean) => void;
    calendarUserId?: string | null;
    lawsuitFileId?: string | number;
    caseNo?: string;
    court?: string;
    parties?: unknown;
    clientName?: string;
    parentIntegrity?: import('../smartFile/art172AppealStay').Art172JudgmentSource['disputeIntegrity'];
}) {
    const {
        stages,
        setStages,
        activeStageIndex,
        setActiveStageIndex,
        setViewingStageIndex,
        currentStage,
        saveToCloud,
        setStatus,
        setShowObjectionRegistrationModal,
        setShowAbsentJudgmentNotificationModal,
        setShowOpponentAbsentObjectionModal,
        calendarUserId,
        lawsuitFileId,
        caseNo,
        court,
        parties,
        clientName,
        parentIntegrity,
    } = options;

    const stageExt = currentStage as CaseStage & {
        stageName?: string;
        timeline?: TimelineEvent[];
        judgmentForm?: string;
        legalTimers?: CaseStage['legalTimers'];
    };

    const commit = useCallback(
        (updated: CaseStage[], stageIndex?: number) => {
            setStages(updated);
            saveToCloud(updated, undefined, stageIndex);
        },
        [setStages, saveToCloud],
    );

    const handleDefaultObjection = useCallback(() => {
        setShowObjectionRegistrationModal(true);
    }, [setShowObjectionRegistrationModal]);

    const handleOpenAbsentJudgmentNotification = useCallback(() => {
        setShowAbsentJudgmentNotificationModal(true);
    }, [setShowAbsentJudgmentNotificationModal]);

    const handleOpenOpponentAbsentObjection = useCallback(() => {
        setShowOpponentAbsentObjectionModal(true);
    }, [setShowOpponentAbsentObjectionModal]);

    const handleAbsentJudgmentNotification = useCallback(
        (data: { notificationDate: string; partyId?: string; partyIds?: string[] }) => {
            const source = resolveFirstInstanceActionSource(stages, currentStage);
            const recorded = recordAbsentJudgmentNotification({
                sourceStage: source.stage,
                notificationDate: data.notificationDate,
                partyId: data.partyId,
                partyIds: data.partyIds,
                todayYmd: getLocalTodayYmd(),
            });
            if (!recorded.ok) {
                SmartToast.error(recorded.error);
                return;
            }
            commit(patchActiveStage(stages, source.index, recorded.patch));
            SmartToast.success(
                recorded.stillAwaiting
                    ? `سُجّل تبليغ ${recorded.partyName || 'الغائب'} — يبقى غائب بانتظار التبليغ`
                    : 'تم تسجيل التبليغ',
            );
        },
        [stages, currentStage, commit],
    );

    const handleOpponentAbsentObjection = useCallback(
        (data: { newCaseNumber: string; filingDate: string; objectorPartyId?: string }) => {
            const { newCaseNumber, filingDate } = data;
            const source = resolveFirstInstanceActionSource(stages, currentStage);
            const sourceStage = source.stage;
            const objectorPartyIds = resolveGhayabiObjectorPartyIds({
                parties: sourceStage.parties,
                dispositions: sourceStage.partyJudgmentDispositions,
                explicitIds: data.objectorPartyId ? [data.objectorPartyId] : undefined,
            });
            if (objectorPartyIds.length === 0 && listUnservedGhayabiNoticeOptions({
                parties: sourceStage.parties,
                dispositions: sourceStage.partyJudgmentDispositions,
                lanes: sourceStage.partyChallengeLanes,
            }).length > 1) {
                SmartToast.error('حدّد الطرف الغائب المعترض — لا يُقلب بقية المدعى عليهم');
                return;
            }
            const mixed = isMixedJudgmentForm(sourceStage.judgmentForm);
            const archiveEvent: TimelineEvent = {
                id: `opp_abs_obj_${Date.now()}`,
                type: 'decision',
                date: filingDate,
                title: '🛡️ اعتراض المدعى عليه بالحكم الغيابي',
                details: `قام المدعى عليه بالاعتراض على الحكم الغيابي.\nتاريخ التقديم: ${filingDate}`,
                isNew: true,
            };

            const opened = openAbsentObjectionStage({
                stages,
                activeStageIndex: source.index,
                currentStage: sourceStage,
                filingDate,
                sourceCaseNo: sourceStage.caseNo ?? caseNo,
                newCaseNumber,
                objectorPartyIds,
                archiveTimelineEvent: archiveEvent,
                archiveFinalDecision: mixed
                    ? 'اعترض الطرف الغائب'
                    : 'حكم غيابي — اعترض المدعى عليه',
                archiveDecisionDate: sourceStage.decisionDate ?? filingDate,
            });

            if (opened.needsIndependentDossier) {
                SmartToast.info(
                    'يوجد اعتراض قائم — سجّل اعتراض الطرف اللاحق كإضبارة مستقلة من زر الطعن (اختيار المعترض)',
                );
                return;
            }

            const { updatedStages, newActiveIndex } = opened;

            const newStage = updatedStages[newActiveIndex];
            setStages(updatedStages);
            setActiveStageIndex(newActiveIndex);
            setViewingStageIndex(newActiveIndex);
            saveToCloud(updatedStages, undefined, newActiveIndex);
            setStatus(`مرحلة ${newStage?.stageName ?? 'الاعتراض على الحكم الغيابي'}`);
            SmartToast.success(`تم فتح إضبارة ${newStage?.stageName ?? 'الاعتراض'} — انقلاب المراكز القانونية ✅`);
        },
        [
            stages,
            activeStageIndex,
            currentStage,
            caseNo,
            stageExt.decisionDate,
            setStages,
            setActiveStageIndex,
            setViewingStageIndex,
            saveToCloud,
            setStatus,
        ],
    );

    const handleOpponentAppealWaived = useCallback(() => {
        const today = getLocalTodayYmd();
        const patch = applyAppealWindowLapse(currentStage, today);
        const updated = patchActiveStage(stages, activeStageIndex, patch);
        commit(updated);
        setStatus('انتهت مدة الاستئناف — يبقى طريق التمييز');
        SmartToast.success('سُجّل انتهاء مدة الاستئناف — يبقى طريق التمييز');
    }, [stages, activeStageIndex, currentStage, commit, setStatus]);

    const handleCassationWindowLapse = useCallback(() => {
        const finalityParams = {
            stages,
            parties: currentStage.parties,
            parentIntegrity,
        };
        if (blocksCivilDossierFinality(finalityParams)) {
            SmartToast.info(
                isAbsentClientCoveredByCoDefendantAppeal(finalityParams)
                    ? ART172_COVERAGE_NOTICE
                    : ART191_EXECUTION_STAY_NOTICE,
            );
            return;
        }
        const today = getLocalTodayYmd();
        const patch = applyCassationWindowLapse(currentStage, today);
        const updated = patchActiveStage(stages, activeStageIndex, patch);
        commit(updated);
        setStatus('مكتسبة الدرجة القطعية');
        SmartToast.success('سُجّل انتهاء مدة التمييز');
    }, [stages, activeStageIndex, currentStage, parentIntegrity, commit, setStatus]);

    const handleWaiveObjection = useCallback(() => {
        const objectorPartyIds = resolveGhayabiObjectorPartyIds({
            parties: currentStage.parties,
            dispositions: currentStage.partyJudgmentDispositions,
            preferClient: true,
        });
        const mixed = isMixedJudgmentForm(stageExt.judgmentForm);
        const lanes = applySeverableLaneLapses(
            markLanesState(
                attachPartyChallengeLanes(currentStage, {
                    judgmentDate: currentStage.decisionDate,
                    integrity: currentStage.disputeIntegrity,
                    today: getLocalTodayYmd(),
                }).partyChallengeLanes,
                objectorPartyIds,
                LANE_STATE_WAIVED,
            ),
            currentStage.disputeIntegrity,
            getLocalTodayYmd(),
        );
        const timeline = [
            {
                id: `waive_obj_${Date.now()}`,
                type: 'decision' as const,
                date: getLocalTodayYmd(),
                title: '⏭️ ترك الحكم الغيابي',
                details:
                    'تم اختيار ترك الحكم غيابياً وتجاوز مرحلة الاعتراض لغرض الطعن الاستئنافي/التمييزي مباشرة.',
                isSystemLog: true,
                isNew: true,
            },
            ...(stageExt.timeline ?? []),
        ];

        const updated = patchActiveStage(stages, activeStageIndex, {
            ...(mixed
                ? {}
                : {
                    judgmentForm: 'غيابي (تم ترك حق الاعتراض)',
                    lastJudgmentType: 'غيابي (متروك)',
                }),
            partyChallengeLanes: lanes,
            awaitingAbsentJudgmentNotification: hasUnservedGhayabiLane(lanes),
            timeline,
        });
        commit(updated);
        SmartToast.info('تم تجاوز مرحلة الاعتراض. يمكنك الآن تقديم الطعن 🔓');
    }, [stages, activeStageIndex, currentStage, stageExt.judgmentForm, stageExt.timeline, commit]);

    const handleRegisterObjection = useCallback(
        (data: { objectionDate: string; sessionDate: string; receiptNumber: string }) => {
            const { objectionDate, sessionDate } = data;
            const source = resolveFirstInstanceActionSource(stages, currentStage);
            const sourceStage = source.stage;
            const archiveEvent: TimelineEvent = {
                id: `reg_obj_${Date.now()}`,
                type: 'decision',
                date: objectionDate,
                title: '🛡️ تسجيل اعتراض غيابي',
                details: `تم تقديم الاعتراض الغيابي وتحديد موعد الجلسة الأولى بتاريخ ${sessionDate}.`,
                isNew: true,
            };

            const objectorPartyIds = resolveGhayabiObjectorPartyIds({
                parties: sourceStage.parties,
                dispositions: sourceStage.partyJudgmentDispositions,
                preferClient: true,
            });
            if (
                objectorPartyIds.length === 0
                && normalizePartyJudgmentDispositions(sourceStage.partyJudgmentDispositions).length > 0
            ) {
                SmartToast.error('الاعتراض الغيابي قاصر على الموكل الغائب في هذه الإضبارة');
                return;
            }
            const mixed = isMixedJudgmentForm(sourceStage.judgmentForm);
            const opened = openAbsentObjectionStage({
                stages,
                activeStageIndex: source.index,
                currentStage: sourceStage,
                filingDate: objectionDate,
                sourceCaseNo: sourceStage.caseNo ?? caseNo,
                objectorPartyIds,
                archiveTimelineEvent: archiveEvent,
                archiveFinalDecision: mixed
                    ? 'اعترض الطرف الغائب'
                    : 'حكم غيابي — اعترض المدعى عليه',
                archiveDecisionDate: sourceStage.decisionDate ?? objectionDate,
                sessionDate,
            });

            if (opened.needsIndependentDossier) {
                SmartToast.info(
                    'يوجد اعتراض قائم — سجّل اعتراض الطرف اللاحق كإضبارة مستقلة من زر الطعن (اختيار المعترض)',
                );
                return;
            }

            const { updatedStages, newActiveIndex, resolvedCaseNumber, sessionEventId } = opened;
            const newStage = updatedStages[newActiveIndex];
            setStages(updatedStages);
            setActiveStageIndex(newActiveIndex);
            setViewingStageIndex(newActiveIndex);
            saveToCloud(updatedStages, undefined, newActiveIndex);
            setStatus(`مرحلة ${newStage?.stageName ?? 'الاعتراض على الحكم الغيابي'}`);

            if (lawsuitFileId != null && sessionEventId) {
                syncLawsuitTimelineAppointment({
                    userId: calendarUserId,
                    fileId: lawsuitFileId,
                    event: {
                        id: sessionEventId,
                        date: sessionDate,
                        title: 'جلسة مرافعة (اعتراض غيابي)',
                        details: 'نظر الاعتراض الغيابي',
                    },
                    caseNo: resolvedCaseNumber || caseNo,
                    court,
                    parties,
                    clientName,
                });
            }
            SmartToast.success(
                `تم فتح إضبارة ${newStage?.stageName ?? 'الاعتراض'} — انقلاب المراكز القانونية ✅`,
            );
        },
        [
            stages,
            activeStageIndex,
            currentStage,
            caseNo,
            stageExt.decisionDate,
            setStages,
            setActiveStageIndex,
            setViewingStageIndex,
            saveToCloud,
            setStatus,
            calendarUserId,
            lawsuitFileId,
            court,
            parties,
            clientName,
        ],
    );

    const handleOtherAppeals = useCallback(() => {
        const updated = patchActiveStage(stages, activeStageIndex, {
            isPleadingsClosed: false,
            status: 'active',
        });
        commit(updated);
        SmartToast.info('تم فك قفل الدعوى. يرجى تسجيل مرحلة الطعن يدوياً 🔓');
    }, [stages, activeStageIndex, commit]);

    return {
        handleDefaultObjection,
        handleWaiveObjection,
        handleOpponentAppealWaived,
        handleCassationWindowLapse,
        handleRegisterObjection,
        handleOtherAppeals,
        handleOpenAbsentJudgmentNotification,
        handleAbsentJudgmentNotification,
        handleOpenOpponentAbsentObjection,
        handleOpponentAbsentObjection,
    };
}
