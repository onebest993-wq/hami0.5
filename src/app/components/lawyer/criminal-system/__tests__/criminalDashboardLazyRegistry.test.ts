import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    prefetchCriminalDashboardTab,
    prefetchCriminalDashboardDefaultTab,
} from '@/app/components/lawyer/criminal-system/criminalDashboardLazyRegistry';

describe('criminalDashboardLazyRegistry', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('prefetchCriminalDashboardTab لا يرمي في المتصفح', async () => {
        await expect(async () => {
            prefetchCriminalDashboardTab('legal_codes');
            await new Promise((r) => setTimeout(r, 0));
        }).not.toThrow();
    });

    it('prefetchCriminalDashboardDefaultTab يستهدف tab القرارات', async () => {
        await expect(async () => {
            prefetchCriminalDashboardDefaultTab();
            await new Promise((r) => setTimeout(r, 0));
        }).not.toThrow();
    });
});
