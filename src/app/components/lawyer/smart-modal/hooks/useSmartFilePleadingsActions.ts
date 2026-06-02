import { useCallback } from 'react';
import type { CaseStage, TimelineEvent } from '../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { SmartFileParentData } from '../smartFile/parentDataInit';
import { patchActiveStage } from '../smartFile/stageMutations';

type SaveToCloud = (updatedStages: CaseStage[], parent?: SmartFileParentData) => void;

export function useSmartFilePleadingsActions(options: {
    stages: CaseStage[];
    setStages: React.Dispatch<React.SetStateAction<CaseStage[]>>;
    activeStageIndex: number;
    currentStage: CaseStage;
    parentData: SmartFileParentData;
    saveToCloud: SaveToCloud;
}) {
    const { stages, setStages, activeStageIndex, currentStage, parentData, saveToCloud } = options;

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
        (appealData: { appealMethod: string; appealCaseNo: string; appealCourt: string }) => {
            const { appealMethod, appealCaseNo, appealCourt } = appealData;
            const now = getLocalTodayYmd();

            let newStageName = stageExt.stageName ?? '';
            if (appealMethod === 'استئناف') newStageName = 'الاستئناف';
            if (appealMethod === 'تمييز') newStageName = 'التمييز';

            const timeline = [
                {
                    id: `appeal_opp_${Date.now()}`,
                    type: 'decision' as const,
                    title: '⚖️ تسجيل طعن من الخصم',
                    details: `قام الخصم بالطعن في القرار بطريق (${appealMethod}).\n\nرقم الدعوى الجديد: ${appealCaseNo || 'غير محدد'}\nالمحكمة المختصة: ${appealCourt || 'غير محدد'}\n\n🔓 تم فتح القفل لإضافة مواعيد المرافعة الجديدة.`,
                    date: now,
                    isSystemLog: true,
                    isNew: true,
                },
                ...(stageExt.timeline ?? []),
            ];

            const updated = patchActiveStage(stages, activeStageIndex, {
                stageName: newStageName,
                extraordinaryType:
                    appealMethod !== 'استئناف' && appealMethod !== 'تمييز' ? appealMethod : '',
                appealCaseNumber: appealCaseNo,
                appealCourtName: appealCourt,
                isPleadingsClosed: false,
                status: 'active',
                timeline,
            });
            commit(updated);
            SmartToast.warning(`تم تسجيل طعن الخصم (${appealMethod}) ونقل الدعوى للمرحلة التالية`);
        },
        [stages, activeStageIndex, stageExt.stageName, stageExt.timeline, commit],
    );

    return {
        handleClosePleadings,
        handleReopenPleadings,
        handleAppealRegistration,
    };
}
