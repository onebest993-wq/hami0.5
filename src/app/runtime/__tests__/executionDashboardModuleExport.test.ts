import { describe, expect, it } from 'vitest';

import { loadExecutionDashboardModule, resetExecutionDashboardModuleCache } from '@/app/runtime/executionDashboardLoader';

describe('executionDashboard module export', () => {
    it('يصدّر ExecutionDashboard من المسار الصريح — لا index/barrel بدون المكوّن', async () => {
        resetExecutionDashboardModuleCache();
        const mod = await loadExecutionDashboardModule();
        expect(mod.ExecutionDashboard).toBeDefined();
        expect(typeof mod.ExecutionDashboard).toBe('object');
    }, 60_000);
});
