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
}));

vi.mock('@/app/services/settings/settingsSnapshot', async () => {
    const actual = await vi.importActual<typeof import('@/app/services/settings/settingsSnapshot')>(
        '@/app/services/settings/settingsSnapshot',
    );
    return {
        ...actual,
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

vi.mock('@/app/services/cloud/workCloudCheckpoint', () => ({
    restoreLastWorkCloudCheckpoint: vi.fn(async () => ({
        applied: false,
        lawsuits: 0,
        execution: 0,
        notes: 0,
        calendar: 0,
        failed: false,
    })),
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
import { restoreLastWorkCloudCheckpoint } from '@/app/services/cloud/workCloudCheckpoint';

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
        syncAllNow.mockResolvedValue({ ok: true, skipped: false, failed: false });
        runCloudSyncAllNow.mockResolvedValue({ ok: true, skipped: false, failed: false });
        vi.mocked(restoreLastWorkCloudCheckpoint).mockResolvedValue({
            applied: false,
            lawsuits: 0,
            execution: 0,
            notes: 0,
            calendar: 0,
            failed: false,
        });
    });

    it('يعرض مفتاح المزامنة السحابية', () => {
        render(<DataSyncCard />);
        expect(screen.getByTestId('settings-toggle-data-cloudSync')).toBeInTheDocument();
    });

    it('يفعّل مزامنة الإضابير محلياً دون رفع لقطة الإعدادات', async () => {
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

    it('يبقي التفعيل المحلي إن فشلت مطابقة الإضابير', async () => {
        runCloudSyncAllNow.mockResolvedValueOnce({ ok: false, skipped: false, failed: true });
        render(<DataSyncCard />);

        fireEvent.click(screen.getByTestId('settings-toggle-data-cloudSync'));

        await waitFor(() => {
            expect(patchData).toHaveBeenCalledWith({
                cloudSync: true,
                syncNotes: true,
                syncFiles: true,
                syncExecution: true,
            });
            expect(warning).toHaveBeenCalledWith('حُفظ التفعيل محلياً — تعذر مطابقة السحابة الآن');
        });
        expect(error).not.toHaveBeenCalled();
    });

    it('استعادة نقطة فاشلة تستخدم تحذير المطابقة القائم', async () => {
        vi.mocked(restoreLastWorkCloudCheckpoint).mockResolvedValueOnce({
            applied: false,
            lawsuits: 0,
            execution: 0,
            notes: 0,
            calendar: 0,
            failed: true,
        });
        render(<DataSyncCard />);
        fireEvent.click(screen.getByTestId('settings-toggle-data-cloudSync'));
        await waitFor(() => {
            expect(warning).toHaveBeenCalledWith('حُفظ التفعيل محلياً — تعذر مطابقة السحابة الآن');
        });
        expect(success).not.toHaveBeenCalled();
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

    it('لا يطلق مزامنة الآن مرتين من نقرات متزامنة', async () => {
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
        let release!: (value: { ok: boolean; skipped: boolean; failed: boolean }) => void;
        syncAllNow.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    release = resolve;
                }),
        );

        render(<DataSyncCard />);
        const btn = screen.getByTestId('settings-cloud-sync-now');
        fireEvent.click(btn);
        fireEvent.click(btn);
        expect(syncAllNow).toHaveBeenCalledTimes(1);

        release({ ok: true, skipped: false, failed: false });
        await waitFor(() => {
            expect(success).toHaveBeenCalledWith('اكتملت المزامنة مع السحابة');
        });
    });

    it('يلغي التفعيل إن فُعّل قطع الاتصال أثناء حوار التأكيد', async () => {
        vi.mocked(SmartDialog.confirm).mockImplementationOnce(async () => {
            securityState = { localOnlyMode: true };
            return true;
        });
        render(<DataSyncCard />);
        fireEvent.click(screen.getByTestId('settings-toggle-data-cloudSync'));

        await waitFor(() => {
            expect(SmartDialog.confirm).toHaveBeenCalled();
        });
        expect(patchData).not.toHaveBeenCalled();
        expect(runCloudSyncAllNow).not.toHaveBeenCalled();
        expect(info).toHaveBeenCalledWith('أوقف «قطع الاتصال» أولاً لتفعيل المزامنة السحابية');
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

    it('إيقاف المزامنة محلي ولا يحدّث تفضيلات السحابة', async () => {
        dataState = {
            ...dataState,
            cloudSync: true,
            syncNotes: true,
            syncFiles: true,
            syncExecution: true,
        };

        render(<DataSyncCard />);
        fireEvent.click(screen.getByTestId('settings-toggle-data-cloudSync'));

        await waitFor(() => {
            expect(patchData).toHaveBeenCalledWith({
                cloudSync: false,
                syncNotes: false,
                syncFiles: false,
                syncExecution: false,
            });
        });
        expect(info).toHaveBeenCalledWith('تم إيقاف المزامنة السحابية');
    });
});
