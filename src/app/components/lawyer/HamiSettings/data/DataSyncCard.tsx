import React from 'react';
import { SettingsDatabaseIcon } from '../settingsStemIconsChrome';
import { SettingsCloudIcon } from '../settingsStemIconsLazy';
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
                icon={SettingsDatabaseIcon}
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
                icon={SettingsCloudIcon}
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
                                مزامنة الآن
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
