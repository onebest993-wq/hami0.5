/**
 * Phase-5 Capacitor / Lite structural guards — no device proof claimed.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = process.cwd();

describe('phase-5 capacitor inventory', () => {
    it('tracks capacitor.config.ts and native-ready snippets', () => {
        expect(fs.existsSync(path.join(root, 'capacitor.config.ts'))).toBe(true);
        const cap = fs.readFileSync(path.join(root, 'capacitor.config.ts'), 'utf8');
        expect(cap).toContain('PrivacyScreen');
        expect(fs.existsSync(path.join(root, 'scripts/verify-android-native.mjs'))).toBe(true);
        expect(fs.existsSync(path.join(root, 'package.json'))).toBe(true);
        const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
            scripts: Record<string, string>;
        };
        expect(pkg.scripts['verify:native:android']).toBeTruthy();
    });

    it('documents android/ios as local-only when gitignored', () => {
        const gi = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
        const androidIgnored = /(?:^|\n)android\/?(?:\n|$)/.test(gi) || gi.includes('android/');
        const iosIgnored = /(?:^|\n)ios\/?(?:\n|$)/.test(gi) || gi.includes('ios/');
        expect(androidIgnored || iosIgnored).toBe(true);
        // لا نفشل CI عند غياب المجلدات — فقط نوثّق في الأثر
        const progress = JSON.parse(
            fs.readFileSync(path.join(root, '.cursor/phase-5-progress.json'), 'utf8'),
        ) as { deviceProven: boolean };
        const deviceRuntime = JSON.parse(
            fs.readFileSync(path.join(root, '.cursor/world-class-w5-device-runtime.json'), 'utf8'),
        ) as { deviceProven: boolean };
        expect(progress.deviceProven).toBe(deviceRuntime.deviceProven);
    });
});

describe('phase-5 Lite intent warm gates', () => {
    beforeEach(() => {
        document.documentElement.dataset.hamiLite = '1';
    });
    afterEach(() => {
        document.documentElement.removeAttribute('data-hami-lite');
        vi.resetModules();
    });

    it('warmForumOnHover no-ops under Lite', async () => {
        const prefetch = vi.fn();
        vi.doMock('@/app/runtime/communityHubLoader', () => ({
            prefetchCommunityScreenModule: prefetch,
        }));
        vi.doMock('@/app/components/lawyer/CommunityScreen', () => ({
            prefetchCommunityScreenContent: vi.fn(),
        }));
        vi.doMock('@/app/services/forum/forumPostsWarmCache', () => ({
            warmForumPostsCache: vi.fn(),
        }));
        vi.doMock('@/app/services/forum/forumSocialWarmCache', () => ({
            warmForumSocialCache: vi.fn(),
        }));
        vi.doMock('@/app/services/forum/forumNotificationsWarmCache', () => ({
            warmForumNotificationsCache: vi.fn(),
        }));
        vi.doMock('@/app/runtime/communityBootHydrator', () => ({
            hydrateCommunityShellForInstantOpen: vi.fn(),
        }));
        const { warmForumOnHover } = await import('@/app/hooks/lawyerDashboard/forumIntentWarm');
        warmForumOnHover('u1');
        expect(prefetch).not.toHaveBeenCalled();
    });

    it('warmNotificationsOnHover no-ops under Lite', async () => {
        const prefetch = vi.fn();
        vi.doMock('@/app/runtime/notificationPanelLoader', () => ({
            prefetchNotificationPanel: prefetch,
            loadNotificationPanelModule: vi.fn(),
        }));
        const { warmNotificationsOnHover } = await import(
            '@/app/hooks/lawyerDashboard/notificationIntentWarm'
        );
        warmNotificationsOnHover();
        expect(prefetch).not.toHaveBeenCalled();
    });
});
