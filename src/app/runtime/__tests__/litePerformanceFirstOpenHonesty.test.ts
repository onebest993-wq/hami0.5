import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('lite performance first-open honesty — سبب الوضع الخفيف', () => {
    it('السياسة: خلفية تُوقف بـ lite؛ recency لا', () => {
        const policy = read('src/app/runtime/sectionPrefetchPolicy.ts');
        expect(policy).toContain('isSectionBackgroundPrefetchAllowed');
        expect(policy).toContain('isRecencySectionWarmAllowed');
        expect(policy).toContain('isSectionWarmAllowedWhenLite');
        expect(policy).toContain('isRecencyBackgroundWarmAllowed');
        expect(policy).toContain('allowOnMetered');
        expect(policy).toContain('isMeteredOrSlowNetwork');
        expect(policy).toContain('peekLastOpenedSectionChunk() === id');
        const recency = read('src/app/runtime/sectionChunkRecency.ts');
        expect(recency).not.toContain('isLitePerformanceActive');
        expect(recency).toContain('prefetchScreens === false');
    });

    it('موجة الخفيف على lite: آخر قسم + منزل؛ الملف/مهام/إشعارات خلفية', () => {
        const chunks = read('src/app/runtime/overlayEntryChunks.ts');
        const light = chunks.slice(chunks.indexOf('void runWarmSteps('));
        const lastIdx = light.indexOf('warmLastOpenedSectionChunk');
        const motionIdx = light.indexOf('prefetchOverlayMotion();');
        const hubCardIdx = light.indexOf('prefetchLawyerHomeHubCardModule');
        const profileIdx = light.indexOf('prefetchProfileTabHost');
        const fieldIdx = light.indexOf('prefetchFieldTasksSheetModule');
        expect(lastIdx).toBeGreaterThan(0);
        expect(chunks).toContain('isTransactionsHubJsWarmAllowed');
        const txIdx = light.indexOf('prefetchTransactionsHubModule');
        expect(txIdx).toBeGreaterThan(0);
        expect(txIdx).toBeLessThan(motionIdx);
        expect(motionIdx).toBeGreaterThan(lastIdx);
        expect(hubCardIdx).toBeGreaterThan(motionIdx);
        expect(profileIdx).toBeGreaterThan(hubCardIdx);
        const profileGate = light.slice(Math.max(0, profileIdx - 180), profileIdx);
        expect(profileGate).toContain('overlayEntryBackgroundWavesAllowed');
        const fieldGate = light.slice(Math.max(0, fieldIdx - 180), fieldIdx);
        expect(fieldGate).toContain('overlayEntryBackgroundWavesAllowed');
        expect(chunks).toContain('overlayEntryLiteSheetPrefetchAllowed');
        expect(chunks).toContain('allowOnLite: true');
        const liteIdle = chunks.slice(chunks.lastIndexOf('if (!overlayEntryBackgroundWavesAllowed())'));
        expect(liteIdle).toContain('overlayEntryLiteSheetPrefetchAllowed');
        expect(liteIdle).toContain('prefetchFieldTasksSheetModule');
        expect(liteIdle).not.toContain('hydrateFieldTasksSheetForInstantOpen');
    });

    it('باطن ثقيل: lite يبقي آخر قسم ويتخطى الموجة الكاملة', () => {
        const heavy = read('src/app/runtime/heavyDashboardSectionWarm.ts');
        expect(heavy).toContain('if (constrained && !lastOpenedInner)');
        expect(heavy).toContain('if (constrained)');
        expect(heavy).toContain('isMeteredOrSlowNetwork');
        expect(heavy).toContain('warmHeavyDashboardSections');
        expect(heavy).toContain("peekLastOpenedSectionChunk() === 'lawsuit'");
    });

    it('استثناءات allowOnLite مربوطة بـ recency لا بكل إقلاع', () => {
        const exec = read('src/app/runtime/executionBootHydrator.ts');
        expect(exec).toContain('executionHeavyPrefetchAllowed() || isRecencyBackgroundWarmAllowed');
        expect(exec).toContain("isRecencyBackgroundWarmAllowed('execution')");
        const hub = read('src/app/runtime/hubArchiveAfterHomePaint.ts');
        expect(hub).toContain("isRecencyBackgroundWarmAllowed('execution')");
        const profile = read('src/app/runtime/profileBootHydrator.ts');
        const hubFn = profile.slice(
            profile.indexOf('export function prefetchProfileHubAfterInteractive'),
            profile.indexOf('export function hydrateProfileShellForInstantOpenWithData'),
        );
        expect(hubFn).toContain('profilePrefetchAllowed');
        const header = read('src/app/hooks/lawyerDashboard/headerShellIntentWarm.ts');
        expect(header).toContain('shouldAggressiveHeaderShellWarm');
        const preload = header.slice(
            header.indexOf('export function preloadLawyerDashboardHeaderShellChunks'),
            header.indexOf('function scheduleHeaderShellHeavyWarm'),
        );
        expect(preload).toContain('shouldAggressiveHeaderShellWarm');
        const hydrate = header.slice(header.indexOf('export function hydrateLawyerDashboardHeaderShellChunks'));
        expect(hydrate).toContain('if (!aggressive) return');
    });
});
