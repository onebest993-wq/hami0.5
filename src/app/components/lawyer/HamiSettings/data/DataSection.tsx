import React from 'react';
import { SettingCard } from '../settings-ui';
import { useBusinessBackup } from '../hooks/useBusinessBackup';
import { useLocalDataClear } from '../hooks/useLocalDataClear';
import { useLawyerSettingsReset } from '@/app/context/LawyerSettingsContext';
import { DataSyncCard } from './DataSyncCard';
import { BusinessBackupSection } from './BusinessBackupSection';
import { DataDangerZone } from './DataDangerZone';

export function DataSection() {
    const resetToDefaults = useLawyerSettingsReset();
    const backup = useBusinessBackup();
    const wipe = useLocalDataClear(resetToDefaults);

    return (
        <div data-testid="settings-section-data" data-settings-interactive="true">
            <SettingCard>
                <DataSyncCard />
                <BusinessBackupSection backup={backup} />
                <DataDangerZone wipe={wipe} onResetToDefaults={resetToDefaults} />
            </SettingCard>
        </div>
    );
}
