import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function src(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('biggest bottleneck honesty — home / dossiers / execution', () => {
    it('HomeTab لا يستورد أضابير التنفيذ/الجزائي/الملف الذكي استيراداً ثابتاً', () => {
        const files = [
            'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx',
            'src/app/components/lawyer/dashboard/HomeTabContent.tsx',
            'src/app/components/lawyer/dashboard/useHomeTabContentModel.ts',
            'src/app/components/lawyer/dashboard/HomeMainGridFirstPaint.tsx',
            'src/app/runtime/homeTabContentLoader.ts',
        ];
        for (const rel of files) {
            const text = src(rel);
            expect(text).not.toContain('ExecutionDashboard');
            expect(text).not.toContain('criminal-system');
            expect(text).not.toContain('smart-modal');
            expect(text).not.toContain('FinancialOperationsCenter');
            expect(text).not.toMatch(/from\s+['"][^'"]*homeHubSparkInsight/);
        }
    });

    it('CSS الحرج يبقى لأول رسم + قفل الطبقات؛ بلا دخول شبكة تزييني', () => {
        const css = src('src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css');
        const motion = src('src/app/components/lawyer/dashboard/lawyerHomeFx-overlayMotion.css');
        const deferred = src('src/app/components/lawyer/dashboard/lawyerHomeFx.css');
        const shell = src('src/styles/critical-shell.css');
        expect(shell).toContain('lawyerHomeFx-critical.css');
        expect(css).toContain('.hami-home-scroll-root');
        expect(css).toContain("[data-testid='home-main-grid']");
        expect(css).toContain("html[data-hami-settings-open='1']");
        expect(css).toContain("html[data-hami-forum-open='1']");
        expect(css).not.toContain('hami-home-slot-enter');
        expect(motion).not.toContain('hami-home-slot-enter');
        expect(deferred).toContain('lawyerHomeFx-overlayMotion.css');
        expect(css.length).toBeGreaterThan(40_000);
    });

    it('إقلاع التنفيذ لا يسحب CSS الأضابير؛ الفتح يسحب ورقة التنفيذ فقط', () => {
        const hydrator = src('src/app/runtime/executionBootHydrator.ts');
        const loader = src('src/app/runtime/executionDashboardLoader.ts');
        const portal = src('src/app/components/lawyer/dashboard/ExecutionDashboardPortal.tsx');
        expect(hydrator).toContain('includeFeatureStyles: false');
        expect(loader).toContain('prefetchDeferredExecutionDossierStyles');
        expect(loader).not.toMatch(/(?<!Dossier)prefetchDeferredFeatureStyles/);
        expect(portal).toContain('ensureDeferredExecutionDossierStylesLoaded');
        const chromeWarm = loader.match(
            /export function prefetchExecutionDashboardChromeWarm\(\): void \{[\s\S]*?\n\}/,
        )?.[0];
        expect(chromeWarm).toBeTruthy();
        expect(chromeWarm).not.toContain('FeatureStyles');
    });

    it('ملفات التوافق المدمجة لا تُستورد من runtime', () => {
        const runtime = src('src/app/runtime/deferredFeatureStyles.ts');
        expect(runtime).not.toContain('deferred-features.css');
        expect(runtime).not.toContain('tailwind-features.css');
        expect(runtime).toContain('deferred-features-workspace.css');
        expect(runtime).toContain('deferred-features-dossiers-execution.css');
        expect(runtime).toContain('deferred-features-dossiers-criminal.css');
        expect(runtime).toContain('deferred-features-dossiers-smart.css');
        expect(runtime).toContain('deferred-features-admin.css');
    });
});
