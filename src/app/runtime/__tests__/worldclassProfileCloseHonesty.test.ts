import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('world-class profile close honesty', () => {
    it('P5: profileHostMounted يبدأ من profileInitiallyOpen لا true على cold', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab.ts'),
            'utf8',
        );
        expect(hook).toMatch(
            /profileHostMounted,\s*setProfileHostMounted\]\s*=\s*useState\(\(\)\s*=>\s*profileInitiallyOpen\)/,
        );
        expect(hook).not.toMatch(/setProfileHostMounted\]\s*=\s*useState\(true\)/);
    });

    it('P2: يمسح host ويغلق التبويب عند غياب جلسة محلية', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab.ts'),
            'utf8',
        );
        expect(hook).toMatch(/hasLocalAppSession\(userId\)/);
        expect(hook).toMatch(/setProfileHostMounted\(false\)/);
        expect(hook).toMatch(/tab === 'profile' \? 'home'/);
    });

    it('P9: marks الفتح متزامنة (لا سباق clear/mark عبر dynamic import فقط)', () => {
        const openFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/profile/profileShellOpenFlow.ts'),
            'utf8',
        );
        expect(openFlow).toMatch(/clearProfilePerfMarks\(\)/);
        expect(openFlow).toMatch(/markProfilePerfPhase\('open-request'\)/);
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab.ts'),
            'utf8',
        );
        expect(hook).toContain('commitProfileOpen');
        expect(hook).not.toMatch(
            /loadProfilePerfMetrics\(\)\.then\(\(m\)\s*=>\s*m\.clearProfilePerfMarks/,
        );
    });

    it('P7/P10: Cap native back مربوط في useProfileScreenEscape', () => {
        const escape = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileScreenEscape.ts',
            ),
            'utf8',
        );
        expect(escape).toContain('registerNativeBackHandler');
    });

    it('P1: interactive احتياطي في useProfileLifecycle', () => {
        const life = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileLifecycle.ts',
            ),
            'utf8',
        );
        expect(life).toMatch(/setTimeout\(markInteractiveFallback,\s*1_?200\)/);
    });

    it('P3: بعد الإقلاع prefetch فقط — Host يُركَّب عند prime/hover لا على boot-reveal', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab.ts'),
            'utf8',
        );
        const warmBlock = hook.match(/const scheduleWarm = \(\) => \{[\s\S]*?\n        \};/)?.[0];
        expect(warmBlock).toBeTruthy();
        expect(warmBlock).toContain('prefetchProfileAfterBootReveal');
        expect(warmBlock).not.toMatch(/\barmProfileHost\s*\(/);
        expect(hook).toContain('PROFILE_LIVE_SHELL_READY_EVENT');
        expect(hook).toMatch(/onDashboardInteractive\([\s\S]*armProfileHost\(\)/);
        const signedInWarm = hook.match(
            /جلسة محلية: تسخين[\s\S]*?useLayoutEffect\(\(\) => \{[\s\S]*?\}, \[userId\]\);/,
        )?.[0];
        expect(signedInWarm).toBeTruthy();
        expect(signedInWarm).not.toMatch(/\barmProfileHost\s*\(/);
        expect(hook).toContain("addEventListener('pageshow'");
    });

    it('P4: sanitizeProfileMediaUrl على الهيدر والصورة', () => {
        const headerHook = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerProfileHeader.ts'),
            'utf8',
        );
        expect(headerHook).toContain('sanitizeProfileMediaUrl');
        const avatar = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileAvatarImage.tsx',
            ),
            'utf8',
        );
        expect(avatar).toContain('sanitizeProfileMediaUrl');
    });

    it('معاينة الخصوصية تُزامَن أثناء الاستوديو دون كتل النص', () => {
        const hook = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileDisplayCustomization.ts',
            ),
            'utf8',
        );
        expect(hook).toContain('privacyChanged');
        expect(hook).toContain('privacy: nextDraft.privacy');
    });

    it('ProfileDB يطبّق scopeProfileForViewer للزائر', () => {
        const cloud = fs.readFileSync(
            path.join(root, 'src/app/services/cloud/lawyerProfileCloud.ts'),
            'utf8',
        );
        expect(cloud).toContain('scopeProfileForViewer');
        expect(cloud).toContain('redactProfileForVisitorView');
    });
});
