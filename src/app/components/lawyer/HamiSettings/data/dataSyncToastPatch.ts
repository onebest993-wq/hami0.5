import { SmartToast } from '@/app/components/ui/SmartToast';
import type { AppSettingsState } from '@/app/services/settings';

export function applyDataSyncToastPatch(
    patchData: (partial: Partial<AppSettingsState['data']>) => void,
    partial: Partial<AppSettingsState['data']>,
): void {
    if (partial.cloudSync === true) {
        patchData({
            cloudSync: true,
            syncNotes: true,
            syncFiles: true,
            syncExecution: true,
        });
        SmartToast.success('تم تفعيل المزامنة السحابية');
        return;
    }

    if (partial.cloudSync === false) {
        patchData({
            cloudSync: false,
            syncNotes: false,
            syncFiles: false,
            syncExecution: false,
        });
        SmartToast.info('تم إيقاف المزامنة السحابية');
        return;
    }

    patchData(partial);

    if (partial.autoSave === false) {
        SmartToast.info('تم إيقاف الحفظ التلقائي — التغييرات لن تُحفظ محلياً');
    } else if (partial.autoSave === true) {
        SmartToast.success('الحفظ التلقائي مفعّل');
    }
}
