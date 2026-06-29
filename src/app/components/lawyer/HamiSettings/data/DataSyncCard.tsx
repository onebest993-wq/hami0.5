import React from 'react';
import { Bell, Cloud, Database } from 'lucide-react';
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
        patchData(partial);
        if (partial.weeklyBackupReminder === true) {
            SmartToast.info('سيظهر التذكير مرة كل أسبوع عند فتح لوحة المحامي');
        }
        if (partial.autoSave === false) {
            SmartToast.info('تم إيقاف الحفظ التلقائي — التغييرات لن تُحفظ محلياً');
        } else if (partial.autoSave === true) {
            SmartToast.success('الحفظ التلقائي مفعّل');
        }
        if (partial.cloudSync === true) {
            SmartToast.success('تم تفعيل المزامنة السحابية');
        } else if (partial.cloudSync === false) {
            SmartToast.info('تم إيقاف المزامنة السحابية');
        }
    };

    const cloudDisabled = !data.cloudSync || security.localOnlyMode;

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
                subLabel={security.localOnlyMode ? 'معطّلة أثناء «قطع الاتصال»' : undefined}
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
            <div className={cloudDisabled ? 'opacity-40 pointer-events-none' : ''}>
                <SettingRow
                    icon={Database}
                    label="مزامنة الملاحظات"
                    action={
                        <Toggle
                            label="مزامنة الملاحظات"
                            testId="settings-toggle-data-syncNotes"
                            checked={data.syncNotes}
                            onChange={(v) => patchData({ syncNotes: v })}
                        />
                    }
                />
                <SettingRow
                    icon={Database}
                    label="مزامنة القضايا"
                    action={
                        <Toggle
                            label="مزامنة القضايا"
                            testId="settings-toggle-data-syncFiles"
                            checked={data.syncFiles}
                            onChange={(v) => patchData({ syncFiles: v })}
                        />
                    }
                />
                <SettingRow
                    icon={Database}
                    label="مزامنة التنفيذ"
                    action={
                        <Toggle
                            label="مزامنة التنفيذ"
                            testId="settings-toggle-data-syncExecution"
                            checked={data.syncExecution}
                            onChange={(v) => patchData({ syncExecution: v })}
                        />
                    }
                />
            </div>
            <SettingRow
                icon={Bell}
                label="تذكير نسخ أسبوعي"
                action={
                    <Toggle
                        label="تذكير نسخ أسبوعي"
                        checked={data.weeklyBackupReminder}
                        onChange={(v) => patchDataWithToast({ weeklyBackupReminder: v })}
                    />
                }
            />
        </>
    );
}
