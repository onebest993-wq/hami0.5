import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const syncAllNow = vi.fn();
const resolveCloudSyncStatusMessage = vi.fn();
const isCloudSyncBuildEnabled = vi.fn();

let storeState = {
    signedIn: true,
    isOnline: true,
    buckets: {
        notes: { isSyncing: false, lastSyncTime: null, syncError: null },
        files: { isSyncing: false, lastSyncTime: null, syncError: null },
        execution: { isSyncing: false, lastSyncTime: null, syncError: null },
    },
    syncAllNow,
};

vi.mock('@/app/context/LawyerSettingsContext', () => ({
    useLawyerSettingsData: () => ({ cloudSync: true }),
    useLawyerSettingsSecurity: () => ({ localOnlyMode: false }),
}));

vi.mock('@/app/components/lawyer/HamiSettings/settingsSectionActiveContext', () => ({
    useSettingsSectionActive: () => true,
}));

vi.mock('@/app/services/cloudSync/cloudSyncStatusDisplay', () => ({
    isCloudSyncBuildEnabled: () => isCloudSyncBuildEnabled(),
    resolveCloudSyncStatusMessage: (...args: unknown[]) => resolveCloudSyncStatusMessage(...args),
}));

vi.mock('@/app/services/cloudSync/cloudSyncStatusStore', () => ({
    BUCKET_ORDER: ['notes', 'files', 'execution'],
    useCloudSyncStatusStore: Object.assign(
        (selector: (state: typeof storeState) => unknown) => selector(storeState),
        {
            getState: () => storeState,
        },
    ),
}));

import { DataSyncStatusLine } from '@/app/components/lawyer/HamiSettings/data/DataSyncStatusLine';

describe('DataSyncStatusLine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        storeState = {
            signedIn: true,
            isOnline: true,
            buckets: {
                notes: { isSyncing: false, lastSyncTime: null, syncError: null },
                files: { isSyncing: false, lastSyncTime: null, syncError: null },
                execution: { isSyncing: false, lastSyncTime: null, syncError: null },
            },
            syncAllNow,
        };
        isCloudSyncBuildEnabled.mockReturnValue(true);
        resolveCloudSyncStatusMessage.mockReturnValue({
            tone: 'active',
            text: 'جاهز للمزامنة',
            canSyncNow: true,
        });
        syncAllNow.mockResolvedValue(undefined);
    });

    it('يعرض زر مزامنة الآن عندما تسمح الحالة بذلك', () => {
        render(<DataSyncStatusLine />);
        expect(screen.getByTestId('settings-sync-now')).toBeInTheDocument();
        expect(screen.getByTestId('settings-sync-status')).toHaveTextContent('جاهز للمزامنة');
    });

    it('يشغّل المزامنة اليدوية عند الضغط على الزر', () => {
        render(<DataSyncStatusLine />);
        fireEvent.click(screen.getByTestId('settings-sync-now'));
        expect(syncAllNow).toHaveBeenCalledTimes(1);
    });

    it('يخفي زر المزامنة الآن عندما تمنعها الرسالة', () => {
        resolveCloudSyncStatusMessage.mockReturnValueOnce({
            tone: 'muted',
            text: 'المزامنة متوقفة',
            canSyncNow: false,
        });

        render(<DataSyncStatusLine />);
        expect(screen.queryByTestId('settings-sync-now')).not.toBeInTheDocument();
    });
});
