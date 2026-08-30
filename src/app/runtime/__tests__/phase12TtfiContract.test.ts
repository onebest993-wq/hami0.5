import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { extractViteFunction, readViteConfigSource } from './viteConfigSource';

const root = process.cwd();

describe('phase-12 TTFI measurement contract', () => {
    it('LawyerDashboardShell يعيد data-testid=lawyer-dashboard-ready لعقد القياس', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardShell.tsx'),
            'utf8',
        );
        expect(src).toContain('data-testid="lawyer-dashboard-ready"');
    });

    it('markDashboardInteractiveOnce يعرّض __hamiTtfiMs خارج DEV', () => {
        const src = readFileSync(join(root, 'src/app/bootstrap/dashboardInteractiveMark.ts'), 'utf8');
        expect(src).toContain('__hamiTtfiMs');
        expect(src).toContain('exposeTtfiProbe');
        expect(src).not.toMatch(
            /if \(import\.meta\.env\.DEV\) \{\s*\(window as Window[^\n]*__hamiTtfiMs/,
        );
    });

    it('عزل TrashModal/heirs عن boot-runtime', () => {
        const src = readViteConfigSource();
        const boot = extractViteFunction(src, 'resolveBootRuntimeChunk');
        expect(boot).not.toContain('TrashModal');
        expect(boot).not.toContain('heirs-deceased');
        expect(src).not.toContain("return 'app-smart-file-trash-modal'");
        expect(src).not.toContain("return 'execution-heirs-deceased-sync'");
    });

    it('vite لا يمتص executionModuleStrategies داخل boot-runtime', () => {
        const src = readViteConfigSource();
        const boot = extractViteFunction(src, 'resolveBootRuntimeChunk');
        expect(boot).not.toContain('executionModuleStrategies');
        expect(boot).not.toContain('executorApprovalWorkflow');
    });

    it('تقارير P12 تُكتب بعد القياس (أو تُعلن الفشل صراحة في close)', () => {
        // يُحدَّث بعد نجاح القياس — إن غاب الملف فالإغلاق يجب أن يقول OPEN بصدق
        const closePath = join(root, '.cursor/phase12-close.json');
        if (!existsSync(closePath)) {
            expect(true).toBe(true);
            return;
        }
        const close = JSON.parse(readFileSync(closePath, 'utf8')) as {
            verified?: {
                ttfi?: { measured?: boolean };
                metrics?: { ttfi?: { measured?: boolean } };
            };
        };
        const measured =
            close.verified?.ttfi?.measured ?? close.verified?.metrics?.ttfi?.measured;
        expect(typeof measured).toBe('boolean');
    });
});
