import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
    selectAggregateCloudSyncRuntime,
    useAggregateCloudSyncRuntime,
    useCloudSyncStatusStore,
} from '@/app/services/cloudSync/cloudSyncStatusStore';

/**
 * منتقي يعيد كائناً جديداً كل مرة بلا useShallow → Maximum update depth
 * عبر useSyncExternalStore. هذا الاختبار يثبت الاشتراك الآمن.
 */
function AggregateProbe() {
    const runtime = useAggregateCloudSyncRuntime();
    return (
        <div data-testid="agg">
            {runtime.isSyncing ? 'syncing' : 'idle'}:{runtime.signedIn ? 'in' : 'out'}
        </div>
    );
}

describe('useAggregateCloudSyncRuntime', () => {
    it('يرender دون Maximum update depth رغم أن المنتقي يعيد كائناً جديداً', () => {
        useCloudSyncStatusStore.setState({
            signedIn: true,
            isOnline: true,
        });

        render(<AggregateProbe />);
        expect(screen.getByTestId('agg').textContent).toContain('idle');
        expect(screen.getByTestId('agg').textContent).toContain('in');

        /* تأكيد أن القيمة المجمّعة متسقة بعد تحديث لا يغيّر الحقول المجمّعة */
        useCloudSyncStatusStore.getState().registerSyncHandler('notes', async () => undefined);
        expect(screen.getByTestId('agg').textContent).toContain('idle');
    });

    it('selectAggregateCloudSyncRuntime يجمع من الحاويات', () => {
        const state = useCloudSyncStatusStore.getState();
        const agg = selectAggregateCloudSyncRuntime(state);
        expect(agg).toMatchObject({
            isSyncing: false,
            isOnline: expect.any(Boolean),
            signedIn: expect.any(Boolean),
        });
    });
});
