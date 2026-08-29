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
        expect(hook).toMatch(/hasLocalAppSession\(userId\)/);
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
        expect(openFlow).toContain('stampCalendarOpenPerfMarks');
        expect(openFlow).toContain('isScheduleShellSnappedOpen');
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
        expect(escape).toContain('nativeBackStack');
        expect(escape).not.toContain('capacitorAppLifecycle');
        expect(escape).toContain('consumeBackStack');
        expect(escape).toContain('showForm');
    });

    it('C1: تقرير interactive عند التركيب بلا تسخين ويدجت ميت', () => {
        const life = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/SmartLegalRadar/hooks/useSmartLegalRadarLifecycle.ts',
            ),
            'utf8',
        );
        expect(life).toContain('reportedRef');
        expect(life).toContain("markCalendarPerfPhase('interactive')");
        expect(life).toContain('screenActive');
        expect(life).not.toContain('prefetchRadarWidgets');
        expect(life).not.toContain('setTimeout');
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

    /*
     * كان هذا الفحص يقرأ `schedule/ScheduleInstantShell.tsx` ويتحقّق من مرساة
     * الإضافة فيه. ذاك الملفّ لم يستورده أحد منذ انتقال التبويب إلى استيراد ثابت
     * مع `keepAlive`: بقي على القرص يتيماً، وبقي الفحص يمرّ عليه فيبدو التقويم
     * محروساً وهو يُقاس على شيفرة لا تُشحن. حُذف الملفّ، وانتقل الفحص إلى
     * الضمانة الحقيقية: المضيف يرسم التبويب نفسه — بمرساة إضافته — بلا بديل مؤقّت.
     */
    it('C8: مضيف التقويم يرسم التبويب نفسه مسبقاً بلا قشرة بديلة', () => {
        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/schedule/ScheduleTabHost.tsx'),
            'utf8',
        );
        expect(host).toMatch(/import \{ LawyerDashboardScheduleTab \} from/);
        expect(host).toContain('keepAlive');
        // الرسم المسبق المخفي هو ما يجعل الكشف لحظياً — لا قشرة ولا تعليق
        expect(host).not.toContain('Suspense');
        expect(host).not.toContain('lazy(');
        expect(host).not.toContain('InstantShell');
        const gate = fs.readFileSync(path.join(root, 'scripts/calendar-production-gate.mjs'), 'utf8');
        expect(gate).not.toContain('ScheduleInstantShell');
        expect(gate).toContain('RadarOpenInstantChrome');
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
        expect(radar).not.toMatch(/from ['"]@\/app\/hooks\/useOpaqueFeatureSurface['"]/);
        expect(radar).not.toMatch(/useOpaqueFeatureSurface\s*\(/);
    });

    it('حدود خطأ الرادار محلية — لا تسحب ErrorBoundary العام', () => {
        const boundary = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/SmartLegalRadar/RadarErrorBoundary.tsx'),
            'utf8',
        );
        expect(boundary).toContain('radar-error-fallback');
        expect(boundary).not.toContain("from '@/app/components/ui/ErrorBoundary'");
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

    /*
     * الضمانة المقصودة أصلاً: لا قراءة كاش ولا نبض تحميل قبل الكشف. كانت تُقاس
     * على القشرة اليتيمة؛ موضعها الآن المضيف، فهو وحده ما يعمل قبل الكشف.
     */
    it('C10: مضيف التقويم لا يقرأ كاشاً ولا يعرض نبض تحميل قبل الكشف', () => {
        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/schedule/ScheduleTabHost.tsx'),
            'utf8',
        );
        expect(host).not.toContain('getCachedCalendarEvents');
        expect(host).not.toContain('schedule-boot-event');
        expect(host).not.toContain('animate-pulse');
        // التسخين قبل الكشف تهيئة لا جلب بيانات للرسم
        expect(host).toContain('primeScheduleForBoot');
    });
});
