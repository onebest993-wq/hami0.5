import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

describe('execution dossier instant open — archive warm + sync Entry', () => {
    it('MainView يركّب Dossier Entry بشكل sync بلا Suspense InstantChrome', () => {
        const main = readLawyerDashboardMainViewSurface();
        expect(main).toContain('LazyExecutionDossierOverlayEntry');
        expect(main).not.toContain('execution-dashboard-portal-keepalive');
        expect(main).toContain('EXECUTION_DOSSIER_PRIME_HOST_EVENT');
        expect(main).toContain('executionDossierOverlayLive');
        expect(main).not.toContain('executionDossierHostFile');
    });

    /**
     * **كان يشترط `isPreloaded()` في المدخل** — أي تخطّيَ `Suspense` حين تكون البوّابة محمَّلة. وقِيس ٢٠٢٦-٠٩-١٣
     * في E2E أنّ ذلك التفرّع **يهدم الإضبارة المفتوحة كلَّها** عند أوّل إعادة رسمٍ بعد اكتمال التحميل (تبديلُ نوع
     * العنصر). **وغرضُه — لا وميضَ حين تكون جاهزة — باقٍ بلا تفرّع:** البوّابةُ المحمَّلة تُرسم مباشرةً داخل
     * `Suspense`، ويحرس ذلك سلوكياً `executionOverlayEntriesWarmNoFlash.test.tsx`.
     */
    it('OverlayEntry يستخدم نفس preloadable Portal داخل Suspense دائماً — بلا تفرّع على الجاهزية', () => {
        const entry = readFileSync(
            join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionDossierOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(entry).toContain('executionDashboardPortalLazy');
        expect(entry).toContain('<Suspense');
        expect(entry).not.toMatch(/\.isPreloaded\(\)/);
        expect(entry).toContain('open,');
        expect(entry).not.toContain('lazyWithRetry');
        expect(entry).toContain('ExecutionDossierInstantPaintCover');
        expect(entry).not.toContain('<Suspense fallback={null}>');
    });

    it('Portal لا يُركَّب في DOM عند open=false (لا keep-alive يومض)', () => {
        const portal = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/ExecutionDashboardPortal.tsx'),
            'utf8',
        );
        expect(portal).toContain('if (!open) return null');
        expect(portal).toContain('execution-dashboard-portal-open');
        expect(portal).not.toContain('execution-dashboard-portal-keepalive');
        expect(portal).toContain('createPortal(layer, document.body)');
        expect(portal).toContain('useOverlayGhostClickShield');
    });

    it('OverlayHosts يعرض توأم هندسي فوراً بدل فراغ Suspense', () => {
        const hosts = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainViewOverlayHosts.tsx'),
            'utf8',
        );
        expect(hosts).toContain('ExecutionDossierInstantPaintCover');
        expect(hosts).not.toMatch(
            /executionDossierOverlayLive && executionDossierLive \? \(\s*<Suspense fallback=\{null\}>/,
        );
        const frame = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/ExecutionDossierInstantFrame.tsx'),
            'utf8',
        );
        expect(frame).not.toContain('animate-pulse');
        expect(frame).not.toContain("from '@/app/components/ui/icons/");
        expect(frame).not.toContain('ExecutionDossierHeaderNavButtons');
        expect(frame).toContain('EXECUTION_DOSSIER_TEST_IDS.close');
        expect(frame).toContain('min-h-[44px]');
        expect(frame).toContain('useOverlayGhostClickShield');
        const shell = readFileSync(
            join(
                root,
                'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodyLoadingShell.tsx',
            ),
            'utf8',
        );
        expect(shell).toContain('ExecutionDossierInstantBody');
        expect(shell).not.toContain('animate-pulse');
        expect(shell).toContain('onExitToHome');
    });

    it('مخزن التنفيذ يسخّن سلسلة الإضبارة فوراً (includeSecondary)', () => {
        const chrome = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/ExecutionArchiveChrome.tsx'),
            'utf8',
        );
        expect(chrome).toMatch(/warmExecutionWorkspace[\s\S]{0,200}includeSecondary:\s*true/);
    });

    it('ensureFirstPaint ينتظر preload البوابة + أقسام أول viewport — بلا وحدة الإضبارة السمينة', () => {
        const loader = readFileSync(
            join(root, 'src/app/runtime/executionDashboardLoader.ts'),
            'utf8',
        );
        const ensureFn = loader.slice(
            loader.indexOf('export function ensureExecutionDossierFirstPaintReady'),
            loader.indexOf('export function primeExecutionDossierSurface'),
        );
        expect(ensureFn).toContain('LazyExecutionDashboardPortal.preload()');
        expect(ensureFn).not.toContain('prefetchExecutionDashboardComponent');
        expect(ensureFn).not.toContain('loadExecutionDashboardModule().then');
        expect(ensureFn).toContain('void loadExecutionDashboardModule()');
        expect(ensureFn).toContain('preloadExecutionDashboardFirstViewportSections');
        expect(ensureFn).toContain('executionDashboardLazyRegistryShell');
        expect(ensureFn).not.toContain("import('@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell')");
    });
});
