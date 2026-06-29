import React from 'react';
import { Database } from 'lucide-react';
import { SectionHeader, SettingCard } from '../settings-ui';
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
        <div data-testid="settings-section-data">
            <SectionHeader title="البيانات" subtitle="حفظ ونسخ وتصدير" icon={Database} />
            <SettingCard>
                <DataSyncCard />
                <BusinessBackupSection backup={backup} />
                <DataDangerZone wipe={wipe} onResetToDefaults={resetToDefaults} />
            </SettingCard>
        </div>
    );
}
