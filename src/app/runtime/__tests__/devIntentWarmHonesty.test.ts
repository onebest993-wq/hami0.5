import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('dev intent warm honesty — سبب تعطيل التسخين في التطوير', () => {
    it('PrefetchScheduler لا يُطفأ بـ DEV؛ lite/شبكة تبقى', () => {
        const src = read('src/app/runtime/prefetchScheduler.ts');
        expect(src).not.toContain('devPrefetchDisabled');
        expect(src).not.toContain('import.meta.env.DEV');
        expect(src).toContain('prefetchOnIntent');
        expect(src).toContain('isLitePerformanceActive');
        expect(src).toContain('isMeteredOrSlowNetwork');
        expect(src).toContain('localOnlyMode');
    });

    it('نية الدوك لا تمر عبر PrefetchScheduler — تعمل في DEV', () => {
        const gate = read('src/app/hooks/lawyerDashboard/dockShellPrefetchGate.ts');
        expect(gate).not.toContain('import.meta.env.DEV');
        expect(gate).toContain('prefetchDockWidgetIntent');
        const intent = read('src/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch.ts');
        expect(intent).not.toContain('import.meta.env.DEV');
        expect(intent).not.toContain('PrefetchScheduler');
    });

    it('تسخين اللوحة بعد الدخول يعمل في التطوير', () => {
        const loader = read('src/app/runtime/lawyerDashboardLoader.ts');
        expect(loader).toContain('prefetchLawyerDashboardEntry');
        const fn = loader.slice(loader.indexOf('export function prefetchLawyerDashboardEntry'));
        expect(fn).not.toContain('import.meta.env.DEV');
        const auth = read('src/app/context/authProviderRuntime.ts');
        expect(auth).not.toContain("params.role === 'lawyer' && !import.meta.env.DEV");
        expect(auth).toContain("if (params.role === 'lawyer')");
        expect(auth).toContain('prefetchLawyerDashboardIfPhoneProduct');
    });
});
