import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
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

    it('نية تبويب الطلبات تُسخّن المحركات الثقيلة (وليس idle الـ store)', () => {
        const registryPath = path.join(
            process.cwd(),
            'src/app/components/lawyer/criminal-system/criminalDashboardLazyRegistry.ts',
        );
        const source = fs.readFileSync(registryPath, 'utf8');
        expect(source).toContain('prefetchCriminalHeavyEnginesOnTabIntent');
        expect(source).toMatch(/requests:\s*\(\)\s*=>\s*\{[\s\S]*prefetchCriminalHeavyEnginesOnTabIntent/);
    });
});
