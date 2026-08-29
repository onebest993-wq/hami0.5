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
        expect(closeSheet).toContain('setFieldTasksHostMounted(false)');
    });

    it('MainView يركّب FieldTasksOverlayEntry sync مثل المعاملات (بلا Suspense skeleton)', () => {
        const main = readLawyerDashboardMainViewSurface();
        /* كسول + تسخين بعد content-ready — كان يجرّ ٣٣١ ك.ب إلى مقطع اللوحة */
        expect(main).toContain('LazyFieldTasksOverlayEntry');
        expect(main).toContain('warmOverlayEntryChunks');
        expect(main).not.toContain('FieldTasksSheetFallback');
        expect(main).toMatch(/fieldTasksLive[\s\S]*?LazyFieldTasksOverlayEntry/);
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
        expect(entry).toContain('fieldTasksSheetOpen ? files : SUSPENDED_LAWSUIT_FILES');
        expect(entry).not.toContain('prefetchFieldTasksSheetModule');
        const sheet = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/FieldTasksBottomSheet.tsx'),
            'utf8',
        );
        expect(sheet).toContain("import './fieldTasks/fieldTasksChrome.css'");
        expect(sheet).toContain('hami-field-tasks-layer');
        expect(sheet).toContain('hami-field-tasks-sheet-motion');
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

    it('FieldTasksManagerHost لا يركّب الأجندة في DOM قبل open=true', () => {
        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksManagerHost.tsx'),
            'utf8',
        );
        expect(host).toMatch(/ResolvedComponent[\s\S]*?if \(!open\) \{[\s\S]*?return null;/);
        expect(host).not.toContain('TasksManagerFallback');
        expect(host).toContain('TasksManagerOpenInstantChrome');
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
        expect(warm).toContain('warmFieldTasksSheetPipeline');
        expect(warm).toContain('prefetchTasksManagerModule');
        expect(warm).not.toContain('LawyerDashboardFieldTasksOverlayEntry');
        const hydrate = fs.readFileSync(
            path.join(root, 'src/app/runtime/fieldTasksBootHydrator.ts'),
            'utf8',
        );
        expect(hydrate).toContain('prefetchFieldTasksAfterBootReveal');
        expect(hydrate).toMatch(/hydrateDelayMs[\s\S]*?return 0;/);
        expect(hydrate).not.toContain('prefetchTasksManagerModule');
        expect(hydrate).not.toContain('prefetchFieldTasksHubModule');
        const openFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/fieldTasks/fieldTasksShellOpenFlow.ts'),
            'utf8',
        );
        expect(openFlow).toContain('paintTasksManagerInstantChrome');
        expect(openFlow).toContain('loadFieldTasksSheetModule');
        expect(openFlow).toContain('prefetchTasksManagerModule');
        const chunks = fs.readFileSync(
            path.join(root, 'src/app/runtime/overlayEntryChunks.ts'),
            'utf8',
        );
        expect(chunks).toContain('prefetchFieldTasksSheetModule');
    });

    it('ستارة المهام تستورد البطاقة مرة واحدة بلا إعلان مكرر', () => {
        const sheet = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/FieldTasksBottomSheet.tsx'),
            'utf8',
        );
        expect(sheet).toContain(
            "import { FieldCurtainTaskCard } from '@/app/components/lawyer/dashboard/fieldTasks/FieldCurtainTaskCard'",
        );
        expect(sheet).not.toMatch(/const FieldCurtainTaskCard\s*=/);
        expect(sheet).not.toContain('function FieldCurtainTaskCard');
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/dashboard/fieldTasks/FieldCurtainTaskCard.tsx'),
            ),
        ).toBe(true);
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
});
