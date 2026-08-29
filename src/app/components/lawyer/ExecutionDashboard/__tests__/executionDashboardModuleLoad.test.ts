import { describe, expect, it } from 'vitest';

describe('ExecutionDashboard module load', () => {
    it(
        'named export ExecutionDashboard is a component',
        async () => {
            const mod = await import('@/app/components/lawyer/ExecutionDashboard.tsx');
            expect(mod.ExecutionDashboard).toBeTruthy();
            expect(['function', 'object']).toContain(typeof mod.ExecutionDashboard);
        },
        120_000,
    );

    it('execution dashboard store hook is a function', async () => {
        const mod = await import('@/app/stores/executionDashboardStore');
        expect(typeof mod.useExecutionDashboardStore).toBe('function');
    });
});
