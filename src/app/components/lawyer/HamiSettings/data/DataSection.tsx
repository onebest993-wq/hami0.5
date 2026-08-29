import React from 'react';
import { SettingCard } from '../settings-ui/index';
import { useBusinessBackup } from '../hooks/useBusinessBackup';
import { useLocalDataClear } from '../hooks/useLocalDataClear';
import { useLawyerSettingsReset } from '@/app/context/LawyerSettingsContext';
import { DataSyncCard } from './DataSyncCard';
import { BusinessBackupSection } from './BusinessBackupSection';
import { DataDangerZone } from './DataDangerZone';

export function DataSection({
    onLogout,
}: {
    onLogout?: (options?: { skipLocalPurge?: boolean }) => void | Promise<void>;
}) {
    const resetToDefaults = useLawyerSettingsReset();
    const backup = useBusinessBackup();
    const wipe = useLocalDataClear(resetToDefaults, onLogout);

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
