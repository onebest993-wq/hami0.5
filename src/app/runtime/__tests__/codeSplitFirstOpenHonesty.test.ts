import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readLawyerDashboardMainViewLazyEntries } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('code-split first-open honesty — سبب التقسيم', () => {
    it('مداخل الأقسام preload-aware وليست React.lazy العاري', () => {
        const lazy = readLawyerDashboardMainViewLazyEntries();
        expect(lazy).toContain('createPreloadableLazyComponent');
        expect(lazy).toContain('stampMainViewOverlayEntryPreloads');
        expect(lazy).toContain('LazyExecutionOverlayEntry');
        expect(lazy).toContain('loadCommunityOverlayEntry');
        expect(lazy).toContain('loadScheduleTabHostModule');
        expect(lazy).not.toMatch(/export const LazyExecutionOverlayEntry = lazyWithRetry/);
        expect(lazy).not.toMatch(/export const LazyCommunityOverlayEntry = lazyWithRetry/);
        expect(lazy).toContain('from \'@/app/runtime/communityOverlayEntryLoader\'');
        expect(read('src/app/runtime/communityOverlayEntryLoader.ts')).toContain(
            'createPreloadableLazyComponent',
        );
        expect(read('src/app/runtime/settingsOverlayEntryLoader.ts')).toContain(
            'LazySettingsOverlayEntry.preload',
        );
        expect(read('src/app/components/lawyer/dashboard/LawyerDashboardSettingsOverlayPortal.tsx')).toContain(
            'LazySettingsOverlayEntry',
        );
        expect(read('src/app/components/lawyer/dashboard/LawyerDashboardSettingsOverlayPortal.tsx')).toContain(
            'loadSettingsOverlayEntry',
        );
    });

    it('التسخين بعد المنزل يثبّت Resolved ويسخّن آخر قسم أولاً — بلا دمج المنتدى', () => {
        const chunks = read('src/app/runtime/overlayEntryChunks.ts');
        const recencyIdx = chunks.indexOf('warmLastOpenedSectionChunk');
        const stampIdx = chunks.indexOf('stampMainViewOverlayEntryPreloads');
        const executionIdx = chunks.indexOf('LawyerDashboardExecutionOverlayEntry');
        const profileIdx = chunks.indexOf('profileTabHostLoader');
        expect(recencyIdx).toBeGreaterThan(0);
        expect(recencyIdx).toBeLessThan(executionIdx);
        expect(profileIdx).toBeGreaterThan(0);
        expect(profileIdx).toBeLessThan(executionIdx);
        expect(stampIdx).toBeGreaterThan(executionIdx);
        expect(chunks).not.toContain('prefetchCommunityOverlayEntry');
        expect(chunks).not.toContain('prefetchGlobalSearchOverlayChunk');
        expect(chunks).toContain('prefetchFieldTasksSheetModule');
        expect(chunks).toContain('prefetchLawyerHomeHubCardModule');
        const repoIdx = chunks.indexOf('prefetchRepositoryHubModule');
        const settingsIdx2 = chunks.indexOf('prefetchSettingsOverlayEntry();');
        expect(repoIdx).toBeGreaterThan(0);
        expect(repoIdx).toBeLessThan(settingsIdx2);
    });

    it('حجم المنتج: موجات خفيف/متوسط/ثقيل لا دفعة واحدة بعد المنزل', () => {
        const chunks = read('src/app/runtime/overlayEntryChunks.ts');
        expect(chunks).toContain('overlayEntryMediumWaveDelayMs');
        expect(chunks).toContain('overlayEntryHeavyWaveDelayMs');
        expect(chunks).toContain('overlayEntryExecutionHostWaveDelayMs');
        expect(chunks).toContain('overlayEntryBackgroundWavesAllowed');
        const motionIdx = chunks.indexOf('prefetchOverlayMotion();');
        const stampIdx = chunks.indexOf('stampMainViewOverlayEntryPreloads');
        const settingsIdx = chunks.indexOf('prefetchSettingsOverlayEntry();');
        const scheduleIdx = chunks.indexOf('prefetchScheduleTabHostModule');
        const executionIdx = chunks.indexOf('LawyerDashboardExecutionOverlayEntry');
        expect(motionIdx).toBeGreaterThan(0);
        expect(stampIdx).toBeGreaterThan(motionIdx);
        expect(settingsIdx).toBeGreaterThan(stampIdx);
        expect(scheduleIdx).toBeGreaterThan(settingsIdx);
        expect(executionIdx).toBeGreaterThan(0);
        expect(executionIdx).toBeLessThan(scheduleIdx);
        const hostDelayIdx = chunks.indexOf('minDelayMs: overlayEntryExecutionHostWaveDelayMs()');
        expect(hostDelayIdx).toBeGreaterThan(stampIdx);
        expect(hostDelayIdx).toBeLessThan(settingsIdx);
        expect(chunks.slice(stampIdx, hostDelayIdx)).not.toContain('overlayEntryMediumWaveDelayMs()');
        const heavyFromSchedule = chunks.slice(scheduleIdx);
        expect(heavyFromSchedule).toContain('LawyerDashboardWorkspaceHeavyLayer');
        expect(heavyFromSchedule).not.toContain('stampMainViewOverlayEntryPreloads');
        expect(chunks).not.toContain('prefetchCommunityOverlayEntry');
        expect(read('src/app/runtime/overlayHeavyStamp.ts')).toContain(
            'بلا استيراد برميل lazyEntries',
        );
        expect(read('src/app/runtime/overlayEntryChunks.ts')).not.toContain(
            'LawyerDashboardMainView.lazyEntries',
        );
        expect(read('src/app/runtime/sectionChunkPreload.ts')).not.toContain(
            'LawyerDashboardMainView.lazyEntries',
        );
        expect(read('src/app/runtime/profileTabHostLoader.ts')).toContain(
            'createPreloadableLazyComponent',
        );
        expect(read('src/app/runtime/executionOverlayEntryLoader.ts')).toContain(
            'createPreloadableLazyComponent',
        );
        expect(chunks).toContain('runWarmSteps');
        expect(chunks).toContain("from '@/app/runtime/yieldToMain'");
        const stamp = read('src/app/runtime/overlayHeavyStamp.ts');
        expect(stamp).not.toContain('LazyNewCase');
        expect(stamp).not.toContain('scheduleHubLoader');
        expect(stamp).toContain('prefetchCriminalOverlayEntry');
    });

    it('نية الفتح تسجّل القسم؛ الأغطية InstantChrome preload-aware', () => {
        const intent = read('src/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch.ts');
        expect(intent).toContain('rememberOpenedSectionChunkFromDock');
        expect(intent).toContain("phase === 'open'");
        expect(intent).toContain('prefetchHubArchiveIntent(archiveId, phase)');
        expect(intent).toContain('prefetchExecutionOverlayEntries');
        expect(intent).toContain('prefetchExecutionOverlayEntries({ parallel: true })');
        const chrome = read(
            'src/app/components/lawyer/dashboard/overlayInstantChromeLazy.ts',
        );
        expect(chrome).toContain('createPreloadableLazyComponent');
        expect(chrome).toContain('LazyExecutionArchiveInstantChrome');
        const hosts = read(
            'src/app/components/lawyer/dashboard/LawyerDashboardMainViewOverlayHosts.tsx',
        );
        expect(hosts).toContain('overlayInstantChromeLazy');
        expect(hosts).not.toMatch(/const LazyExecutionArchiveInstantChrome = lazy\(/);
    });

    it('تحليل الشيفرة: خطوات الموجة متسلسلة؛ لا تحليل دعوى جديدة في الختم الثقيل', () => {
        const chunks = read('src/app/runtime/overlayEntryChunks.ts');
        expect(chunks).toContain('runWarmSteps');
        expect(chunks).toContain('.finally(');
        expect(read('src/app/runtime/yieldToMain.ts')).toContain('scheduler');
        expect(read('src/app/runtime/yieldToMain.ts')).toContain('document.hidden');
        expect(read('src/app/runtime/yieldToMain.ts')).toContain('NATIVE_IDLE_TIMEOUT_MS');
        expect(read('src/app/runtime/heavyDashboardSectionWarm.ts')).toContain('yieldToMain');
        expect(read('src/app/runtime/hubArchiveAfterHomePaint.ts')).toContain('yieldToMain');
        expect(read('src/app/runtime/overlayHeavyStamp.ts')).toContain('runWarmSteps');
        expect(read('src/app/runtime/executionOverlayEntryLoader.ts')).toContain('yieldToMain');
        expect(read('src/app/runtime/executionOverlayEntryLoader.ts')).toContain('opts?.parallel');
        const recency = read('src/app/runtime/sectionChunkRecency.ts');
        expect(recency).toContain('Promise<void>');
        expect(recency).toContain('preloadSectionChunk');
        expect(recency).toContain('warmSectionData');
        const header = read('src/app/hooks/lawyerDashboard/headerShellIntentWarm.ts');
        expect(header).toContain('runWarmSteps');
        expect(header).not.toContain("warmLawyerDashboardHeaderShell(uid, 'open')");
        const post = read('src/app/runtime/dashboardPostInteractiveWarm.ts');
        expect(post).toContain('runWarmSteps');
        const heavy = read('src/app/runtime/heavyDashboardSectionWarm.ts');
        expect(heavy).not.toMatch(/\? 2_500 : 8_000/);
        expect(heavy).toContain('return 0');
        expect(post).not.toContain('scheduleLawsuitArchiveEarlyWarm');
    });
});
