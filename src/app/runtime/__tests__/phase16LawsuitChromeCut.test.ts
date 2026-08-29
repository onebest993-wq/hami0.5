import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

describe('phase-16 lawsuit chrome first-paint', () => {
    it('MainView يركّب Lawsuits OverlayEntry بشكل كسول مع await-before-mount', () => {
        const src = readLawyerDashboardMainViewSurface();
        expect(src).toContain('LazyLawsuitsOverlayEntry');
        expect(src).toContain('loadLawsuitsOverlayEntry');
        expect(src).not.toMatch(
            /import \{ LawyerDashboardLawsuitsOverlayEntry \} from/,
        );
        expect(src).not.toMatch(/lawsuitsLive[\s\S]{0,300}LawsuitsWorkspaceFallback/);
    });

    it('Lawsuits OverlayEntry يقطع Host بـ InstantChrome + lazy', () => {
        const src = readFileSync(
            join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardLawsuitsOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(src).toContain('LawsuitsWorkspaceInstantChrome');
        expect(src).toContain('LazyLawsuitsWorkspaceHost');
        expect(src).toContain("from '@/app/components/lawyer/dashboard/lawsuitsWorkspaceHostLazy'");
        expect(src).not.toMatch(/import \{ LawsuitsWorkspaceHost \}/);
        expect(src).not.toContain('lazyWithRetry');
        /* InstantChrome فقط عند الفتح المرئي — التسخين المخفي بلا قشرة فوق اللوحة */
        expect(src).toMatch(/visible\s*\?\s*\([\s\S]*LawsuitsWorkspaceInstantChrome/);
    });

    it('تسخين الدعاوى يثبّت Host مبكراً (interactive + prime event)', () => {
        const overlays = readFileSync(
            join(root, 'src/app/hooks/useLawyerDashboardOverlays.ts'),
            'utf8',
        );
        const warm = readFileSync(join(root, 'src/app/runtime/lawsuitWorkspaceWarm.ts'), 'utf8');
        const events = readFileSync(join(root, 'src/app/runtime/lawsuitWorkspaceEvents.ts'), 'utf8');
        expect(events).toContain("LAWSUITS_PRIME_HOST_EVENT = 'hami:lawsuits-prime-host'");
        expect(warm).toContain("from '@/app/runtime/lawsuitWorkspaceEvents'");
        expect(warm).toMatch(/dispatchEvent\(new CustomEvent\(LAWSUITS_PRIME_HOST_EVENT\)\)/);
        expect(overlays).toContain('armLawsuitsHost');
        expect(overlays).toContain('onDashboardInteractive');
        expect(overlays).toContain("from '@/app/runtime/lawsuitWorkspaceEvents'");
        expect(overlays).not.toMatch(/from '@\/app\/runtime\/lawsuitWorkspaceWarm'/);
        expect(overlays).not.toMatch(/from '@\/app\/runtime\/executionArchiveOpenSession'/);
        expect(overlays).toContain('LAWSUITS_PRIME_HOST_EVENT');
        expect(overlays).toContain('loadLawsuitsOverlayEntry');
        expect(warm).toContain('prefetchLawsuitsOverlayEntry');
        expect(warm).toContain('prefetchLawsuitsWorkspaceHost');
    });

    it('InstantChrome يطابق كروم المخزن (CivilArchiveInstantShell) أثناء الانتظار', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawsuitsWorkspaceInstantChrome.tsx'),
            'utf8',
        );
        expect(src).toContain('LawsuitsCivilArchiveInstantShell');
        expect(src).toContain('data-open="false"');
        expect(src).not.toContain('data-open="true"');
        expect(src).toContain('مستعجل');
        expect(src).toContain('الدعاوى');
        expect(src).not.toContain('دعاوى · مستعجل');
        expect(src).not.toContain('إدارة ملفات الدعاوى والإضابير القضائية');
        // لا Escape/رجوع أثناء Suspense — يغلق المساحة قبل Host (انحدار E2E)
        expect(src).not.toContain('registerNativeBackHandler');
        expect(src).not.toContain("addEventListener('keydown'");
        expect(src).not.toContain('onClose');
        expect(src).toContain('h-11 w-11 min-h-[44px] min-w-[44px]');
        expect(src).not.toContain('inline-flex h-9 w-9 shrink-0');
    });

    it('CivilArchiveInstantShell لا يرسم شبكة وهمية مختلفة عن بطاقات المخزن', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawsuitsCivilArchiveInstantShell.tsx'),
            'utf8',
        );
        expect(src).toContain('جاري تجهيز الإضابير');
        expect(src).not.toContain('LawsuitVaultSnapshotGrid');
        expect(src).not.toContain('لا توجد ملفات');
        expect(src).not.toContain('Array.from');
        expect(src).not.toContain('جاري تحميل الإضابير');
    });

    it('lawsuitWorkspaceWarm لا يفعّل جسر الجزائي على المسار الفوري', () => {
        const src = readFileSync(join(root, 'src/app/runtime/lawsuitWorkspaceWarm.ts'), 'utf8');
        expect(src).not.toMatch(
            /export function warmLawsuitWorkspace[\s\S]{0,500}requestCriminalDashboardBridgeActivate\(\)/,
        );
        expect(src).toContain('bridgeEvent');
        expect(src).toContain('includeSecondary');
    });

    it('Host لا يستورد SmartFile/NewCase بشكل ثابت', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawsuitsWorkspaceHost.tsx'),
            'utf8',
        );
        expect(src).not.toContain("from '@/app/runtime/lawyerNewCaseLoader'");
        expect(src).not.toContain("from '@/app/runtime/smartFileModalLoader'");
        expect(src).toContain('ArchivePortalHost');
        expect(src).not.toMatch(/^prefetchSmartFileModalPhased\(\)/m);
    });

    it('DossierOverlay يقطع Portal sync عن stem عبر preload-aware lazy مشترك', () => {
        const src = readFileSync(
            join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionDossierOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(src).toContain('executionDashboardPortalLazy');
        expect(src).toContain('LazyExecutionDashboardPortal');
        expect(src).toContain('isPreloaded()');
        expect(src).toContain('portalProps');
        expect(src).toMatch(/\bopen,\s*$/m);
        expect(src).not.toContain("from '@/app/components/lawyer/dashboard/ExecutionDashboardPortal'");
        expect(src).not.toContain("from '@/app/components/lawyer/dashboard/ExecutionDashboardBootChrome'");
        expect(src).not.toContain('ExecutionDossierInstantChrome');
        expect(src).toContain('ExecutionDossierInstantPaintCover');
        expect(src).not.toContain('<Suspense fallback={null}>');
    });

    it('Header و AppAlerts يستوردان bridge/lite لا برميل calendarBridge', () => {
        const header = readFileSync(
            join(root, 'src/app/components/lawyer/LawyerDashboardParts/components/Header.tsx'),
            'utf8',
        );
        const alerts = readFileSync(
            join(root, 'src/app/hooks/useLawyerDashboardAppAlerts.ts'),
            'utf8',
        );
        expect(header).not.toContain("from '@/app/services/calendar/bridge/lite'");
        expect(header).not.toContain("from '@/app/services/calendarBridge'");
        expect(alerts).toContain("from '@/app/services/calendar/bridge/lite'");
        expect(alerts).not.toContain("from '@/app/services/calendarBridge'");
    });

    it('lawsuit hooks لا تستورد lawyerDbRuntime بشكل sync', () => {
        const newCase = readFileSync(join(root, 'src/app/hooks/useLawsuitNewCaseFlow.ts'), 'utf8');
        const dossier = readFileSync(join(root, 'src/app/hooks/useLawsuitActiveDossier.ts'), 'utf8');
        const deferred = readFileSync(join(root, 'src/app/hooks/lawsuitPersistDeferred.ts'), 'utf8');
        expect(newCase).not.toContain("from '@/app/services/lawyerDbRuntime'");
        expect(dossier).not.toContain("from '@/app/services/lawyerDbRuntime'");
        expect(deferred).not.toContain("from '@/app/services/lawyerDbRuntime'");
        expect(deferred).toContain("import('@/app/services/lawyerDbRuntime')");
    });

    it('executionDomainIsolation يستخدم keys lite وstorageCache dynamic', () => {
        const src = readFileSync(
            join(root, 'src/app/utils/executionDomainIsolationRead.ts'),
            'utf8',
        );
        expect(src).toContain("from '@/app/utils/executionStorageKeysLite'");
        expect(src).not.toContain("from '@/app/utils/executionStorageKeys'");
        expect(src).not.toContain("from '@/app/utils/storageCache'");
        expect(src).toContain("import('@/app/utils/storageCache')");
    });

    it('useNeuralAlertsFromSecretary لا يسحب SecretaryOrchestrator إلى HubCard', () => {
        const src = readFileSync(
            join(
                root,
                'src/app/components/lawyer/NeuralAlertsCard/useNeuralAlertsFromSecretary.ts',
            ),
            'utf8',
        );
        expect(src).toContain('classifySecretaryAlertsByHorizon');
        expect(src).not.toMatch(
            /import\s*\{[^}]*SecretaryOrchestrator[^}]*\}\s*from\s*'@\/app\/services\/SecretaryOrchestrator'/,
        );
    });
});
