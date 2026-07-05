import { useCallback } from 'react';
import type { CaseStage, NotificationStatus } from '../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';
import type { SmartFileParentData } from '../smartFile/parentDataInit';
import {
    buildNotificationTogglePatch,
    cycleDefendantNotificationStatus,
    parseStepperStageIndex,
    patchActiveStage,
} from '../smartFile/stageMutations';

type SaveToCloud = (
    updatedStages: CaseStage[],
    updatedParent?: SmartFileParentData,
    stageIndex?: number,
) => void;

type ModalSetters = {
    setShowApptModal: (v: boolean) => void;
    setShowNoteModal: (v: boolean) => void;
    setShowDocModal: (v: boolean) => void;
    setShowIncidentalModal: (v: boolean) => void;
    setShowInterlocutoryModal: (v: boolean) => void;
    setShowFastTrackModal: (v: boolean) => void;
    setShowAttachmentModal: (v: boolean) => void;
};

export function useSmartFileStageActions(options: {
    stages: CaseStage[];
    setStages: React.Dispatch<React.SetStateAction<CaseStage[]>>;
    activeStageIndex: number;
    viewingStageIndex: number;
    setActiveStageIndex: React.Dispatch<React.SetStateAction<number>>;
    setViewingStageIndex: React.Dispatch<React.SetStateAction<number>>;
    currentStage: CaseStage;
    displayStage: CaseStage;
    parentData: SmartFileParentData;
    setParentData: React.Dispatch<React.SetStateAction<SmartFileParentData>>;
    saveToCloud: SaveToCloud;
    modalSetters: ModalSetters;
    setIsEditingStageName: (v: boolean) => void;
    tempStageName: string;
}) {
    const {
        stages,
        setStages,
        activeStageIndex,
        viewingStageIndex,
        setActiveStageIndex,
        setViewingStageIndex,
        currentStage,
        displayStage,
        parentData,
        setParentData,
        saveToCloud,
        modalSetters,
        setIsEditingStageName,
        tempStageName,
    } = options;

    const targetStageIndex =
        viewingStageIndex >= 0 && viewingStageIndex < stages.length
            ? viewingStageIndex
            : activeStageIndex;

    const commitStages = useCallback(
        (updated: CaseStage[], parentOverride?: SmartFileParentData, stageIndex?: number) => {
            setStages(updated);
            saveToCloud(updated, parentOverride ?? parentData, stageIndex);
        },
        [setStages, saveToCloud, parentData],
    );

    const handleUpdateHeader = useCallback(
        (newData: Record<string, unknown>) => {
            const updated = patchActiveStage(stages, targetStageIndex, {
                court: newData.court,
                judge: newData.judge,
                caseNo: newData.caseNo,
                parties: newData.parties,
            });
            commitStages(updated);
        },
        [stages, targetStageIndex, commitStages],
    );

    const handleUpdateCaseInfo = useCallback(
        (newData: Record<string, unknown>) => {
            if (newData.type) {
                setParentData((prev) => ({ ...prev, docType: String(newData.type) }));
            }
            if (newData.representedParty !== undefined) {
                setParentData((prev) => ({
                    ...prev,
                    representedParty:
                        typeof newData.representedParty === 'string'
                            ? newData.representedParty
                            : null,
                }));
            }

            const stageExt = currentStage as CaseStage & { stageName?: string };
            const updated = patchActiveStage(stages, targetStageIndex, {
                court: newData.court,
                judge: newData.judge,
                caseNo: newData.caseNo,
                parties: newData.parties,
                stageName: (newData.stageName as string) || stageExt.stageName,
                extraordinaryAppealType: newData.extraordinaryType,
                type: newData.type,
                hasCrossAppeal: newData.hasCrossAppeal,
                firstInstanceCaseNumber: newData.firstInstanceCaseNumber,
                firstInstanceCourt: newData.firstInstanceCourt,
            });

            const nextParent: SmartFileParentData = {
                ...parentData,
                docType: newData.type ? String(newData.type) : parentData.docType,
                representedParty:
                    newData.representedParty !== undefined
                        ? typeof newData.representedParty === 'string'
                            ? newData.representedParty
                            : null
                        : parentData.representedParty,
            };
            commitStages(updated, nextParent);
        },
        [stages, targetStageIndex, currentStage, parentData, setParentData, commitStages],
    );

    const handleSaveNotification = useCallback(
        (data: { targetPerson: string; reason: string; isCompleted: boolean }) => {
            const { targetPerson, reason, isCompleted } = data;
            const now = new Date().toISOString();
            const dateStr = now.split('T')[0]!;

            const updated = patchActiveStage(stages, activeStageIndex, (stage) => {
                if (isCompleted) {
                    const timeline = [
                        {
                            id: `notif_${Date.now()}`,
                            type: 'decision' as const,
                            date: dateStr,
                            title: 'إتمام تبليغ قضائي ✅',
                            details: `تم تبليغ (${targetPerson}) بـ: ${reason}`,
                            isSystemLog: true,
                            isNew: true,
                        },
                        ...(stage.timeline || []),
                    ];
                    return { ...stage, timeline };
                }

                const newTask = {
                    id: `task_${Date.now()}`,
                    title: `متابعة تبليغ: ${targetPerson}`,
                    details: `السبب: ${reason}`,
                    isCompleted: false,
                    dueDate: dateStr,
                };
                return { ...stage, tasks: [newTask, ...(stage.tasks || [])] };
            });

            commitStages(updated);
            SmartToast.success(
                isCompleted ? 'تم حفظ التبليغ وإضافته للسجل ✅' : 'تم إضافة مهمة متابعة التبليغ ⏳',
            );
        },
        [stages, activeStageIndex, commitStages],
    );

    const handleStageSelect = useCallback(
        (stageId: string) => {
            debug.log('🎯 تم الضغط على المرحلة:', stageId);
            const stageIndex = parseStepperStageIndex(stageId, stages.length);
            if (stageIndex === null) {
                debug.error('❌ خطأ: index خارج النطاق:', stageId, 'عدد المراحل:', stages.length);
                return;
            }

            debug.log('✅ الانتقال للمرحلة:', stages[stageIndex]?.stageName, 'Index:', stageIndex);
            setViewingStageIndex(stageIndex);
            if (stages[stageIndex]?.status === 'active') {
                setActiveStageIndex(stageIndex);
            }
        },
        [stages, setViewingStageIndex, setActiveStageIndex],
    );

    const handleQuickAction = useCallback(
        (actionId: string) => {
            const m = modalSetters;
            if (actionId === 'appointment') m.setShowApptModal(true);
            if (actionId === 'note') m.setShowNoteModal(true);
            if (actionId === 'document') m.setShowDocModal(true);
            if (actionId === 'incidental') m.setShowIncidentalModal(true);
            if (actionId === 'interlocutory_appeal') m.setShowInterlocutoryModal(true);
            if (actionId === 'fast_track') m.setShowFastTrackModal(true);
            if (actionId === 'attachment_shield') m.setShowAttachmentModal(true);
        },
        [modalSetters],
    );

    const handleToggleNotification = useCallback(() => {
        const stageExt = currentStage as CaseStage & {
            parties?: { notificationStatus?: string }[];
            defendantNotificationStatus?: string;
        };
        const partyStatus = stageExt.parties?.[1]?.notificationStatus;
        const currentStatus = partyStatus || stageExt.defendantNotificationStatus || 'waiting';
        const nextStatus = cycleDefendantNotificationStatus(
            (partyStatus || stageExt.defendantNotificationStatus || 'pending') as NotificationStatus,
        );
        const updated = patchActiveStage(
            stages,
            activeStageIndex,
            buildNotificationTogglePatch(currentStage, nextStatus),
        );
        commitStages(updated);
    }, [stages, activeStageIndex, currentStage, commitStages]);

    const handleSaveStageName = useCallback(
        (e: React.MouseEvent | React.KeyboardEvent) => {
            e.stopPropagation();
            if (!tempStageName.trim()) return;

            const updated = patchActiveStage(stages, targetStageIndex, { stageName: tempStageName });
            commitStages(updated, parentData);
            setIsEditingStageName(false);
        },
        [stages, targetStageIndex, tempStageName, parentData, commitStages, setIsEditingStageName],
    );

    const setCaseData = useCallback(
        (updater: ((data: CaseStage) => CaseStage) | Record<string, unknown>) => {
            const newData =
                typeof updater === 'function'
                    ? (updater(displayStage) as unknown as Record<string, unknown>)
                    : updater;
            if (newData.stage && !newData.stageName) {
                newData.stageName = newData.stage;
            }
            const updated = patchActiveStage(stages, targetStageIndex, newData);
            commitStages(updated);
        },
        [stages, targetStageIndex, displayStage, commitStages],
    );

    const handleToggleClient = useCallback(() => {}, []);

    return {
        handleUpdateHeader,
        handleUpdateCaseInfo,
        handleSaveNotification,
        handleStageSelect,
        handleQuickAction,
        handleToggleNotification,
        handleSaveStageName,
        setCaseData,
        handleToggleClient,
    };
}
