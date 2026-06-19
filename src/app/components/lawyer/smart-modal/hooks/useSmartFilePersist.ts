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
            let dataToSave: Record<string, unknown>;
            try {
                dataToSave = buildCloudSavePayload(
                    updatedStages,
                    updatedParent,
                    stageIndex,
                    status,
                );
            } catch (error) {
                logError('saveToCloud.buildPayload', error);
                SmartToast.error('حدث خطأ أثناء تجهيز البيانات للحفظ');
                return;
            }

            const backupKey = `case_backup_${String(updatedParent.id ?? 'unknown')}`;
            const backupOk = safeSetItem(backupKey, dataToSave);
            if (!backupOk) {
                debug.warn('⚠️ فشل النسخ الاحتياطي للـ localStorage');
            }

            if (!onUpdate) return;

            try {
                onUpdate(dataToSave);
            } catch (error) {
                logError('saveToCloud.onUpdate', error);
                if (backupOk) {
                    SmartToast.warning('تم الحفظ محلياً — تعذّر مزامنة السحابة');
                } else {
                    SmartToast.error('حدث خطأ أثناء الحفظ');
                }
            }
        },
        [parentData, activeStageIndex, status, onUpdate],
    );

    return { saveToCloud };
}
