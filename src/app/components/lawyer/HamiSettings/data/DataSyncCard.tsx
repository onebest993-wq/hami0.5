import React from 'react';
import { Cloud, Database } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useLawyerSettingsData, useLawyerSettingsSecurity } from '@/app/context/LawyerSettingsContext';
import type { AppSettingsState } from '@/app/services/settings';
import { SettingRow, Toggle } from '../settings-ui';
import { useSettingsPatches } from '../hooks/useSettingsPatches';
import { DataSyncStatusLine } from './DataSyncStatusLine';

export function DataSyncCard() {
    const data = useLawyerSettingsData();
    const security = useLawyerSettingsSecurity();
    const { patchData } = useSettingsPatches();

    const patchDataWithToast = (partial: Partial<AppSettingsState['data']>) => {
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
    };

    return (
        <>
            <SettingRow
                icon={Database}
                label="حفظ تلقائي"
                action={
                    <Toggle
                        label="حفظ تلقائي"
                        checked={data.autoSave}
                        onChange={(v) => patchDataWithToast({ autoSave: v })}
                    />
                }
            />
            <SettingRow
                icon={Cloud}
                label="المزامنة السحابية"
                isLast
                action={
                    <Toggle
                        label="المزامنة السحابية"
                        testId="settings-toggle-data-cloudSync"
                        checked={data.cloudSync}
                        disabled={security.localOnlyMode}
                        onChange={(v) => patchDataWithToast({ cloudSync: v })}
                    />
                }
            />
            <DataSyncStatusLine />
        </>
    );
}
