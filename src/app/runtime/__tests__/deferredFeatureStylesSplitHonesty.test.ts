import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('deferred feature styles split honesty', () => {
    it('يفصل مساحة العمل عن أوراق الأضابير المجال في الملفات والمُحمّل', () => {
        const runtime = fs.readFileSync(
            path.join(root, 'src/app/runtime/deferredFeatureStyles.ts'),
            'utf8',
        );
        expect(runtime).toContain("import('@/styles/deferred-features-workspace.css')");
        expect(runtime).toContain("import('@/styles/deferred-features-dossiers-execution.css')");
        expect(runtime).toContain("import('@/styles/deferred-features-dossiers-criminal.css')");
        expect(runtime).toContain("import('@/styles/deferred-features-dossiers-smart.css')");
        expect(runtime).toContain("import('@/styles/deferred-features-admin.css')");
        expect(runtime).toContain('ensureDeferredWorkspaceFeatureStylesLoaded');
        expect(runtime).toContain('ensureDeferredExecutionDossierStylesLoaded');
        expect(runtime).toContain('ensureDeferredCriminalDossierStylesLoaded');
        expect(runtime).toContain('ensureDeferredSmartDossierStylesLoaded');
        expect(runtime).toContain('ensureDeferredDossierFeatureStylesLoaded');
        expect(runtime).toContain('ensureDeferredAdminFeatureStylesLoaded');
        expect(runtime).toMatch(
            /export function ensureDeferredFeatureStylesLoaded[\s\S]*ensureDeferredWorkspaceFeatureStylesLoaded/,
        );
        expect(runtime).toMatch(
            /export function scheduleDeferredFeatureStyles\(\): void \{[\s\S]*?ensureDeferredWorkspaceFeatureStylesLoaded\(\);[\s\S]*?\n\}/,
        );
        const scheduleFn = runtime.match(
            /export function scheduleDeferredFeatureStyles\(\): void \{[\s\S]*?\n\}/,
        )?.[0];
        expect(scheduleFn).toBeTruthy();
        expect(scheduleFn).not.toContain('ensureDeferredDossierFeatureStylesLoaded');
        expect(scheduleFn).not.toContain('deferred-features-dossiers');

        const workspace = fs.readFileSync(
            path.join(root, 'src/styles/deferred-features-workspace.css'),
            'utf8',
        );
        expect(workspace).toContain('tailwind-features-workspace.css');
        expect(workspace).toContain('radarTheme.css');
        expect(workspace).not.toContain('ExecutionDashboard');

        const dossiersAgg = fs.readFileSync(
            path.join(root, 'src/styles/deferred-features-dossiers.css'),
            'utf8',
        );
        expect(dossiersAgg).toContain('deferred-features-dossiers-execution.css');
        expect(dossiersAgg).toContain('deferred-features-dossiers-criminal.css');
        expect(dossiersAgg).toContain('deferred-features-dossiers-smart.css');

        const executionTw = fs.readFileSync(
            path.join(root, 'src/styles/tailwind-features-dossiers-execution.css'),
            'utf8',
        );
        expect(executionTw).toContain('ExecutionDashboard');
        expect(executionTw).not.toContain('criminal-system');
        expect(executionTw).not.toContain('SmartFileModal');
        expect(executionTw).toContain('@source not');

        const criminalTw = fs.readFileSync(
            path.join(root, 'src/styles/tailwind-features-dossiers-criminal.css'),
            'utf8',
        );
        expect(criminalTw).toContain('criminal-system');
        expect(criminalTw).not.toContain('ExecutionDashboard');
        expect(criminalTw).not.toContain('SmartFileModal');

        const smartTw = fs.readFileSync(
            path.join(root, 'src/styles/tailwind-features-dossiers-smart.css'),
            'utf8',
        );
        expect(smartTw).toContain('SmartFileModal');
        expect(smartTw).toContain('Form_Urgent_Actions');
        expect(smartTw).not.toContain('ExecutionDashboard');
        expect(smartTw).not.toContain('criminal-system');

        const adminTw = fs.readFileSync(
            path.join(root, 'src/styles/tailwind-features-admin.css'),
            'utf8',
        );
        expect(adminTw).toContain('AdminDashboard');
        expect(adminTw).toContain('admin/**');
        expect(adminTw).not.toContain('ExecutionDashboard');

        const workspaceTw = fs.readFileSync(
            path.join(root, 'src/styles/tailwind-features-workspace.css'),
            'utf8',
        );
        expect(workspaceTw).toContain('CommunityScreen');
        expect(workspaceTw).not.toContain('ExecutionDashboard');
        expect(workspaceTw).not.toContain('criminal-system');
        expect(workspaceTw).toContain('@source not');
    });

    it('مسارات الأضابير تسحب ورقة المجال عند التحميل', () => {
        const criminal = fs.readFileSync(
            path.join(root, 'src/app/runtime/criminalDashboardLoader.ts'),
            'utf8',
        );
        expect(criminal).toContain('ensureDeferredCriminalDossierStylesLoaded');
        expect(criminal).not.toContain('ensureDeferredDossierFeatureStylesLoaded');

        const smartFile = fs.readFileSync(
            path.join(root, 'src/app/runtime/smartFileModalLoader.ts'),
            'utf8',
        );
        expect(smartFile).toContain('ensureDeferredSmartDossierStylesLoaded');
        expect(smartFile).not.toContain('ensureDeferredDossierFeatureStylesLoaded');

        const execution = fs.readFileSync(
            path.join(root, 'src/app/runtime/executionDashboardLoader.ts'),
            'utf8',
        );
        expect(execution).toContain('prefetchDeferredExecutionDossierStyles');
        expect(execution).not.toMatch(/(?<!Dossier)prefetchDeferredFeatureStyles/);
        expect(execution).not.toContain('prefetchDeferredDossierFeatureStyles');
        const chromeWarm = execution.match(
            /export function prefetchExecutionDashboardChromeWarm\(\): void \{[\s\S]*?\n\}/,
        )?.[0];
        expect(chromeWarm).toBeTruthy();
        expect(chromeWarm).not.toContain('FeatureStyles');
        expect(chromeWarm).not.toContain('deferred-features');

        const hydrator = fs.readFileSync(
            path.join(root, 'src/app/runtime/executionBootHydrator.ts'),
            'utf8',
        );
        expect(hydrator).toContain('includeFeatureStyles: false');

        const urgent = fs.readFileSync(
            path.join(root, 'src/app/runtime/urgentOrdersViewLoader.ts'),
            'utf8',
        );
        expect(urgent).not.toContain('ensureDeferredDossierFeatureStylesLoaded');
        expect(urgent).not.toContain('ensureDeferredSmartDossierStylesLoaded');

        const aof = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/DeferredActiveOrderFile.tsx'),
            'utf8',
        );
        expect(aof).toContain('ensureDeferredSmartDossierStylesLoaded');

        const portal = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/ExecutionDashboardPortal.tsx'),
            'utf8',
        );
        expect(portal).toContain('ensureDeferredExecutionDossierStylesLoaded');

        const adminDash = fs.readFileSync(
            path.join(root, 'src/app/components/AdminDashboard.tsx'),
            'utf8',
        );
        expect(adminDash).toContain('deferred-features-admin.css');
        expect(adminDash).toContain('admin-hq-shell.css');
        expect(adminDash).toContain('AdminDashboard');

        const hqShell = fs.readFileSync(path.join(root, 'src/app/HqRuntimeShell.tsx'), 'utf8');
        expect(hqShell).toContain("import('@/app/surface/inner')");
        expect(hqShell).not.toContain('ensureDeferredAdminFeatureStylesLoaded');
        expect(hqShell).not.toContain('ensureDeferredDossierFeatureStylesLoaded');

        const lawyerShell = fs.readFileSync(path.join(root, 'src/app/AppRuntimeShell.tsx'), 'utf8');
        expect(lawyerShell).not.toContain('AdminDashboard');
        expect(lawyerShell).not.toContain('ensureDeferredAdminFeatureStylesLoaded');
        expect(lawyerShell).not.toContain('ensureDeferredDossierFeatureStylesLoaded');
    });
});
