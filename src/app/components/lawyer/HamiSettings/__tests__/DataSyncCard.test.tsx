import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const patchData = vi.fn();
const success = vi.fn();
const info = vi.fn();

let dataState = {
    autoSave: true,
    cloudSync: false,
};

let securityState = {
    localOnlyMode: false,
};

vi.mock('@/app/context/LawyerSettingsContext', () => ({
    useLawyerSettingsData: () => dataState,
    useLawyerSettingsSecurity: () => securityState,
}));

vi.mock('@/app/components/lawyer/HamiSettings/hooks/useSettingsPatches', () => ({
    useSettingsPatches: () => ({ patchData }),
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        success: (...args: unknown[]) => success(...args),
        info: (...args: unknown[]) => info(...args),
    },
}));

vi.mock('@/app/components/lawyer/HamiSettings/data/DataSyncStatusLine', () => ({
    DataSyncStatusLine: () => <div data-testid="settings-sync-status-line-mock" />,
}));

import { DataSyncCard } from '@/app/components/lawyer/HamiSettings/data/DataSyncCard';

describe('DataSyncCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        dataState = { autoSave: true, cloudSync: false };
        securityState = { localOnlyMode: false };
    });

    it('يفعّل المزامنة السحابية مع كل السلات التابعة', () => {
        render(<DataSyncCard />);

        fireEvent.click(screen.getByTestId('settings-toggle-data-cloudSync'));

        expect(patchData).toHaveBeenCalledWith({
            cloudSync: true,
            syncNotes: true,
            syncFiles: true,
            syncExecution: true,
        });
        expect(success).toHaveBeenCalledWith('تم تفعيل المزامنة السحابية');
    });

    it('يعطّل زر المزامنة السحابية أثناء localOnlyMode', () => {
        securityState = { localOnlyMode: true };
        render(<DataSyncCard />);

        expect(screen.getByTestId('settings-toggle-data-cloudSync')).toBeDisabled();
    });
});
