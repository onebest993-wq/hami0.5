import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function src(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

function walkTs(dir: string, acc: string[] = []): string[] {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, ent.name);
        if (ent.isDirectory()) {
            if (['node_modules', 'dist', '__tests__'].includes(ent.name)) continue;
            walkTs(full, acc);
            continue;
        }
        if (!/\.(ts|tsx)$/.test(ent.name)) continue;
        if (ent.name.includes('.test.') || ent.name.includes('.spec.')) continue;
        acc.push(full);
    }
    return acc;
}

describe('overlay motion isolation honesty', () => {
    it('stem / first-tab / header / MainView بلا استيراد ساكن لـ motion/react', () => {
        for (const rel of [
            'src/app/components/lawyer/LawyerDashboard.tsx',
            'src/app/components/lawyer/LawyerDashboardParts/components/Header.tsx',
            'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx',
            'src/app/components/lawyer/dashboard/HomeTabContent.tsx',
            'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx',
            'src/app/components/lawyer/dashboard/LawyerDashboardMainView.lazyEntries.ts',
            'src/app/components/lawyer/dashboard/LawyerDashboardMainViewOverlayHosts.tsx',
            'src/app/components/lawyer/dashboard/useLawyerDashboardMainViewChrome.ts',
            'src/app/components/lawyer/AppLockOverlay.tsx',
            'src/boot/bootCriticalPreload.ts',
        ]) {
            const text = src(rel);
            expect(text, rel).not.toContain("from 'motion/react'");
            expect(text, rel).not.toContain('overlayMotionRuntime');
        }
    });

    it('HamiMotionConfig وجسر الستائر بعد الكشف؛ Consolidation بلا AnimatePresence ميت', () => {
        const config = src('src/app/components/shared/HamiMotionConfig.tsx');
        const loader = src('src/app/motion/loadOverlayMotion.ts');
        const runtime = src('src/app/motion/overlayMotionRuntime.ts');
        const warm = src('src/app/runtime/overlayEntryChunks.ts');
        const consolidation = src(
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardConsolidationNavOverlayEntry.tsx',
        );
        const dock = src('src/app/components/lawyer/dashboard/CommandCenterOverlays.tsx');
        const hubShell = src(
            'src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubMoreOverlayShell.tsx',
        );
        const search = src(
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardGlobalSearchOverlayEntry.tsx',
        );

        expect(config).toContain('loadOverlayMotion');
        expect(config).not.toContain("from 'motion/react'");
        expect(config).not.toContain("import('motion/react')");

        expect(loader).toContain("import('@/app/motion/overlayMotionRuntime')");
        expect(loader).toContain('isBootRevealDone');
        expect(loader).toContain('BOOT_REVEAL_DONE_EVENT');
        expect(loader).not.toContain("from 'motion/react'");

        expect(runtime).toContain("from 'motion/react'");
        expect(runtime).toContain('MotionConfig');

        expect(warm).toContain('prefetchOverlayMotion');
        expect(warm).not.toContain("from 'motion/react'");

        expect(consolidation).not.toContain('motion/react');
        expect(consolidation).not.toMatch(/import\s+\{[^}]*AnimatePresence/);
        expect(consolidation).toContain('ConsolidationNavBar');

        expect(dock).toContain("import('./HomeDockQuickSheet')");
        expect(dock).not.toContain("from 'motion/react'");
        expect(hubShell).not.toContain('motion/react');
        expect(search).not.toContain('motion/react');
    });

    it('مصدر التطبيق: motion/react فقط داخل overlayMotionRuntime', () => {
        const leaks: string[] = [];
        for (const file of walkTs(join(root, 'src'))) {
            const rel = file.slice(root.length + 1).replace(/\\/g, '/');
            if (rel === 'src/app/motion/overlayMotionRuntime.ts') continue;
            const text = readFileSync(file, 'utf8');
            if (text.includes("from 'motion/react'") || text.includes('from "motion/react"')) {
                leaks.push(rel);
            }
        }
        expect(leaks).toEqual([]);
    });
});
