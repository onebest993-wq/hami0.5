import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readCommandHubImplSource } from './readCommandHubImplSource';
import { readHomeTabImplSource } from './readHomeTabImplSource';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

describe('field-tasks dock section surgical close honesty', () => {
    it('الـ hook لا يركّب Host المهام عند الإقلاع ولا يستعيد الجلسة', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardFieldTasks.ts'),
            'utf8',
        );
        expect(hook).toContain('readInitialFieldTasksSession');
        expect(hook).toMatch(
            /const \[fieldTasksHostMounted, setFieldTasksHostMounted\] = useState\(false\)/,
        );
        expect(hook).toMatch(
            /const \[fieldTasksSheetOpen, setFieldTasksSheetOpen\] = useState\(false\)/,
        );
        expect(hook).toContain('hasLocalAppSession(userId)');
        expect(hook).not.toContain('hasLocalAppSession(null)');
        expect(hook).toContain('executeFieldTasksOverlayClose');
        expect(hook).toContain('executeTasksManagerOverlayClose');
        expect(hook).toContain('beginHubLayerExit');
        expect(hook).toContain('snapFieldTasksShellOpen');
        expect(hook).toContain('snapFieldTasksShellClose');
        expect(hook).toContain('blurFocusWithin');
        expect(hook).toContain("registerDashboardOverlayCloser('field-tasks', closeFieldTasksSheet)");
        expect(hook).toContain("registerDashboardOverlayCloser('tasks-manager', closeTasksManager)");
        expect(hook).not.toMatch(/initialSession\.open && initialSession\.surface === 'sheet'/);
        expect(hook).toContain('بلا تركيب Host حتى الفتح');
        expect(hook).not.toContain('ركّب Host مخفياً فور تسجيل الدخول');
        expect(hook).not.toContain('primeFieldTasksHostMount(setFieldTasksHostMounted)');
        const identityBlock = hook.match(
            /\/\*\* تسخين المقطع فور تسجيل الدخول[\s\S]*?\}, \[primeFieldTasksShellMount, userId\]\);/,
        )?.[0];
        expect(identityBlock).toBeTruthy();
        expect(identityBlock).not.toContain('setFieldTasksHostMounted(true)');
        const closeSheet = hook.slice(
            hook.indexOf('const closeFieldTasksSheet = useCallback'),
            hook.indexOf('}, [withInstantPaint]);', hook.indexOf('const closeFieldTasksSheet = useCallback')) + 24,
        );
        expect(closeSheet).toContain('setFieldTasksSheetOpen(false)');
        expect(closeSheet).not.toContain('setFieldTasksHostMounted(false)');
        expect(hook).toContain('useKeepAliveIdleRelease(fieldTasksSheetOpen');
        const closeManager = hook.slice(
            hook.indexOf('const closeTasksManager = useCallback'),
            hook.indexOf('}, [withInstantPaint]);', hook.indexOf('const closeTasksManager = useCallback')) + 24,
        );
        expect(closeManager).toContain('setShowTasksManager(false)');
        expect(closeManager).not.toContain('setFieldTasksManagerHostMounted(false)');
        expect(hook).toContain('useKeepAliveIdleRelease(showTasksManager');
        expect(hook).not.toContain('afterTasksManagerOpen');
        expect(hook).not.toContain('loadFieldTasksHubLoader');
    });

    it('MainView يركّب FieldTasksOverlayEntry sync مثل المعاملات (بلا Suspense skeleton)', () => {
        const main = readLawyerDashboardMainViewSurface();
        /* كسول + تسخين بعد content-ready — كان يجرّ ٣٣١ ك.ب إلى مقطع اللوحة */
        expect(main).toContain('LazyFieldTasksOverlayEntry');
        expect(main).toContain('warmOverlayEntryChunks');
        expect(main).not.toContain('FieldTasksSheetFallback');
        expect(main).toContain('FieldTasksSheetOpenInstantChrome');
        expect(main).toContain('loadFieldTasksSheetModule');
        expect(main).toMatch(/fieldTasksLive[\s\S]*?LazyFieldTasksOverlayEntry/);
        const deferred = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/createDeferredFeatureStubs.ts'),
            'utf8',
        );
        expect(deferred).toContain('paintFieldTasksInstantChrome');
        expect(deferred).toContain('loadFieldTasksSheetModule');
        expect(deferred).toContain('snapFieldTasksShellOpen');
    });

    it('pointerPrime للمهام يُسخّن عند الضغط بلا فتح مبكر أو microtask', () => {
        const gate = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/dockShellPrefetchGate.ts'),
            'utf8',
        );
        const tasksPrime = gate.match(
            /if \(widgetId === 'dockTasks'\) \{[\s\S]*?return;\s*\}/,
        )?.[0];
        expect(tasksPrime).toBeTruthy();
        expect(tasksPrime).toContain('dispatchFieldTasksPrimeHost');
        expect(tasksPrime).toContain('loadFieldTasksSheetModule');
        expect(tasksPrime).toContain('loadTasksManagerModule');
        expect(tasksPrime).toContain('prefetchFieldTasksCurtainCardSurfaces');
        expect(tasksPrime).toContain('warmTasksManagerAgendaDevTransforms');
        expect(tasksPrime).not.toContain('prefetchTasksManagerModule');
        expect(tasksPrime).toContain('scheduleFieldTasksCurtainPeekFromSecureStore');
        expect(tasksPrime).toContain("prefetchDockWidgetIntentImmediate('dockTasks', 'hover')");
        expect(tasksPrime).not.toContain("prefetchDockWidgetIntentImmediate('dockTasks', 'open')");
        expect(tasksPrime).not.toContain('queueMicrotask');
        expect(tasksPrime).not.toContain('hydrateFieldTasksShellForInstantOpen');
        expect(gate).not.toContain("from '@/app/runtime/fieldTasksBootHydrator'");
    });

    it('prefetch open للمهام يستدعي warmFieldTasksOnOpen', () => {
        const prefetch = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch.ts'),
            'utf8',
        );
        const tasksCase = prefetch.match(
            /case 'dockTasks':[\s\S]*?break;/,
        )?.[0];
        expect(tasksCase).toBeTruthy();
        expect(tasksCase).toContain("phase === 'open'");
        expect(tasksCase).toContain('warmFieldTasksOnOpen');
        expect(tasksCase).toContain('warmFieldTasksOnHover');
    });

    it('بلاطة dockTasks في الشبكة الرئيسية بلا أيقونة lucide', () => {
        const tiles = readCommandHubImplSource(root);
        expect(tiles).toContain('DockHalfTile');
        expect(tiles).not.toContain('HomeListChecksIcon');
        expect(tiles).not.toMatch(/\bListChecks\b/);
    });

    it('FieldTasksSheetHost يركّب الستارة الثابتة ويحترم keepAlive', () => {
        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksSheetHost.tsx'),
            'utf8',
        );
        expect(host).toMatch(/import \{ FieldTasksBottomSheet \} from/);
        expect(host).toMatch(/if \(!open && !keepAlive\)/);
        expect(host).not.toContain('FieldTasksInstantSheetShell');
        expect(host).not.toContain('FieldTasksWarmSheetBridge');
        expect(host).not.toContain('hydrateFieldTasksShellForInstantOpen');
        const entry = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardFieldTasksOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(entry).toContain('keepAlive={fieldTasksHostMounted && !fieldTasksSheetOpen}');
        expect(entry).toContain('keepAlive={fieldTasksManagerHostMounted && !showTasksManager}');
        expect(entry).toContain('FieldTasksManagerHost');
        expect(entry).not.toContain('LazyFieldTasksManagerHost');
        expect(entry).not.toContain('lazy(');
        expect(entry).not.toContain('TasksManagerOverlay');
        expect(entry).not.toContain('fallback={null}');
        expect(entry).toContain('sheetLive ? files : SUSPENDED_LAWSUIT_FILES');
        expect(entry).toContain('managerLive ? files : SUSPENDED_LAWSUIT_FILES');
        expect(entry).not.toContain('prefetchFieldTasksSheetModule');
        const sheet = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/FieldTasksBottomSheet.tsx'),
            'utf8',
        );
        expect(sheet).toContain("import './fieldTasks/fieldTasksChrome.css'");
        expect(sheet).toContain('hami-field-tasks-layer');
        expect(sheet).toContain('hami-field-tasks-sheet-motion');
        expect(sheet).toContain('layerInteractive');
        expect(sheet).toContain('open && !fatalOpen');
        expect(sheet).toContain('data-interactive');
        expect(sheet).toContain('closeArmedRef');
        expect(sheet).toContain('handleBackdropDismiss');
        expect(sheet).toContain('removeFieldTasksInstantChrome');
        expect(sheet).toContain('sheetHydrated');
        expect(sheet).toContain('FIELD_TASKS_CURTAIN_PEEK_READY_EVENT');
        expect(sheet).toContain('isFieldTasksShellSnappedOpen');
        expect(sheet).toContain('FIELD_TASKS_INSTANT_COMPLETE_EVENT');
        expect(sheet).toContain('drainFieldTasksInstantCompleteQueue');
        expect(sheet).toContain('unlockFieldTasksLayerHits');
        const chrome = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/fieldTasks/fieldTasksChrome.css'),
            'utf8',
        );
        expect(chrome).toContain("[data-interactive='true']");
        expect(chrome).toContain(":not([data-interactive='true']) *");
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksInstantSheetShell.tsx'),
            ),
        ).toBe(false);
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksWarmSheetBridge.tsx'),
            ),
        ).toBe(false);
    });

    it('FieldTasksManagerHost يبقي الأجندة مخفية عند keepAlive بعد الإغلاق', () => {
        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksManagerHost.tsx'),
            'utf8',
        );
        expect(host).toMatch(/if \(!open && !keepAlive\)/);
        expect(host).not.toContain('TasksManagerFallback');
        expect(host).toContain('TasksManagerOpenInstantChrome');
        const overlay = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/TasksManagerOverlay.tsx'),
            'utf8',
        );
        expect(overlay).toContain('keepAlive');
        expect(overlay).toMatch(/if \(\(!open && !keepAlive\)/);
        expect(overlay).toContain('surfaceOpen={open}');
        expect(overlay).toContain('inertProps(!open)');
        expect(overlay).toContain("from '@/app/components/lawyer/dashboard/TasksManager'");
        expect(overlay).not.toContain('lazyWithRetry');
        expect(overlay).toContain('removeTasksManagerInstantChrome');
        expect(overlay).toContain("pointer-events', 'auto'");
        const hub = fs.readFileSync(
            path.join(root, 'src/app/runtime/fieldTasksHubLoader.ts'),
            'utf8',
        );
        expect(hub).not.toContain("tasksManager/TaskCard");
        expect(hub).toContain('warmTasksManagerAgendaDevTransforms');
        expect(hub).toContain('/hami-dev/warm-tasks-manager-agenda');
        const agendaCard = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/tasksManager/AgendaTaskCard.tsx'),
            'utf8',
        );
        expect(agendaCard).toContain("from './TaskCard'");
        expect(agendaCard).not.toContain('lazyWithRetry');
        const manager = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/TasksManager.tsx'),
            'utf8',
        );
        expect(manager).toContain('useLayoutEffect');
        expect(manager).toContain('handlePaintReady');
        expect(manager).toContain('prefetchTasksManagerSecondarySurfaces');
        expect(manager).toMatch(/useTasksLifecycle\(surfaceOpen, surfaceOpen\)/);
        expect(host).toContain('requestIdleCallback');
        expect(hub).not.toContain('FieldTasksManagerHost');
        const sheet = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/FieldTasksBottomSheet.tsx'),
            'utf8',
        );
        expect(sheet).toContain('onPointerDown');
        expect(sheet).toContain('loadTasksManagerModule');
        expect(sheet).not.toContain('activateOnPointerDown');
    });

    it('dockTasks يفتح على النقر الطبيعي مع warm موحّد', () => {
        const homeTab = readHomeTabImplSource(root);
        expect(homeTab).toContain("id === 'dockTasks'");
        expect(homeTab).not.toContain('activateOnPointerDown');
        const gate = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/dockShellPrefetchGate.ts'),
            'utf8',
        );
        expect(gate).toContain("prefetchDockWidgetIntentImmediate('dockTasks', 'hover')");
        const warm = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/fieldTasksIntentWarm.ts'),
            'utf8',
        );
        expect(warm).toContain('prefetchFieldTasksSheetModule');
        expect(warm).toContain('prefetchFieldTasksCurtainCardSurfaces');
        expect(warm).not.toContain('prefetchTasksManagerSecondarySurfaces');
        expect(warm).toContain('warmFieldTasksSheetCore');
        expect(warm).toContain('prefetchTasksManagerModule');
        expect(warm).not.toContain('LawyerDashboardFieldTasksOverlayEntry');
        const hydrate = fs.readFileSync(
            path.join(root, 'src/app/runtime/fieldTasksBootHydrator.ts'),
            'utf8',
        );
        expect(hydrate).toContain('prefetchFieldTasksAfterBootReveal');
        expect(hydrate).toContain('scheduleFieldTasksCurtainPeekFromSecureStore');
        expect(hydrate).toContain('allowOnLite: true');
        expect(hydrate).toMatch(/hydrateDelayMs[\s\S]*?return 0;/);
        expect(hydrate).not.toContain('prefetchTasksManagerModule');
        expect(hydrate).not.toContain('prefetchFieldTasksHubModule');
        expect(hydrate).not.toMatch(/from ['"]@\/app\/utils\/quantumTasksCurtainPeek['"]/);
        const openFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/fieldTasks/fieldTasksShellOpenFlow.ts'),
            'utf8',
        );
        expect(openFlow).toContain('paintTasksManagerInstantChrome');
        expect(openFlow).toContain('paintFieldTasksInstantChrome');
        expect(openFlow).toContain('loadFieldTasksSheetModule');
        expect(openFlow).toContain('loadTasksManagerModule');
        expect(openFlow).toContain('warmTasksManagerAgendaDevTransforms');
        expect(openFlow).not.toContain('import.meta.env.DEV');
        expect(warm).not.toContain('hami-dev/warm-tasks-manager-agenda');
        expect(openFlow).toContain('suppressFieldTasksClose');
        expect(openFlow).toContain('setFieldTasksManagerHostMounted(false)');
        const chunks = fs.readFileSync(
            path.join(root, 'src/app/runtime/overlayEntryChunks.ts'),
            'utf8',
        );
        expect(chunks).toContain('prefetchFieldTasksSheetModule');
        expect(chunks).toContain('hydrateFieldTasksSheetForInstantOpen');
        const repoIdx = chunks.indexOf('prefetchRepositoryHubModule');
        const fieldTasksIdx = chunks.indexOf('prefetchFieldTasksSheetModule');
        const settingsIdx = chunks.indexOf('prefetchSettingsOverlayEntry();');
        expect(repoIdx).toBeGreaterThan(0);
        expect(fieldTasksIdx).toBeGreaterThan(repoIdx);
        expect(fieldTasksIdx).toBeLessThan(settingsIdx);
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain('hami-field-tasks-agenda-dev-warm');
        expect(vite).toContain('TasksManagerOverlay.tsx');
        expect(vite).toMatch(/warmup:\s*\{[\s\S]*clientFiles:\s*\[[\s\S]*AppBootRoot/);
        const warmupBlock = vite.slice(vite.indexOf('warmup:'), vite.indexOf('watch:', vite.indexOf('warmup:')));
        expect(warmupBlock).not.toContain('TasksManagerOverlay');
        expect(warmupBlock).not.toContain('FieldTasksBottomSheet');
    });

    it('ستارة المهام تستورد البطاقة مرة واحدة بلا إعلان مكرر', () => {
        const sheet = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/FieldTasksBottomSheet.tsx'),
            'utf8',
        );
        const chrome = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksSheetChrome.tsx'),
            'utf8',
        );
        expect(sheet).toContain('FieldTasksSheetChrome');
        expect(sheet).not.toContain('FieldCurtainTaskCard');
        expect(chrome).toContain(
            "import { FieldCurtainTaskCard } from '@/app/components/lawyer/dashboard/fieldTasks/FieldCurtainTaskCard'",
        );
        expect(chrome).not.toMatch(/const FieldCurtainTaskCard\s*=/);
        expect(chrome).not.toContain('function FieldCurtainTaskCard');
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/dashboard/fieldTasks/FieldCurtainTaskCard.tsx'),
            ),
        ).toBe(true);
        const card = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/fieldTasks/FieldCurtainTaskCard.tsx'),
            'utf8',
        );
        expect(card).toContain('FieldCurtainWorkspacePin');
        expect(card).not.toContain('WorkspacePinButton');
        expect(card).not.toMatch(/from ['"][^'"]*WorkspacePinButton['"]/);
        const instant = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksSheetOpenInstantChrome.tsx'),
            'utf8',
        );
        expect(instant).not.toContain('FieldTasksSheetChrome');
        expect(instant).not.toContain('FieldCurtainTaskCard');
        expect(instant).toContain('requestFieldTasksInstantComplete');
        expect(instant).toContain('requestFieldTasksInstantManage');
        expect(instant).toContain('handleInstantDismiss');
        expect(instant).toContain('handleInstantAction');
        expect(instant).toContain('إنهاء');
        const fieldHook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardFieldTasks.ts'),
            'utf8',
        );
        expect(fieldHook).toContain('FIELD_TASKS_INSTANT_MANAGE_EVENT');
    });

    it('مسار المهام بلا debug 127.0.0.1:7777', () => {
        const files = [
            'src/app/hooks/lawyerDashboard/useLawyerDashboardFieldTasks.ts',
            'src/app/components/lawyer/dashboard/HomeTabContent.tsx',
            'src/app/components/lawyer/dashboard/HomeTabWidgetSlot.tsx',
            'src/app/components/lawyer/dashboard/useHomeTabContentModel.ts',
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardFieldTasksOverlayEntry.tsx',
            'src/app/hooks/lawyerDashboard/fieldTasksIntentWarm.ts',
        ];
        for (const rel of files) {
            const src = fs.readFileSync(path.join(root, rel), 'utf8');
            expect(src, rel).not.toContain('127.0.0.1:7777');
        }
    });

    it('جزيرة الميدان مستقلة عن Deferred (معاملات/بحث)', () => {
        const deferred = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces.tsx',
            ),
            'utf8',
        );
        expect(deferred).not.toContain('useLawyerDashboardFieldTasks');
        expect(deferred).toContain('params.openTasksManager');
        const island = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardFieldTasksFeatureSurfaces.tsx',
            ),
            'utf8',
        );
        expect(island).toContain('useLawyerDashboardFieldTasks');
        expect(island).toContain('params.closeCommunity');
        const orch = fs.readFileSync(
            path.join(
                root,
                'src/app/hooks/lawyerDashboard/useLawyerDashboardPreWorkspaceOrchestration.ts',
            ),
            'utf8',
        );
        expect(orch).toContain('isFieldTasksDeferredOp');
        expect(orch).toContain('setFieldTasksForceArm(true)');
        const gate = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/dockShellPrefetchGate.ts'),
            'utf8',
        );
        const tasksPrime = gate.match(
            /if \(widgetId === 'dockTasks'\) \{[\s\S]*?return;\s*\}/,
        )?.[0];
        expect(tasksPrime).toBeTruthy();
        expect(tasksPrime).toContain('LawyerDashboardFieldTasksFeatureSurfaces');
        expect(tasksPrime).not.toContain('LawyerDashboardDeferredFeatureSurfaces');
        const main = readLawyerDashboardMainViewSurface();
        expect(main).toContain('LazyLawyerDashboardFieldTasksFeatureSurfaces');
        expect(main).toContain('fieldTasksSurfacesMount');
    });

    it('مسار ستارة الميدان بلا NLP ولا prepareAgendaTasks ساكن', () => {
        const files = [
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardFieldTasksOverlayEntry.tsx',
            'src/app/context/QuantumTasksProvider.tsx',
            'src/app/hooks/useQuantumTasksCore.ts',
            'src/app/hooks/useQuantumTaskLifecycleMutations.ts',
            'src/app/utils/quantumTasksStorage.ts',
            'src/app/components/lawyer/dashboard/tasksManager/quantumTasksHydration.ts',
            'src/app/components/lawyer/dashboard/FieldTasksBottomSheet.tsx',
            'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksSheetHost.tsx',
        ];
        for (const rel of files) {
            const src = fs.readFileSync(path.join(root, rel), 'utf8');
            expect(src, rel).not.toMatch(/from ['"][^'"]*nlpParser['"]/);
            expect(src, rel).not.toMatch(/from ['"][^'"]*tasksManager\/utils['"]/);
            expect(src, rel).not.toMatch(/from ['"][^'"]*quantumTaskCreateBuilders['"]/);
            expect(src, rel).not.toMatch(/from ['"][^'"]*useQuantumTasksCreate['"]/);
        }
        const provider = fs.readFileSync(
            path.join(root, 'src/app/context/QuantumTasksProvider.tsx'),
            'utf8',
        );
        expect(provider).toContain('useQuantumTasksCore');
        expect(provider).toContain('useQuantumTasksCreateLazy');
        expect(provider).toContain("import('@/app/components/lawyer/dashboard/tasksManager/utils')");
        expect(provider).not.toMatch(/from ['"][^'"]*useQuantumTasks['"]/);
    });

    it('حوار الحتمي في الستارة يبقى بنصه ومظهره منفصلين عن الأجندة', () => {
        const curtain = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksFatalDialog.tsx'),
            'utf8',
        );
        const agenda = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/tasksManager/TasksManagerFatalDialog.tsx'),
            'utf8',
        );
        expect(curtain).toContain('تحذير — موعد حتمي');
        expect(curtain).toContain('سقوط حق');
        expect(curtain).toContain('CURTAIN_FATAL_DIALOG');
        expect(curtain).toContain('useMobileKeyboardInset(open, true)');
        expect(agenda).toContain('موعد حتمي');
        expect(agenda).toContain('أجل قطعي');
        expect(agenda).toContain('TASKS_DIALOG_CONTENT');
        expect(curtain).not.toContain('أجل قطعي');
        expect(agenda).not.toContain('تحذير — موعد حتمي');
        expect(agenda).not.toContain('CURTAIN_FATAL_DIALOG');
        expect(curtain).not.toContain('TASKS_DIALOG_CONTENT');
    });
});
