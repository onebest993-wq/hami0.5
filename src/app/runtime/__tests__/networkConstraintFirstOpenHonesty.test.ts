import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('network constraint first-open honesty — سبب توفير البيانات / 2G / المحلي', () => {
    it('السياسة تحجب التخمين على شبكة محدودة حتى مع lite=off', () => {
        const policy = read('src/app/runtime/sectionPrefetchPolicy.ts');
        expect(policy).toContain('allowOnMetered');
        expect(policy).toContain('allowOnLocalOnly');
        expect(policy).toContain('isMeteredOrSlowNetwork');
        expect(policy).toContain('isOpenSectionInnerJsPrefetchAllowed');
        expect(policy).toContain('allowOnLite: true');
        const recency = policy.slice(policy.indexOf('const LAST_OPENED_CHUNK_WARM'));
        expect(recency).toContain('allowOnLite: true');
        expect(recency).toContain('allowOnMetered: true');
        expect(recency).toContain('allowOnLocalOnly: true');
    });

    it('فحص الشبكة مصدر واحد — modest والجَدول والسياسة', () => {
        const tier = read('src/app/runtime/devicePerformanceTier.ts');
        expect(tier).toContain('export function isMeteredOrSlowNetwork');
        expect(tier).toContain('conn?.saveData');
        expect(tier).toContain("effective === 'slow-2g'");
        expect(tier).toContain("effective === '2g'");
        expect(tier).toContain("effective === '3g'");
        expect(tier).toContain('if (isMeteredOrSlowNetwork()) return true');
        const scheduler = read('src/app/runtime/prefetchScheduler.ts');
        expect(scheduler).toContain('isMeteredOrSlowNetwork');
        expect(scheduler).not.toMatch(/conn\.saveData/);
        expect(scheduler).not.toMatch(/effectiveType/);
    });

    it('مسارات التخمين بعد المنزل تحترم القيد؛ النية الحية لا تمر بالسياسة', () => {
        const exec = read('src/app/runtime/executionBootHydrator.ts');
        expect(exec).toContain('executionHeavyPrefetchAllowed() || isRecencyBackgroundWarmAllowed');
        expect(exec).toContain("isRecencyBackgroundWarmAllowed('execution')");
        const hub = read('src/app/runtime/hubArchiveAfterHomePaint.ts');
        expect(hub).toContain("isRecencyBackgroundWarmAllowed('execution')");
        const post = read('src/app/runtime/dashboardPostInteractiveWarm.ts');
        expect(post).toContain('isSectionBackgroundPrefetchAllowed');
        expect(post).not.toContain('isLitePerformanceActive');
        const intent = read('src/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch.ts');
        expect(intent).not.toContain('isSectionBackgroundPrefetchAllowed');
        expect(intent).not.toContain('isMeteredOrSlowNetwork');
        const hover = read('src/app/hooks/lawyerDashboard/repositoryIntentWarm.ts');
        expect(hover).toContain('export function warmRepositoryHubOnHover');
        const hoverFn = hover.slice(
            hover.indexOf('export function warmRepositoryHubOnHover'),
            hover.indexOf('export type RepositoryWarmTab'),
        );
        expect(hoverFn).not.toContain('isSectionBackgroundPrefetchAllowed');
        const idle = hover.slice(hover.indexOf('export function scheduleRepositoryDockIdlePrefetch'));
        expect(idle).toContain('isSectionBackgroundPrefetchAllowed');
        const data = read('src/app/runtime/sectionChunkDataWarm.ts');
        expect(data).toContain('networkPrefetchAllowed');
        expect(data).toContain('if (net)');
    });
});
