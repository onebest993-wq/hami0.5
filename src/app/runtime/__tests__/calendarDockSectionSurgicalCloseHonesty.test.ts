import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('calendar dock section surgical close honesty', () => {
    it('بعد boot-reveal: تسخين فقط بلا armScheduleHost داخل scheduleWarm؛ والتركيب عند الهوية', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab.ts'),
            'utf8',
        );
        expect(hook).toContain('prefetchScheduleAfterBootReveal');
        const warmBlock = hook.match(
            /const scheduleWarm = \(\) => \{[\s\S]*?\n        \};/,
        )?.[0];
        expect(warmBlock).toBeTruthy();
        expect(warmBlock).toContain('prefetchScheduleAfterBootReveal');
        expect(warmBlock).not.toContain('armScheduleHost');
        expect(hook).toContain('isRealSignedIn(userId)');
        expect(hook).not.toContain('isRealSignedIn(null)');
        expect(hook).toMatch(
            /\/\*\* ركّب Host مخفياً فور وجود هوية[\s\S]*?armScheduleHost\(\);[\s\S]*?loadScheduleHubModule\(\)/,
        );
    });

    it('pointerPrime للتقويم يركّب Host عبر prime بلا hydrate مباشر في البلاطة', () => {
        const gate = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/dockShellPrefetchGate.ts'),
            'utf8',
        );
        const calPrime = gate.match(
            /if \(widgetId === 'dockCalendar'\) \{[\s\S]*?return;\s*\}/,
        )?.[0];
        expect(calPrime).toBeTruthy();
        expect(calPrime).toContain("prefetchDockWidgetIntentImmediate('dockCalendar', 'hover')");
        expect(calPrime).toContain('dispatchSchedulePrimeHost()');
        expect(calPrime).not.toContain('snapScheduleShellOpen()');
        expect(calPrime).toContain('queueMicrotask');
        expect(calPrime).not.toContain('hydrateScheduleShellForInstantOpenWithData');
        const homeTab = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx'),
            'utf8',
        );
        expect(homeTab).not.toContain('activateOnPointerDown');
    });

    it('بلاطة dockCalendar في الشبكة الرئيسية بلا أيقونة', () => {
        const tiles = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/commandHub/CommandHubTiles.tsx'),
            'utf8',
        );
        expect(tiles).toContain('DockHalfTile');
        expect(tiles).toContain('HubTileTitle');
        expect(tiles).not.toContain('HomeCalendarIcon');
    });

    it('MainView يركّب ScheduleTabHost متزامناً بلا Suspense spinner ذهبي', () => {
        const main = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(main).toContain('ScheduleTabHost');
        expect(main).toMatch(
            /import \{ ScheduleTabHost \} from/,
        );
        expect(main).not.toContain('ScheduleTabFallback');
        expect(main).not.toContain('LazyScheduleTabHost');
        expect(main).toMatch(
            /scheduleShouldMount[\s\S]*?<ScheduleTabHost[\s\S]*?keepAlive=\{scheduleHostMounted\}/,
        );
    });

    it('ScheduleTabHost يستورد التبويب ثابتاً ويرسمه عند keepAlive للكشف اللحظي', () => {
        const host = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/schedule/ScheduleTabHost.tsx',
            ),
            'utf8',
        );
        expect(host).toContain('LawyerDashboardScheduleTab');
        expect(host).toMatch(
            /import \{ LawyerDashboardScheduleTab \} from/,
        );
        expect(host).toContain('keepAlive');
        expect(host).toMatch(/if \(!visible && !keepAlive\) \{\s*return null;/);
        expect(host).toContain('primeScheduleForBoot');
        expect(host).toContain('primeScheduleForWarm');
    });

    it('prefetch open للتقويم يستدعي warmScheduleOnOpen مع جسر الإضابير', () => {
        const warm = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/scheduleIntentWarm.ts'),
            'utf8',
        );
        expect(warm).toContain('requestCalendarDossierSyncNow');
        expect(warm).toContain('prefetchRadarWidgets');
        expect(warm).toContain('warmSchedulePipeline');
    });

    it('التقويم حي في orchestration خارج الجزيرة المؤجّلة (مثل المنتدى)', () => {
        const orch = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
            'utf8',
        );
        expect(orch).toContain('useLawyerDashboardScheduleTab');
        expect(orch).toContain('scheduleFeature');
        const stubs = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/createDeferredFeatureStubs.ts'),
            'utf8',
        );
        expect(stubs).not.toContain("requestArm('schedule')");
        expect(stubs).not.toContain('openScheduleTab:');
        const deferred = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces.tsx',
            ),
            'utf8',
        );
        expect(deferred).not.toContain('useLawyerDashboardScheduleTab');
        expect(deferred).toContain('params.openScheduleTab');
        const tabBundle = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/buildLawyerDashboardTabBundle.ts'),
            'utf8',
        );
        expect(tabBundle).toMatch(
            /onOpenCalendar:\s*\(\)\s*=>\s*\{[\s\S]*?params\.primeScheduleTabMount\(\);[\s\S]*?params\.openScheduleTab\(\);/,
        );
    });

    it('فتح/إغلاق التقويم عبر snap DOM على html (مثل الملف المهني)', () => {
        const snap = fs.readFileSync(
            path.join(root, 'src/app/services/schedule/scheduleShellSnap.ts'),
            'utf8',
        );
        expect(snap).toContain('data-hami-schedule-open');
        expect(snap).toContain('lawyer-dashboard-schedule-surface');
        const css = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css'),
            'utf8',
        );
        expect(css).toContain("html[data-hami-schedule-open='1']");
        const openFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/schedule/scheduleShellOpenFlow.ts'),
            'utf8',
        );
        expect(openFlow).toContain('snapScheduleShellOpen');
        expect(openFlow).toContain('dismissTransientOverlays');
        expect(openFlow).toContain('commitScheduleTabClose');
        const radar = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/SmartLegalRadar/RadarHeader.tsx'),
            'utf8',
        );
        expect(radar).toContain('data-testid="radar-back"');
        expect(radar).toContain('onClick');
        expect(radar).not.toMatch(/onPointerDown[\s\S]*onBack/);
    });

    it('مسار التقويم بلا debug 127.0.0.1:7777', () => {
        const files = [
            'src/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab.ts',
            'src/app/components/lawyer/LegalCommandCenterDock.tsx',
            'src/app/components/lawyer/dashboard/schedule/ScheduleTabHost.tsx',
            'src/app/hooks/lawyerDashboard/scheduleIntentWarm.ts',
            'src/app/services/calendar/dockCalendarOpen.ts',
        ];
        for (const rel of files) {
            const src = fs.readFileSync(path.join(root, rel), 'utf8');
            expect(src, rel).not.toContain('127.0.0.1:7777');
        }
    });
});
