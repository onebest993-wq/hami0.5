import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';

const patchData = vi.fn();
const success = vi.fn();
const info = vi.fn();
const warning = vi.fn();

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
        warning: (...args: unknown[]) => warning(...args),
        error: vi.fn(),
    },
}));

vi.mock('@/lib/cloudSyncEnv.js', () => ({
    isCloudSyncEnabled: () => true,
}));

vi.mock('@/lib/syncService.js', () => ({
    resolveCloudSyncUserKey: vi.fn(async () => 'user-uuid-1'),
    collectAppData: vi.fn((overrides?: { lawyer_settings?: unknown }) => ({
        lawyer_settings: overrides?.lawyer_settings ?? {},
    })),
    saveToCloud: vi.fn(async () => ({})),
}));

vi.mock('@/app/components/ui/SmartDialog', () => ({
    SmartDialog: {
        confirm: vi.fn(),
    },
}));

import { DataSyncCard } from '@/app/components/lawyer/HamiSettings/data/DataSyncCard';

describe('DataSyncCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        dataState = { autoSave: true, cloudSync: false };
        securityState = { localOnlyMode: false };
        vi.mocked(SmartDialog.confirm).mockResolvedValue(true);
    });

    it('يفعّل المزامنة السحابية بعد التأكيد مع كل السلات التابعة', async () => {
        render(<DataSyncCard />);

        fireEvent.click(screen.getByTestId('settings-toggle-data-cloudSync'));

        await waitFor(() => {
            expect(SmartDialog.confirm).toHaveBeenCalled();
            expect(patchData).toHaveBeenCalledWith({
                cloudSync: true,
                syncNotes: true,
                syncFiles: true,
                syncExecution: true,
            });
        });
        expect(success).toHaveBeenCalledWith('تم تفعيل المزامنة السحابية');
    });

    it('لا يفعّل المزامنة عند إلغاء التأكيد', async () => {
        vi.mocked(SmartDialog.confirm).mockResolvedValueOnce(false);
        render(<DataSyncCard />);

        fireEvent.click(screen.getByTestId('settings-toggle-data-cloudSync'));

        await waitFor(() => {
            expect(SmartDialog.confirm).toHaveBeenCalled();
        });
        expect(patchData).not.toHaveBeenCalled();
    });

    it('يطلب تأكيداً قبل إيقاف الحفظ التلقائي', async () => {
        render(<DataSyncCard />);

        fireEvent.click(screen.getByRole('switch', { name: 'حفظ تلقائي' }));

        await waitFor(() => {
            expect(SmartDialog.confirm).toHaveBeenCalled();
            expect(patchData).toHaveBeenCalledWith({ autoSave: false });
        });
    });

    it('يعطّل زر المزامنة السحابية أثناء localOnlyMode', () => {
        securityState = { localOnlyMode: true };
        render(<DataSyncCard />);

        expect(screen.getByTestId('settings-toggle-data-cloudSync')).toBeDisabled();
    });
});
