import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('execution creation first-paint honesty', () => {
    it('BootShell هيكل هندسي صامت بلا مسرح تحميل', () => {
        const boot = read('src/app/components/lawyer/dashboard/ExecutionCreationBootShell.tsx');
        expect(boot).toContain('execution-creation-boot-slots');
        expect(boot).toContain('aria-hidden');
        expect(boot).toContain('data-testid="execution-creation-close"');
        expect(boot).toContain('ecg.modalClose');
        expect(boot).not.toContain('جاري تجهيز');
        expect(boot).not.toContain('animate-pulse');
        expect(boot).not.toContain('lucide-react');
    });

    it('Portal يستخدم بوابة preloadable ولا يسحب برميل lazyComponents', () => {
        const portal = read('src/app/components/lawyer/dashboard/ExecutionCreationPortal.tsx');
        expect(portal).toContain('PreloadableOverlayGate');
        expect(portal).toContain('LazyExecutionCreationView');
        expect(portal).toContain("from '@/app/runtime/executionCreationViewLazy'");
        expect(portal).toContain('LazyExecutionCreationView.preload');
        expect(portal).not.toContain("from '@/app/utils/lazyComponents'");
        expect(portal).not.toContain('lazyWithRetry');
        expect(portal).not.toContain('useLawyerExecutionOverlayEscape');
    });

    it('المحمّل يسخّن نفس وحدة preloadable التي يرسمها Portal', () => {
        const loader = read('src/app/runtime/executionCreationLoader.ts');
        const lazy = read('src/app/runtime/executionCreationViewLazy.ts');
        expect(loader).toContain("import('@/app/runtime/executionCreationViewLazy')");
        expect(loader).toContain('LazyExecutionCreationView.preload');
        expect(loader).not.toMatch(/from ['"]@\/app\/runtime\/executionCreationViewLazy['"]/);
        expect(lazy).toContain('createPreloadableLazyComponent');
        expect(lazy).toContain('ExecutionCreationView.tsx');
        expect(loader).not.toContain('جاري تجهيز النموذج');
    });

    it('زر الإضبارة الجديدة يسخّن السطح كاملاً لا النموذج وحده', () => {
        const chrome = read('src/app/components/lawyer/ArchivePortal/ExecutionArchiveChrome.tsx');
        expect(chrome).toContain('prefetchExecutionCreationSurface');
        expect(chrome).not.toContain('prefetchExecutionCreationViewModule');
    });

    it('lazyComponents لا يملك نموذجاً ولا تسخيناً لنموذج الإنشاء', () => {
        const barrel = read('src/app/utils/lazyComponents.tsx');
        expect(barrel).not.toContain('ExecutionCreationView');
        expect(barrel).not.toContain('executionCreationViewLazy');
        expect(barrel).not.toContain('prefetchExecutionCreation');
    });

    it('السند والأطراف خلف بوابة preloadable بلا any في الحقيبة', () => {
        const body = read(
            'src/app/components/lawyer/ExecutionCreationView/components/ExecutionCreationFormBody.tsx',
        );
        const vm = read(
            'src/app/components/lawyer/ExecutionCreationView/components/executionCreationFormVm.ts',
        );
        const loader = read('src/app/runtime/executionCreationLoader.ts');
        expect(body).toContain('PreloadableOverlayGate');
        expect(body).toContain('LazyInstrumentDetailsSection');
        expect(body).toContain('LazyPartiesSection');
        expect(body).not.toContain('Record<string, any>');
        expect(body).not.toMatch(/\bany\b/);
        expect(vm).not.toMatch(/\bany\b/);
        expect(loader).toContain('instrumentDetailsSectionLazy');
        expect(loader).toContain('partiesSectionLazy');
        expect(body).not.toContain('جاري تجهيز');
    });
});
