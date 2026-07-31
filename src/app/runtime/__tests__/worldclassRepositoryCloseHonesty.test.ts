import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('world-class repository close honesty', () => {
    it('R5: repositoryHostMounted يبدأ false على cold', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardRepository.ts'),
            'utf8',
        );
        expect(hook).toMatch(
            /repositoryHostMounted,\s*setRepositoryHostMounted\]\s*=\s*useState\(false\)/,
        );
    });

    it('R2: يمسح host ويغلق عند غياب هوية حقيقية', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardRepository.ts'),
            'utf8',
        );
        expect(hook).toMatch(/isRealSignedIn\(userId\)/);
        expect(hook).toMatch(/setRepositoryHostMounted\(false\)/);
        expect(hook).toMatch(/setIsRepositoryOpen\(false\)/);
        const authEffect = hook.match(
            /\/\*\* جلسة مستودع مفتوحة بلا هوية[\s\S]*?\}, \[userId\]\);/,
        )?.[0];
        expect(authEffect).toBeTruthy();
        expect(authEffect).toContain('setRepositoryHostMounted(false)');
        expect(authEffect).toContain('setIsRepositoryOpen(false)');
        expect(authEffect).not.toContain('flushSync');
    });

    it('R9: marks الفتح متزامنة (لا سباق clear/mark عبر dynamic import فقط)', () => {
        const openFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow.ts'),
            'utf8',
        );
        expect(openFlow).toMatch(/clearRepositoryPerfMarks\(\)/);
        expect(openFlow).toMatch(/markRepositoryPerfPhase\('open-request'\)/);
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardRepository.ts'),
            'utf8',
        );
        expect(hook).not.toMatch(
            /loadRepositoryPerfMetrics\(\)\.then\(\(m\)\s*=>\s*m\.clearRepositoryPerfMarks/,
        );
    });

    it('R7/R10: Cap native back مربوط في useRepositoryEscapeStack', () => {
        const escape = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/SmartRepository/hooks/useRepositoryEscapeStack.ts',
            ),
            'utf8',
        );
        expect(escape).toContain('registerNativeBackHandler');
        expect(escape).toContain('consumeBackStack');
    });

    it('R1: interactive احتياطي في useRepositoryLifecycle', () => {
        const life = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/SmartRepository/hooks/useRepositoryLifecycle.ts',
            ),
            'utf8',
        );
        expect(life).toMatch(/setTimeout\(markInteractiveFallback,\s*1_?200\)/);
    });

    it('R3: بعد الإقلاع تسخين فقط بلا armRepositoryHost داخل scheduleWarm', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardRepository.ts'),
            'utf8',
        );
        const warmBlock = hook.match(/const scheduleWarm = \(\) => \{[\s\S]*?\n        \};/)?.[0];
        expect(warmBlock).toBeTruthy();
        expect(warmBlock).toContain('prefetchRepositoryAfterBootReveal');
        expect(warmBlock).not.toContain('armRepositoryHost');
    });

    it('R8: InstantShell داخل Host فقط؛ Entry sync بلا Suspense مزدوج', () => {
        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/SmartRepository/SmartRepositoryHost.tsx'),
            'utf8',
        );
        expect(host).toContain('RepositoryInstantShell');
        const entry = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardRepositoryOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(entry).toContain('SmartRepositoryHost');
        expect(entry).not.toContain('RepositoryInstantShell');
        expect(entry).not.toMatch(/<Suspense\b/);
    });

    it('R4: طبقات Escape متدرجة في useRepositoryEscapeStack', () => {
        const escape = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/SmartRepository/hooks/useRepositoryEscapeStack.ts',
            ),
            'utf8',
        );
        expect(escape).toContain('pendingUploadOpen');
        expect(escape).toContain('fileViewerOpen');
        expect(escape).toContain('scannerOpen');
        expect(escape).toContain('composing');
        expect(escape).toContain('onCloseModal');
    });

    it('فلتر الغرف موصول في useRepositoryFeed (لا dead roomFilter)', () => {
        const feed = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/SmartRepository/hooks/useRepositoryFeed.ts',
            ),
            'utf8',
        );
        expect(feed).toContain('filterRepositoryFeedByRoom');
        expect(feed).toContain('roomScopedFeed');
        expect(feed).toMatch(/roomFilter\s*=\s*'main'/);
    });
});
