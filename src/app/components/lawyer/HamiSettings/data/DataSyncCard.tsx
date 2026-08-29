import React from 'react';
import { Cloud } from '@/app/components/ui/icons/Cloud';
import { Database } from '@/app/components/ui/icons/Database';
import { SettingRow } from '../settings-ui/index';
import { AsyncSettingToggle } from '../AsyncSettingToggle';
import { useDataSyncCard } from './useDataSyncCard';

export function DataSyncCard() {
    const {
        data,
        statusMessage,
        syncNowPending,
        cloudToggleDisabled,
        onAutoSaveChange,
        onCloudSyncChange,
        onSyncNowClick,
    } = useDataSyncCard();

    return (
        <>
            <SettingRow
                icon={Database}
                label="حفظ تلقائي"
                action={
                    <AsyncSettingToggle
                        label="حفظ تلقائي"
                        checked={data.autoSave}
                        onCommit={onAutoSaveChange}
                    />
                }
            />
            <SettingRow
                icon={Cloud}
                label="المزامنة السحابية"
                isLast
                action={
                    <div className="flex items-center gap-2">
                        {statusMessage.canSyncNow ? (
                            <button
                                type="button"
                                data-testid="settings-cloud-sync-now"
                                aria-busy={syncNowPending || undefined}
                                disabled={syncNowPending}
                                onClick={onSyncNowClick}
                                className="text-[#E6C673] text-xs font-bold min-h-[44px] min-w-[44px] px-2 touch-manipulation inline-flex items-center disabled:opacity-40"
                            >
                                {syncNowPending ? 'جاري…' : 'مزامنة الآن'}
                            </button>
                        ) : null}
                        <AsyncSettingToggle
                            label="المزامنة السحابية"
                            testId="settings-toggle-data-cloudSync"
                            checked={data.cloudSync}
                            disabled={cloudToggleDisabled}
                            onCommit={onCloudSyncChange}
                        />
                    </div>
                }
            />
        </>
    );
}
