import { useCallback } from 'react';
import type { CaseStage } from '../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { logError } from '@/app/utils/errorHandler';
import { safeSetItem } from '@/app/utils/storageUtils';
import { debug } from '@/app/utils/debug';
import { buildCloudSavePayload } from '../smartFile/cloudSavePayload';
import type { SmartFileParentData } from '../smartFile/parentDataInit';

export function useSmartFilePersist(options: {
    parentData: SmartFileParentData;
    activeStageIndex: number;
    status: string;
    onUpdate?: (file: Record<string, unknown>) => void;
}) {
    const { parentData, activeStageIndex, status, onUpdate } = options;

    const saveToCloud = useCallback(
        (
            updatedStages: CaseStage[],
            updatedParent: SmartFileParentData = parentData,
            stageIndex: number = activeStageIndex,
        ) => {
            try {
                const dataToSave = buildCloudSavePayload(
                    updatedStages,
                    updatedParent,
                    stageIndex,
                    status,
                );

                onUpdate?.(dataToSave);

                const success = safeSetItem(`case_backup_${updatedParent.id}`, dataToSave);
                if (!success) {
                    debug.warn('⚠️ فشل النسخ الاحتياطي للـ localStorage');
                }
            } catch (error) {
                logError('saveToCloud', error);
                SmartToast.error('حدث خطأ أثناء الحفظ');
            }
        },
        [parentData, activeStageIndex, status, onUpdate],
    );

    return { saveToCloud };
}
