import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readCommandHubImplSource } from './readCommandHubImplSource';
import { readHomeTabImplSource } from './readHomeTabImplSource';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

describe('calendar dock section surgical close honesty', () => {
    it('بعد boot-reveal و content-ready: تسخين فقط بلا arm؛ التركيب عند فتح التبويب', () => {
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
        expect(hook).toContain('hasLocalAppSession(userId)');
        expect(hook).not.toContain('hasLocalAppSession(null)');
        expect(hook).toContain('onBootContentReady');
        const readyBlock = hook.match(
            /onBootContentReady\(\(\) => \{[\s\S]*?\n        \}\);/,
        )?.[0];
        expect(readyBlock).toBeTruthy();
        expect(readyBlock).toContain('warmScheduleOnHover');
        expect(readyBlock).toContain('prefetchScheduleHubModule');
        expect(readyBlock).not.toContain('armScheduleHost');
        expect(readyBlock).not.toContain('loadScheduleHubModule');
        const primeBlock = hook.match(
            /const primeScheduleTabMount = useCallback\(\(\) => \{[\s\S]*?\}, \[[^\]]*userId[^\]]*\]\);/,
        )?.[0];
        expect(primeBlock).toBeTruthy();
        expect(primeBlock).toContain('warmScheduleOnHover');
        expect(primeBlock).toContain('warmSchedulePrimeChain');
        expect(primeBlock).not.toContain('armScheduleHost');
        const hydrator = fs.readFileSync(
            path.join(root, 'src/app/runtime/scheduleBootHydrator.ts'),
            'utf8',
        );
        expect(hydrator).toContain('تسخين مقطع بلا تركيب Host حتى فتح التبويب');
        expect(hydrator).not.toContain('يركّب Host مخفياً قبل الـ click');
    });

    it('pointerPrime للتقويم يسخّن المقطع بلا hydrate مباشر في البلاطة', () => {
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
        const homeTab = readHomeTabImplSource(root);
        expect(homeTab).not.toContain('activateOnPointerDown');
    });

    it('بلاطة dockCalendar في الشبكة الرئيسية بلا أيقونة', () => {
        const tiles = readCommandHubImplSource(root);
        expect(tiles).toContain('DockHalfTile');
        expect(tiles).toContain('HubTileFace');
        expect(tiles).not.toContain('HomeCalendarIcon');
    });

    it('MainView: ScheduleTabHost كسول مع تسخين؛ الفتح فوري بقشرة InstantChrome', () => {
        /*
         * كان sync (~١٧٦٥ ك.ب) يسحب النظام الجزائي عبر مراجعة الشرارة إلى مسار الإقلاع.
         * Host يبقى كسولاً. الفتح لم يعد ينتظر المقطع: snap فوري + InstantChrome حتى يصل Host.
         */
        const main = readLawyerDashboardMainViewSurface();
        expect(main).toContain('LazyScheduleTabHost');
        expect(main).toContain('loadScheduleTabHostModule');
        expect(main).toContain('ScheduleRadarPaintGate');
        expect(main).not.toContain('RadarOpenInstantChrome');
        expect(main).not.toContain('ScheduleTabFallback');
        expect(main).not.toMatch(/import \{ ScheduleTabHost \} from/);
        expect(main).toMatch(
            /scheduleShouldMount[\s\S]*?<LazyScheduleTabHost[\s\S]*?keepAlive=\{scheduleHostMounted \|\| schedulePaintOpen\}/,
        );
        expect(main).toContain('visible={schedulePaintOpen}');
        expect(main).toContain('ليس عند الإقلاع');
        expect(main).not.toContain('مثل المستودع: Host مركّب مبكراً');
        const chrome = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/schedule/RadarOpenInstantChrome.tsx',
            ),
            'utf8',
        );
        expect(chrome).toContain('data-testid="radar-back"');
        expect(chrome).toContain('data-testid="schedule-tab-loading"');
        expect(chrome).toContain('data-testid="radar-week-strip"');
        expect(chrome).toContain('data-testid="radar-month-label"');
        expect(chrome).toContain('buildRadarOpenInstantSnapshot');
        expect(chrome).toContain('RADAR_HEADER');
        expect(chrome).toContain('radarOpenInstantChromeClasses');
        expect(chrome).toContain('prefetchRadarEventForm');
        expect(chrome).toContain('subscribeCalendarEventsCache');
        expect(chrome).toContain('data-has-events');
        expect(chrome).toContain('radarOpenInstantWeekDayClass');
        expect(chrome).toContain('calendarReminderOverlayGate');
        expect(chrome).toContain('isCalendarEventFormOpen');
        expect(chrome).toContain('isCalendarReminderOverlayOpen');
        expect(chrome).toContain('data-schedule-instant');
        expect(chrome).toContain('data-schedule-snapshot');
        expect(chrome).toContain('snapshotReady');
        expect(chrome).toContain('data-testid="smart-legal-radar"');
        expect(chrome).toContain('resolveCalendarUserId');
        expect(chrome).toContain('requestCalendarOpenSource');
        expect(chrome).toContain('liveBody');
        expect(chrome).toContain('calendarShellSession');
        expect(chrome).toContain('RadarOpenInstantAddHost');
        expect(chrome).toContain('RadarOpenInstantDayList');
        expect(chrome).toContain('RadarOpenInstantMonthGrid');
        expect(chrome).toContain('radar-add-event');
        expect(chrome).not.toContain('pointer-events-none');
        expect(chrome).not.toContain('tabIndex={-1}');
        expect(chrome).not.toContain('aria-busy');
        expect(chrome).not.toContain('جاري');
        expect(chrome).not.toContain('radarOpenInstantPaint.css');
        expect(chrome).toContain('radarCss/radarPage.css');
        expect(chrome).toContain('radarCss/radarChrome.css');
        expect(chrome).toContain('radarCss/radarCards.css');
        expect(chrome).not.toContain('Array.from({ length: 7 }');
        expect(chrome).toContain('registerNativeBackHandler');
        expect(chrome).toContain("event.key !== 'Escape'");
        expect(chrome).toContain('useLayoutEffect');
        expect(chrome).not.toContain('calendarLocalSnapshot');
        expect(chrome).not.toContain('SecureStoreService');
        expect(chrome).not.toMatch(/from ['"][^'"]*SmartLegalRadar/);
        expect(chrome).not.toMatch(/from ['"][^'"]*radarTheme/);
        const chromeModel = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/schedule/radarOpenInstantChromeModel.ts',
            ),
            'utf8',
        );
        expect(chromeModel).toContain('hami-radar-week-strip__day--selected');
        expect(chromeModel).not.toMatch(/from ['"][^'"]*SmartLegalRadar/);
        const chromeAdd = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/schedule/RadarOpenInstantAddHost.tsx',
            ),
            'utf8',
        );
        expect(chromeAdd).toContain('loadRadarEventFormModule');
        expect(chromeAdd).toContain("import('@/app/services/calendar/calendarCloudRuntime')");
        expect(chromeAdd).not.toMatch(/from ['"][^'"]*SmartLegalRadar/);
        const chromeClasses = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/schedule/radarOpenInstantChromeClasses.ts',
            ),
            'utf8',
        );
        expect(chromeClasses).toContain('hami-radar-header');
        expect(chromeClasses).toContain('--hami-lawyer-header-safe-top');
        expect(chromeClasses).toContain('min-h-[44px]');
        expect(
            fs.existsSync(
                path.join(
                    root,
                    'src/app/components/lawyer/dashboard/schedule/radarOpenInstantPaint.css',
                ),
            ),
        ).toBe(false);
        const paintGate = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/schedule/ScheduleRadarPaintGate.tsx',
            ),
            'utf8',
        );
        expect(paintGate).toContain('RadarOpenInstantChrome');
        expect(paintGate).toContain('useAuthUser');
        expect(paintGate).toContain('userId={resolvedUserId}');
        expect(paintGate).toContain('schedule-radar-paint-cover');
        expect(paintGate).toContain('data-handoff');
        expect(paintGate).toContain('hami-schedule-radar-paint-cover');
        expect(paintGate).toContain('liveBody');
        expect(paintGate).toContain('CalendarLiveHandoffContext');
        expect(paintGate).not.toContain('onFormOpenChange');
        expect(paintGate).toContain('fallback={null}');
        expect(paintGate).toContain('InstantChrome هو الصفحة');
        expect(paintGate).toContain('useScheduleRadarLivePaint');
        const livePaint = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/schedule/scheduleRadarLivePaint.ts',
            ),
            'utf8',
        );
        expect(livePaint).toContain('radar-live-body');
        expect(livePaint).toContain('radar-open-instant-event-');
        expect(livePaint).toContain('SCHEDULE_RADAR_LIVE_PAINT_SETTLE_FRAMES');
        expect(livePaint).toContain('data-schedule-snapshot');
        expect(livePaint).not.toContain('radar-live-pending-empty');
        const tab = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardScheduleTab.tsx'),
            'utf8',
        );
        expect(tab).toContain('embedInChrome');
        expect(tab).toContain('subscribeCalendarOpenSource');
        expect(tab).not.toContain('h-[100dvh]');
        const radar = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/SmartLegalRadar.tsx'),
            'utf8',
        );
        expect(radar).toContain('embedInChrome');
        expect(radar).toContain('RadarShell embed');
        const shell = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/SmartLegalRadar/RadarShell.tsx'),
            'utf8',
        );
        expect(shell).toContain('radar-live-body');
        const openFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/schedule/scheduleShellOpenFlow.ts'),
            'utf8',
        );
        expect(openFlow).toContain('loadScheduleTabHostModule');
        expect(openFlow).toContain('primeCalendarEventsCacheFromPeek');
        expect(openFlow).toContain('primeCalendarEventsCacheFromPeek(params.userId)');
        expect(openFlow).toMatch(
            /catch\(\(\) => undefined\);\s*if \(isScheduleShellSnappedOpen\(\)\)/,
        );
        expect(openFlow).toContain('runScheduleOpenCommit(params)');
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
        const prime = fs.readFileSync(
            path.join(root, 'src/app/runtime/scheduleShellPrime.ts'),
            'utf8',
        );
        expect(prime).not.toMatch(
            /from ['"]@\/app\/runtime\/scheduleBootHydrator['"]/,
        );
        expect(prime).not.toContain('hydrateScheduleShellForInstantOpenWithData');
        expect(prime).toContain('runScheduleWarmCore');
        const warmCore = fs.readFileSync(
            path.join(root, 'src/app/runtime/scheduleWarmCore.ts'),
            'utf8',
        );
        expect(warmCore).toContain('warmCalendarEventsCache');
        expect(warmCore).toContain('primeCalendarEventsCacheFromPeek');
        expect(warmCore).toContain('prefetchCalendarCloudModule');
        expect(warmCore).not.toMatch(/from ['"]@\/app\/runtime\/scheduleBootHydrator['"]/);
    });

    it('prefetch open للتقويم يستدعي warmScheduleOnOpen مع جسر الإضابير', () => {
        const warm = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/scheduleIntentWarm.ts'),
            'utf8',
        );
        expect(warm).toContain('requestCalendarDossierSyncNow');
        expect(warm).toContain('scheduleIdleWork');
        expect(warm).toContain('primeCalendarEventsCacheFromPeek');
        expect(warm).toContain('runScheduleWarmCore');
        expect(warm).toContain('warmSchedulePipeline');
        expect(warm).not.toContain('prefetchScheduleHubModule');
    });

    it('التقويم في PreDockFeatureSurfaces كسول بعد first-tab-open (خارج orchestration stem)', () => {
        const orch = [
            fs.readFileSync(
                path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardPreWorkspaceOrchestration.ts'),
                'utf8',
            ),
            fs.readFileSync(
                path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
                'utf8',
            ),
        ].join('\n');
        expect(orch).toContain('createPreDockFeatureStubs');
        expect(orch).toContain('scheduleFeature');
        expect(orch).not.toMatch(/import \{[^}]*useLawyerDashboardScheduleTab[^}]*\} from/);
        const preDockStubs = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/createPreDockFeatureStubs.ts'),
            'utf8',
        );
        expect(preDockStubs).toContain("requestArm('schedule')");
        expect(preDockStubs).toContain('openScheduleTab:');
        expect(preDockStubs).toContain('snapScheduleShellClose');
        expect(preDockStubs).toContain('clearPending');
        expect(preDockStubs).toContain('loadScheduleTabHostModule');
        expect(preDockStubs).not.toMatch(/backToHomeFromSchedule:\s*noop/);
        const main = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(main).toContain('SCHEDULE_SHELL_SNAP_EVENT');
        expect(main).toContain('schedulePaintOpen');
        expect(main).toContain('useLayoutEffect');
        expect(main).toMatch(
            /preDockFeatureSurfacesProps\.forceArm[\s\S]*?useLayoutEffect/,
        );
        const preDock = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardPreDockFeatureSurfaces.tsx',
            ),
            'utf8',
        );
        expect(preDock).toContain('useLawyerDashboardScheduleTab');
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
        expect(snap).toContain('hami:calendar:open-request');
        expect(snap).toContain('hami:calendar:interactive');
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
        expect(openFlow).toContain('executeScheduleOverlayClose');
        expect(openFlow).toContain('beginHubLayerExit');
        expect(openFlow).toContain('armHubLayerEnter');
        expect(openFlow).toContain('flushSync');
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
            'src/app/hooks/lawyerDashboard/dockShellPrefetchGate.ts',
            'src/app/components/lawyer/dashboard/schedule/ScheduleTabHost.tsx',
            'src/app/hooks/lawyerDashboard/scheduleIntentWarm.ts',
            'src/app/services/calendar/dockCalendarOpen.ts',
        ];
        for (const rel of files) {
            const src = fs.readFileSync(path.join(root, rel), 'utf8');
            expect(src, rel).not.toContain('127.0.0.1:7777');
        }
    });

    it('تركيز البحث يطابق cal_ الموحّد ويعلن فشل الحفظ بدل نجاح كاذب', () => {
        const focus = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/SmartLegalRadar/calendarFocusIds.ts'),
            'utf8',
        );
        const schedule = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/SmartLegalRadar/hooks/useSmartLegalRadarSchedule.ts',
            ),
            'utf8',
        );
        const form = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/SmartLegalRadar/hooks/useSmartLegalRadarForm.ts',
            ),
            'utf8',
        );
        const cards = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/SmartLegalRadar/EventCardsList.tsx'),
            'utf8',
        );
        expect(focus).toContain('eventMatchesCalendarFocus');
        expect(schedule).toContain('resolveHighlightUnifiedEventId');
        expect(form).toContain('if (!updated)');
        expect(form).toContain('if (!removed)');
        expect(cards).toContain('scrollIntoView');
    });

    it('تقليم الجسور مقسوم؛ مسار idle محذوف', () => {
        const prune = fs.readFileSync(
            path.join(root, 'src/app/services/calendar/dossierSync/prune.ts'),
            'utf8',
        );
        expect(prune).toContain("from './pruneValidIds'");
        expect(prune).toContain('collectValidBridgeIdsAsync');
        expect(prune).not.toContain('UrgentActionsDB');
        expect(
            fs.existsSync(
                path.join(root, 'src/app/services/calendar/requestCalendarDossierSyncIdle.ts'),
            ),
        ).toBe(false);
        expect(
            fs.existsSync(
                path.join(
                    root,
                    'src/app/components/lawyer/SmartLegalRadar/radarCalendarDots.ts',
                ),
            ),
        ).toBe(false);
    });

    it('عقد المزامنة مسمّى؛ المهل القانونية تُحمى؛ فشل الخلفية يُعلن في الرادر', () => {
        const types = fs.readFileSync(
            path.join(root, 'src/app/services/calendar/dossierSync/types.ts'),
            'utf8',
        );
        const pruneIds = fs.readFileSync(
            path.join(root, 'src/app/services/calendar/dossierSync/pruneValidIds.ts'),
            'utf8',
        );
        const lawsuit = fs.readFileSync(
            path.join(root, 'src/app/services/calendar/dossierSync/lawsuitSync.ts'),
            'utf8',
        );
        const incremental = fs.readFileSync(
            path.join(root, 'src/app/hooks/useIncrementalCalendarSync.ts'),
            'utf8',
        );
        const calData = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/hooks/useCalendarData.ts'),
            'utf8',
        );
        const rules = fs.readFileSync(
            path.join(root, 'src/app/services/calendar/dossierSync/orchestrator.ts'),
            'utf8',
        );
        const reminder = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/SmartLegalRadar/EventFormTimeField.tsx',
            ),
            'utf8',
        );
        expect(types).toContain('CALENDAR_LIVE_SYNC_SCOPE');
        expect(types).toContain('CALENDAR_FILE_SAVE_SYNC_SCOPE');
        expect(pruneIds).toContain('collectStageLegalCalendarSpecs');
        expect(pruneIds).toContain('EXECUTION_VISIT_NEXT_EVENT_ID');
        expect(lawsuit).toContain('collectStageLegalCalendarSpecs');
        expect(incremental).toContain('CALENDAR_BACKGROUND_SYNC_FAILED_EVENT');
        expect(incremental).toContain('ok === false');
        expect(incremental).toMatch(
            /export function bumpThreadingCalendarSync[\s\S]*?clearDossierSyncFingerprint\(lawyerId\)/,
        );
        expect(calData).toContain('CALENDAR_BACKGROUND_SYNC_FAILED_EVENT');
        expect(calData).toContain('withCalendarTimeout');
        expect(calData).toContain('calendar-mutation-timeout');
        const view = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/SmartLegalRadar/hooks/useSmartLegalRadarView.ts'),
            'utf8',
        );
        expect(view).toContain('selectedDateAfterMonthShift');
        expect(view).toContain('calendarShellSession');
        const radar = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/SmartLegalRadar.tsx'),
            'utf8',
        );
        expect(radar).toContain('RadarCalendarSyncError');
        expect(radar).toContain('refreshCalendar');
        expect(rules).toContain('مهجور');
        expect(reminder).toContain('fromUserGesture: true');
        const fingerprint = fs.readFileSync(
            path.join(root, 'src/app/services/calendar/calendarDossierFingerprint.ts'),
            'utf8',
        );
        expect(fingerprint).toContain('resolveNextExecutionVisitation');
        const openSource = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/schedule/openCalendarRadarSource.ts'),
            'utf8',
        );
        expect(openSource).toContain('EXECUTION_VISIT_NEXT_EVENT_ID');
        expect(openSource).toContain('requestOpenExecutionVisitationWorkspace');
        const visitHook = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/ExecutionDashboard/components/visitationSchedule/useVisitationScheduleModuleState.ts',
            ),
            'utf8',
        );
        expect(visitHook).toContain('consumeOpenExecutionVisitationWorkspaceRequest');
    });

    it('بوابة التقويم تقيس المسارات الحية لا القشور المحذوفة', () => {
        const gate = fs.readFileSync(path.join(root, 'scripts/calendar-production-gate.mjs'), 'utf8');
        expect(gate).toContain('RadarOpenInstantChrome.tsx');
        expect(gate).toContain('CalendarReminderModal.tsx');
        expect(gate).toContain('LawyerDashboardScheduleTab.tsx');
        expect(gate).not.toContain('ScheduleInstantShell.tsx');
        expect(gate).not.toContain('LegalCommandCenterDock.tsx');
        const e2e = fs.readFileSync(path.join(root, 'e2e/smart-legal-radar.spec.ts'), 'utf8');
        expect(e2e).toContain("toHaveAttribute('aria-label', 'إغلاق التقويم')");
        expect(e2e).toContain("toHaveText('الشهر')");
        expect(e2e).not.toContain("toContainText('إغلاق التقويم')");
        expect(e2e).not.toMatch(
            /await expect\(radar\)\.toBeVisible[\s\S]*radar-empty-state[\s\S]*return radar/,
        );
        expect(e2e).toContain('bootHomeWithCalendarSeed');
        expect(e2e).toContain('commitCalendarEventsSeed');
        const calendarFixtures = fs.readFileSync(
            path.join(root, 'e2e/helpers/calendarFixtures.ts'),
            'utf8',
        );
        expect(calendarFixtures).toContain('E2E_CALENDAR_USER_ID = GUEST_LAWYER_ID');
        expect(calendarFixtures).toContain('commitCalendarEventsSeed');
        const seedFn = calendarFixtures.match(
            /export async function seedCalendarEvents[\s\S]*?^export async function /m,
        )?.[0];
        expect(seedFn).toBeTruthy();
        expect(seedFn).not.toContain('indexedDB');
    });

    it('تذكير الموعد يملك Escape وCap (LIFO فوق أي تبويب)', () => {
        const reminder = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/SmartLegalRadar/CalendarReminderModal.tsx'),
            'utf8',
        );
        expect(reminder).toContain('registerNativeBackHandler');
        expect(reminder).toContain("from '@/app/runtime/nativeBackStack'");
        expect(reminder).toContain("event.key !== 'Escape'");
        expect(reminder).toContain('onDismiss');
        expect(reminder).toContain('min-h-[44px]');
        const surface = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/schedule/DashboardTabSurface.tsx'),
            'utf8',
        );
        expect(surface).toContain('inertProps(!active)');
        expect(surface).toContain('blurFocusWithin');
    });
});
