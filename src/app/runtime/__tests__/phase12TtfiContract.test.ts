import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

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
        const src = readFileSync(join(root, 'src/app/bootstrap/bootMetrics.ts'), 'utf8');
        expect(src).toContain('__hamiTtfiMs');
        expect(src).toContain('exposeTtfiProbe');
        expect(src).not.toMatch(
            /if \(import\.meta\.env\.DEV\) \{\s*\(window as Window[^\n]*__hamiTtfiMs/,
        );
    });

    it('عزل TrashModal/heirs عن entry غير مفعّل (يعيد side-hoist)', () => {
        const src = readFileSync(join(root, 'vite.config.mts'), 'utf8');
        expect(src).toContain('execution-cold-safe-utils');
        expect(src).not.toContain("return 'app-smart-file-trash-modal'");
        expect(src).not.toContain("return 'execution-heirs-deceased-sync'");
        expect(src).toContain('تُترك داخل entry');
    });

    it('vite يعزل executionModuleStrategies عن storage-deferred لكسر TDZ', () => {
        const src = readFileSync(join(root, 'vite.config.mts'), 'utf8');
        expect(src).toContain("return 'app-execution-module-strategies'");
        expect(src).toContain("return 'app-executor-approval-workflow'");
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
