import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';

const patchData = vi.fn();
const success = vi.fn();
const info = vi.fn();
const warning = vi.fn();
const error = vi.fn();
const syncAllNow = vi.fn(async () => ({ ok: true, skipped: false, failed: false }));
const runCloudSyncAllNow = vi.fn(async () => ({ ok: true, skipped: false, failed: false }));
const loadFromCloud = vi.fn(async () => null);
const applyAppData = vi.fn(() => false);
const invalidateLawyerSettingsCache = vi.fn();

let dataState = {
    autoSave: true,
    cloudSync: false,
    syncNotes: false,
    syncFiles: false,
    syncExecution: false,
};

let securityState = {
    localOnlyMode: false,
};

let storeState = {
    signedIn: true,
    isOnline: true,
    isSyncing: false,
    lastSyncTime: null as number | null,
    lastError: null as string | null,
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
        error: (...args: unknown[]) => error(...args),
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
    loadFromCloud: (...args: unknown[]) => loadFromCloud(...args),
    applyAppData: (...args: unknown[]) => applyAppData(...args),
}));

vi.mock('@/app/services/settings/settingsSnapshot', async () => {
    const actual = await vi.importActual<typeof import('@/app/services/settings/settingsSnapshot')>(
        '@/app/services/settings/settingsSnapshot',
    );
    return {
        ...actual,
        invalidateLawyerSettingsCache: (...args: unknown[]) => invalidateLawyerSettingsCache(...args),
        getLawyerSettingsSnapshot: () => ({
            security: securityState,
            data: dataState,
            appearance: {},
            performance: {},
            homeLayout: {},
        }),
    };
});

vi.mock('@/app/services/cloudSync/runCloudSyncAllNow', () => ({
    runCloudSyncAllNow: (...args: unknown[]) => runCloudSyncAllNow(...args),
}));

vi.mock('@/app/services/cloudSync/cloudSyncStatusStore', () => ({
    selectAggregateCloudSyncRuntime: (s: typeof storeState) => s,
    useAggregateCloudSyncRuntime: () => storeState,
    useCloudSyncStatusStore: Object.assign(
        (selector: (s: typeof storeState) => unknown) => selector(storeState),
        {
            getState: () => ({
                ...storeState,
                syncAllNow: (...args: unknown[]) => syncAllNow(...args),
            }),
        },
    ),
}));

vi.mock('@/app/services/auth/lawyerAccountStatus', () => ({
    canUseNetworkFeatures: () => true,
    networkAccessDenialReason: () => null,
    networkAccessDenialMessage: () => 'denied',
}));

vi.mock('@/app/utils/liveAuthUserId', () => ({
    getLiveAuthUserId: () => 'user-uuid-1',
}));

vi.mock('@/app/components/ui/SmartDialog', () => ({
    SmartDialog: {
        confirm: vi.fn(),
    },
}));

import { DataSyncCard } from '@/app/components/lawyer/HamiSettings/data/DataSyncCard';
import { saveToCloud } from '@/lib/syncService.js';

describe('DataSyncCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        dataState = {
            autoSave: true,
            cloudSync: false,
            syncNotes: false,
            syncFiles: false,
            syncExecution: false,
        };
        securityState = { localOnlyMode: false };
        storeState = {
            signedIn: true,
            isOnline: true,
            isSyncing: false,
            lastSyncTime: null,
            lastError: null,
        };
        vi.mocked(SmartDialog.confirm).mockResolvedValue(true);
        loadFromCloud.mockResolvedValue(null);
        applyAppData.mockReturnValue(false);
        syncAllNow.mockResolvedValue({ ok: true, skipped: false, failed: false });
        runCloudSyncAllNow.mockResolvedValue({ ok: true, skipped: false, failed: false });
    });

    it('يعرض مفتاح المزامنة السحابية', () => {
        render(<DataSyncCard />);
        expect(screen.getByTestId('settings-toggle-data-cloudSync')).toBeInTheDocument();
    });

    it('يفعّل المزامنة مع سحب سحابي ثم syncAllNow', async () => {
        const remote = { lawyer_settings: { data: { cloudSync: true } } };
        loadFromCloud.mockResolvedValueOnce(remote);
        applyAppData.mockReturnValueOnce(true);

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
        expect(loadFromCloud).toHaveBeenCalled();
        expect(applyAppData).toHaveBeenCalledWith(remote);
        expect(invalidateLawyerSettingsCache).toHaveBeenCalled();
        expect(runCloudSyncAllNow).toHaveBeenCalled();
        expect(success).toHaveBeenCalledWith('تم تفعيل المزامنة — تمّت مطابقة البيانات مع السحابة');
    });

    it('لا يفعّل المزامنة عند إلغاء التأكيد', async () => {
        vi.mocked(SmartDialog.confirm).mockResolvedValueOnce(false);
        render(<DataSyncCard />);

        fireEvent.click(screen.getByTestId('settings-toggle-data-cloudSync'));

        await waitFor(() => {
            expect(SmartDialog.confirm).toHaveBeenCalled();
        });
        expect(patchData).not.toHaveBeenCalled();
        expect(syncAllNow).not.toHaveBeenCalled();
    });

    it('يبقي المزامنة معطلة إذا فشل تثبيت الإعداد السحابي الأول', async () => {
        vi.mocked(saveToCloud).mockRejectedValueOnce(new Error('offline'));
        render(<DataSyncCard />);

        fireEvent.click(screen.getByTestId('settings-toggle-data-cloudSync'));

        await waitFor(() => {
            expect(error).toHaveBeenCalledWith('تعذر بدء المزامنة — لم يتغير الإعداد');
        });
        expect(patchData).not.toHaveBeenCalled();
        expect(syncAllNow).not.toHaveBeenCalled();
    });

    it('يستدعي syncAllNow من زر مزامنة الآن', async () => {
        dataState = {
            ...dataState,
            cloudSync: true,
            syncNotes: true,
            syncFiles: true,
            syncExecution: true,
        };
        storeState = {
            ...storeState,
            lastSyncTime: Date.now() - 60_000,
        };

        render(<DataSyncCard />);

        const btn = screen.getByTestId('settings-cloud-sync-now');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(syncAllNow).toHaveBeenCalled();
            expect(success).toHaveBeenCalledWith('اكتملت المزامنة مع السحابة');
        });
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
        expect(screen.queryByTestId('settings-cloud-sync-now')).not.toBeInTheDocument();
    });
});
