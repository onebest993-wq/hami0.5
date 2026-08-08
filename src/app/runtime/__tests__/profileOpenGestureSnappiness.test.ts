import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('profile open gesture snappiness', () => {
    it('يفتح الملف قبل إغلاق overlays المتنافسة', () => {
        const orch = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
            'utf8',
        );
        const block = orch.slice(
            orch.indexOf('const openProfileTab = useCallback'),
            orch.indexOf('const closeHubShellOverlays'),
        );
        expect(block.indexOf('openProfileTabInnerRef.current()')).toBeLessThan(
            block.indexOf('closeOverlaysBeforeProfileOpen'),
        );
        expect(block).toContain('queueMicrotask');
    });

    it('يكشف الملف عبر DOM ثم مزامنة React فورية', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab.ts'),
            'utf8',
        );
        expect(hook).toContain('concealProfileWarmShell');
        expect(hook).toContain('commitProfileOpen');
        expect(hook).toContain('flushSync');

        const openFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/profile/profileShellOpenFlow.ts'),
            'utf8',
        );
        expect(openFlow).toContain('revealProfileWarmShell');
        expect(openFlow).toContain('flushSync');
        expect(openFlow).toContain('loadProfileHubModule');
        expect(openFlow).toContain('deferProfileOpenWarmWork');
        expect(openFlow).toContain('runProfileOpenSideEffects');
        const commitBlock = openFlow.slice(openFlow.indexOf('export function commitProfileOpen'));
        expect(commitBlock).not.toContain('scheduleProfileShellReactSync');

        const closeBlock = hook.slice(
            hook.indexOf('const closeProfileTab = useCallback'),
            hook.indexOf('useEffect(() => {\n        if (isRealSignedIn(userId))'),
        );
        expect(closeBlock).toContain('commitProfileClose');

        const closeFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/profile/profileShellCloseFlow.ts'),
            'utf8',
        );
        expect(closeFlow).toContain('concealProfileWarmShell');
        expect(closeFlow).toContain('conceal:');
    });

    it('ضغط الهيدر لا يستدعي warmProfileOnOpen قبل الفتح', () => {
        const prefetch = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/lawyerDashboardHeaderPrefetch.ts'),
            'utf8',
        );
        const press = prefetch.slice(
            prefetch.indexOf('const prefetchProfilePress'),
            prefetch.indexOf('const prefetchSearchHover'),
        );
        expect(press).not.toMatch(/warmProfileOnOpen\s*\(/);
        expect(press).not.toMatch(/loadRoyalLawyerProfileModule\s*\(/);
        expect(press).toContain('loadProfileHubModule');
        expect(press).toContain('primeProfileTabMount');
    });

    it('زر الرجوع أصلي بلا motion.button', () => {
        const back = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileBackBar.tsx',
            ),
            'utf8',
        );
        expect(back).not.toContain("from 'motion/react'");
        expect(back).not.toContain('motion.button');
        expect(back).toContain('data-testid="lawyer-profile-back"');
        expect(back).toContain('min-h-[44px]');
    });
});
