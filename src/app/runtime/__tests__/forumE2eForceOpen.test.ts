import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    armForumE2eForceOpenStub,
    bindForumE2eForceOpenLive,
    type ForumE2eForceOpenWindow,
} from '@/app/runtime/forumE2eForceOpen';
import { createPreDockFeatureStubs } from '@/app/components/lawyer/dashboard/createPreDockFeatureStubs';

function e2eWin(): ForumE2eForceOpenWindow {
    return window as ForumE2eForceOpenWindow;
}

describe('forumE2eForceOpen', () => {
    afterEach(() => {
        const w = e2eWin();
        delete w.__hamiE2eForceOpenCommunity;
        delete w.__hamiE2eForceOpenCommunityStub;
    });

    it('يسلّح stub وforce-open معاً', () => {
        const open = vi.fn();
        armForumE2eForceOpenStub(open);
        expect(typeof e2eWin().__hamiE2eForceOpenCommunity).toBe('function');
        expect(e2eWin().__hamiE2eForceOpenCommunityStub).toBe(open);
        e2eWin().__hamiE2eForceOpenCommunity?.();
        expect(open).toHaveBeenCalledTimes(1);
    });

    it('بعد cleanup الحي يعيد stub لا يحذف الخطاف', () => {
        const stubOpen = vi.fn();
        const liveOpen = vi.fn();
        armForumE2eForceOpenStub(stubOpen);
        const unbind = bindForumE2eForceOpenLive(liveOpen);
        e2eWin().__hamiE2eForceOpenCommunity?.();
        expect(liveOpen).toHaveBeenCalledTimes(1);
        unbind();
        e2eWin().__hamiE2eForceOpenCommunity?.();
        expect(stubOpen).toHaveBeenCalledTimes(1);
        expect(liveOpen).toHaveBeenCalledTimes(1);
    });

    it('createPreDockFeatureStubs يسلّح الخطاف ويستدعي requestArm', () => {
        const requestArm = vi.fn();
        createPreDockFeatureStubs(requestArm);
        expect(typeof e2eWin().__hamiE2eForceOpenCommunity).toBe('function');
        e2eWin().__hamiE2eForceOpenCommunity?.();
        expect(requestArm).toHaveBeenCalledWith('community');
    });
});

describe('صدق تسليح E2E للجلسة', () => {
    it('AuthContext لا يعيد تطبيق mock إلا مع VITE_E2E', () => {
        const src = readFileSync(
            resolve(process.cwd(), 'src/app/context/AuthContext.tsx'),
            'utf8',
        );
        expect(src).toContain("import.meta.env.VITE_E2E !== '1'");
        expect(src).toContain('__hamiE2eApplyDevMockAuth');
        expect(src).toContain('restoreDevMockIfPresent');
    });
});
