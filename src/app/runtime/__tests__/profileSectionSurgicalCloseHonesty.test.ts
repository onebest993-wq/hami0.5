import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('profile section surgical close honesty', () => {
    it('assemble يمرّر profileHostMounted من useLawyerDashboardProfileTab', () => {
        const assemble = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/assembleLawyerDashboardReadyView.ts'),
            'utf8',
        );
        expect(assemble).toContain('profileHostMounted: profileTab.profileHostMounted');
    });

    it('بعد الإقلاع: prefetch فقط — Host يُركَّب عند prime/hover لا على boot-reveal', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab.ts'),
            'utf8',
        );
        expect(hook).toContain('prefetchProfileAfterBootReveal');
        const warmBlock = hook.match(
            /const scheduleWarm = \(\) => \{[\s\S]*?\n        \};/,
        )?.[0];
        expect(warmBlock).toBeTruthy();
        expect(warmBlock).toContain('prefetchProfileAfterBootReveal');
        expect(warmBlock).not.toMatch(/\barmProfileHost\s*\(/);
    });

    it('هيدر الملف يمرّر sanitizeProfileMediaUrl قبل عرض الصورة', () => {
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
        expect(avatar).toContain('safeSrc');
    });

    it('مسارات الملف لا ترسل أحداث تصحيح إلى 127.0.0.1:7777', () => {
        const files = [
            'src/app/services/cloud/lawyerProfileCloud.ts',
            'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileLoader.ts',
            'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileEditSession.ts',
        ];
        for (const rel of files) {
            const src = fs.readFileSync(path.join(root, rel), 'utf8');
            expect(src, rel).not.toContain('127.0.0.1:7777');
        }
    });

    it('تنقّل الملف يستخدم isRealSignedIn(userId) لا null', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab.ts'),
            'utf8',
        );
        expect(hook).toContain('isRealSignedIn(userId)');
        expect(hook).not.toContain('isRealSignedIn(null)');
        expect(hook).toContain('commitProfileClose({ closeSettings, setActiveTab })');
    });

    it('زر الهيدر يعلن aria-expanded وaria-controls', () => {
        const trigger = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerDashboardParts/components/HeaderProfileTrigger.tsx',
            ),
            'utf8',
        );
        expect(trigger).toContain('header-profile-trigger');
        expect(trigger).toContain('aria-expanded={expanded}');
        expect(trigger).toContain('aria-controls="lawyer-dashboard-profile-surface"');
        expect(trigger).toContain('pointerCommitRef');
    });

    it('لا يضاعف prime على hover/press — prefetch يملك التسليح', () => {
        const bundle = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/buildLawyerDashboardTabBundle.ts'),
            'utf8',
        );
        expect(bundle).toContain('onProfilePointerEnter: headerPrefetch.onProfilePointerEnter');
        expect(bundle).toContain('onProfilePointerDown: headerPrefetch.onProfilePointerDown');
        expect(bundle).not.toMatch(
            /onProfilePointerEnter:\s*\(\)\s*=>\s*\{[\s\S]*?primeProfileTabMount/,
        );
    });
});
