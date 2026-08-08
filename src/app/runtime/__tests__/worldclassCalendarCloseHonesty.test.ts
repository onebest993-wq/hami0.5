import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('world-class calendar close honesty', () => {
    it('C5: scheduleHostMounted يبدأ false على cold (home)', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab.ts'),
            'utf8',
        );
        expect(hook).toMatch(
            /scheduleHostMounted,\s*setScheduleHostMounted\]\s*=\s*useState\(\(\)\s*=>\s*scheduleInitiallyOpen\)/,
        );
    });

    it('C2: يمسح host ويعود للرئيسية عند غياب هوية حقيقية', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab.ts'),
            'utf8',
        );
        expect(hook).toMatch(/isRealSignedIn\(userId\)/);
        const authEffect = hook.match(
            /\/\*\* جلسة تقويم مفتوحة بلا هوية[\s\S]*?\}, \[activeTab, setActiveTab, userId\]\);/,
        )?.[0];
        expect(authEffect).toBeTruthy();
        expect(authEffect).toContain('setScheduleHostMounted(false)');
        expect(authEffect).toContain("setActiveTab('home')");
        expect(authEffect).toContain('setCalendarSearchFocus(null)');
        expect(authEffect).not.toContain('flushSync');
    });

    it('C9: marks الفتح متزامنة (لا سباق clear/mark عبر dynamic import فقط)', () => {
        const openFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/schedule/scheduleShellOpenFlow.ts'),
            'utf8',
        );
        expect(openFlow).toMatch(/clearCalendarPerfMarks\(\)/);
        expect(openFlow).toMatch(/markCalendarPerfPhase\('open-request'\)/);
        expect(openFlow).toContain('warmScheduleOnOpen');
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab.ts'),
            'utf8',
        );
        expect(hook).not.toMatch(
            /loadCalendarPerfMetrics\(\)\.then\(\(m\)\s*=>\s*m\.clearCalendarPerfMarks/,
        );
    });

    it('C7/C10: Cap native back مربوط في useScheduleTabEscape', () => {
        const escape = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/SmartLegalRadar/hooks/useScheduleTabEscape.ts',
            ),
            'utf8',
        );
        expect(escape).toContain('registerNativeBackHandler');
        expect(escape).toContain('consumeBackStack');
        expect(escape).toContain('showForm');
    });

    it('C1: interactive احتياطي في useSmartLegalRadarLifecycle', () => {
        const life = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/SmartLegalRadar/hooks/useSmartLegalRadarLifecycle.ts',
            ),
            'utf8',
        );
        expect(life).toMatch(/setTimeout\(markInteractiveFallback,\s*1_?200\)/);
        expect(life).toContain('reportedRef');
    });

    it('C3: بعد الإقلاع تسخين فقط بلا armScheduleHost داخل scheduleWarm', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab.ts'),
            'utf8',
        );
        const warmBlock = hook.match(/const scheduleWarm = \(\) => \{[\s\S]*?\n        \};/)?.[0];
        expect(warmBlock).toBeTruthy();
        expect(warmBlock).toContain('prefetchScheduleAfterBootReveal');
        expect(warmBlock).not.toContain('armScheduleHost');
    });

    it('C8: InstantShell طارئ يحافظ على مرساة الإضافة بنفس التخطيط', () => {
        const shell = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/schedule/ScheduleInstantShell.tsx',
            ),
            'utf8',
        );
        expect(shell).toContain('RadarAddEventDockPlaceholder');

        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/schedule/ScheduleTabHost.tsx'),
            'utf8',
        );
        expect(host).toContain('LawyerDashboardScheduleTab');
        expect(host).toMatch(
            /import \{ LawyerDashboardScheduleTab \} from/,
        );
        expect(host).toContain('keepAlive');
    });

    it('C4: طبقات Escape متدرجة — نموذج ثم رجوع', () => {
        const escape = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/SmartLegalRadar/hooks/useScheduleTabEscape.ts',
            ),
            'utf8',
        );
        expect(escape).toContain('onCloseForm');
        expect(escape).toContain('onBack');
        const radar = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/SmartLegalRadar.tsx'),
            'utf8',
        );
        expect(radar).toContain('useScheduleTabEscape');
    });

    it('كاشف الإثقال موصول إلى ScheduleConflictAlert', () => {
        const insights = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/SmartLegalRadar/hooks/useSmartLegalRadarDayInsights.ts',
            ),
            'utf8',
        );
        expect(insights).toContain('detectConflictsFromUnifiedEvents');
        expect(insights).toContain('scheduleConflict');
        const radar = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/SmartLegalRadar.tsx'),
            'utf8',
        );
        expect(radar).toContain('scheduleConflict={scheduleConflict}');
    });

    it('C10: InstantShell هيكل ثابت بلا أحداث كاش ولا نبض تحميل', () => {
        const shell = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/schedule/ScheduleInstantShell.tsx',
            ),
            'utf8',
        );
        expect(shell).toContain('registerNativeBackHandler');
        expect(shell).toContain('RADAR_BACK_BTN');
        expect(shell).toContain("touchAction: 'manipulation'");
        expect(shell).not.toContain('getCachedCalendarEvents');
        expect(shell).not.toContain('schedule-boot-event');
        expect(shell).not.toContain('animate-pulse');
        expect(shell).toContain('aria-busy');
        expect(shell).toContain('RadarAddEventDockPlaceholder');
    });
});
