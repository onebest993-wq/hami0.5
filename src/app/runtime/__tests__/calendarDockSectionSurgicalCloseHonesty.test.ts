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

    it('pointerPrime للتقويم يركّب Host عبر prime بلا hydrate مباشر في الدوك', () => {
        const dock = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LegalCommandCenterDock.tsx'),
            'utf8',
        );
        const calPrime = dock.match(
            /if \(widgetId === 'dockCalendar'\) \{[\s\S]*?\n            \}/,
        )?.[0];
        expect(calPrime).toBeTruthy();
        expect(calPrime).toContain("prefetchDockWidgetIntentImmediate('dockCalendar')");
        expect(calPrime).toContain('dispatchSchedulePrimeHost()');
        expect(calPrime).not.toContain('hydrateScheduleShellForInstantOpenWithData');
        expect(dock).not.toContain("from '@/app/runtime/scheduleBootHydrator'");
        expect(dock).toMatch(
            /activateOnPointerDown=\{\s*widgetId === 'dockCalendar' \|\| widgetId === 'dockTasks'\s*\}/,
        );
    });

    it('أيقونة dockCalendar تستخدم HomeCalendarIcon', () => {
        const dock = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LegalCommandCenterDock.tsx'),
            'utf8',
        );
        expect(dock).toContain('HomeCalendarIcon');
        expect(dock).toMatch(/dockCalendar:[\s\S]*?icon:\s*HomeCalendarIcon/);
        expect(dock).not.toMatch(/\bCalendarIcon\b/);
        expect(dock).not.toMatch(/Calendar as CalendarIcon/);
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

    it('ScheduleTabHost يحترم keepAlive ويُحمّل/يُرطّب عند visible أو keepAlive', () => {
        const host = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/schedule/ScheduleTabHost.tsx',
            ),
            'utf8',
        );
        expect(host).toContain('keepAlive');
        expect(host).toMatch(
            /if \(!visible && !keepAlive\) return;[\s\S]*?hydrateScheduleShellForInstantOpenWithData/,
        );
        expect(host).toMatch(/if \(!visible && !keepAlive\) \{\s*return null;/);
        expect(host).toContain('/* تسخين صامت — بلا InstantShell فوق اللوحة */');
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
