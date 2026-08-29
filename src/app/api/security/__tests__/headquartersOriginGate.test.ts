import { afterEach, describe, expect, it } from 'vitest';
import {
    isHeadquartersHostAllowed,
    isHeadquartersOnlyApiPath,
    isLawyerRuntimeClient,
    rejectHeadquartersPublicSurface,
} from '../headquartersOriginGate.ts';

const ANDROID_WV =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36';
const IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const DESKTOP_CHROME =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function req(url: string, headers: Record<string, string> = {}): Request {
    return new Request(url, { method: 'GET', headers });
}

describe('headquartersOriginGate', () => {
    afterEach(() => {
        delete process.env.HAMI_HQ_HOSTS;
        delete process.env.HAMI_HQ_ALLOW_THIS_DEPLOYMENT;
        delete process.env.VERCEL_ENV;
        delete process.env.VERCEL_URL;
    });

    it('مسارات المقر فقط — لا التوثيق الذاتي ولا قائمة القوانين ولا المنتدى العام', () => {
        expect(isHeadquartersOnlyApiPath('/api/admin')).toBe(true);
        expect(isHeadquartersOnlyApiPath('/api/admin/users')).toBe(true);
        expect(isHeadquartersOnlyApiPath('/api/admin/otp/request')).toBe(true);
        expect(isHeadquartersOnlyApiPath('/api/forum/ban')).toBe(true);
        expect(isHeadquartersOnlyApiPath('/api/forum/stats')).toBe(true);
        expect(isHeadquartersOnlyApiPath('/api/forum/reports')).toBe(true);
        expect(isHeadquartersOnlyApiPath('/api/laws/add')).toBe(true);
        expect(isHeadquartersOnlyApiPath('/api/laws/clear')).toBe(true);
        expect(isHeadquartersOnlyApiPath('/api/laws/import-bundle')).toBe(true);

        expect(isHeadquartersOnlyApiPath('/api/auth/lawyer-verification')).toBe(false);
        expect(isHeadquartersOnlyApiPath('/api/laws/list')).toBe(false);
        expect(isHeadquartersOnlyApiPath('/api/forum/posts')).toBe(false);
        expect(isHeadquartersOnlyApiPath('/api/forum/mute')).toBe(false);
        expect(isHeadquartersOnlyApiPath('/api/forum/pin')).toBe(false);
        expect(isHeadquartersOnlyApiPath('/api/forum/report')).toBe(false);
    });

    it('يتعرّف عميل المحامي الأصلي/المحمول ولا يمسّ مكتباً بلا UA', () => {
        expect(isLawyerRuntimeClient(req('https://app.test/api/admin/users'))).toBe(false);
        expect(
            isLawyerRuntimeClient(req('https://app.test/api/admin/users', { 'user-agent': DESKTOP_CHROME })),
        ).toBe(false);
        expect(
            isLawyerRuntimeClient(req('https://app.test/api/admin/users', { 'user-agent': ANDROID_WV })),
        ).toBe(true);
        expect(isLawyerRuntimeClient(req('https://app.test/api/admin/users', { 'user-agent': IPHONE }))).toBe(
            true,
        );
        expect(
            isLawyerRuntimeClient(
                req('https://app.test/api/admin/users', { 'user-agent': 'okhttp/4.12.0' }),
            ),
        ).toBe(true);
        expect(
            isLawyerRuntimeClient(req('https://app.test/api/admin/users', { 'x-capacitor': '3' })),
        ).toBe(true);
        expect(
            isLawyerRuntimeClient(
                req('https://app.test/api/admin/users', { 'x-requested-with': 'iq.hami.legal' }),
            ),
        ).toBe(true);
    });

    it('بلا HAMI_HQ_HOSTS يبقى المضيف المحلي مسموحاً', () => {
        delete process.env.HAMI_HQ_HOSTS;
        delete process.env.VERCEL_ENV;
        expect(isHeadquartersHostAllowed(req('https://app.test/api/admin/users'))).toBe(true);
        const denied = rejectHeadquartersPublicSurface(req('https://app.test/api/admin/users'));
        expect(denied).toBeNull();
    });

    it('استضافة Vercel العامة ترفض المقر ما لم يُعلَم هذا النشر مقرّاً', async () => {
        process.env.VERCEL_ENV = 'production';
        const denied = rejectHeadquartersPublicSurface(req('https://app.vercel.app/api/admin/users'));
        expect(denied?.status).toBe(404);

        process.env.HAMI_HQ_ALLOW_THIS_DEPLOYMENT = 'true';
        expect(rejectHeadquartersPublicSurface(req('https://hq.vercel.app/api/admin/users'))).toBeNull();
    });

    it('مع HAMI_HQ_HOSTS يرفض مضيفاً عاماً بـ 404 ويأذن للمضيف المدرج', async () => {
        process.env.HAMI_HQ_HOSTS = 'hq.secret.test,localhost';
        const publicHit = rejectHeadquartersPublicSurface(req('https://app.test/api/admin/users'));
        expect(publicHit).not.toBeNull();
        expect(publicHit?.status).toBe(404);
        await expect(publicHit?.json()).resolves.toEqual({ error: 'Not found' });

        expect(rejectHeadquartersPublicSurface(req('https://hq.secret.test/api/admin/users'))).toBeNull();
        expect(rejectHeadquartersPublicSurface(req('http://localhost:8080/api/admin/otp/csrf'))).toBeNull();
    });

    it('عميل okhttp يُرفض حتى لو المضيف مدرجاً', async () => {
        process.env.HAMI_HQ_HOSTS = 'hq.secret.test';
        const denied = rejectHeadquartersPublicSurface(
            req('https://hq.secret.test/api/admin/users', { 'user-agent': 'okhttp/4.12.0' }),
        );
        expect(denied?.status).toBe(404);
    });

    it('نشر المقر مع قائمة مضيفين يرفض أصلاً غير مدرج ويأذن للمدرج', async () => {
        process.env.HAMI_HQ_ALLOW_THIS_DEPLOYMENT = 'true';
        process.env.HAMI_HQ_HOSTS = 'hami-hq.vercel.app';
        const foreign = rejectHeadquartersPublicSurface(
            req('https://new-folder.vercel.app/api/admin/users', { 'user-agent': DESKTOP_CHROME }),
        );
        expect(foreign?.status).toBe(404);

        expect(
            rejectHeadquartersPublicSurface(
                req('https://hami-hq.vercel.app/api/admin/users', { 'user-agent': DESKTOP_CHROME }),
            ),
        ).toBeNull();
    });

    it('نشر المقر مع قائمة مضيفين يأذن لعنوان النشر الفريد عبر VERCEL_URL', () => {
        process.env.HAMI_HQ_ALLOW_THIS_DEPLOYMENT = 'true';
        process.env.HAMI_HQ_HOSTS = 'hami-hq.vercel.app';
        process.env.VERCEL_URL = 'hami-preview-abc.vercel.app';
        expect(
            rejectHeadquartersPublicSurface(
                req('https://hami-preview-abc.vercel.app/api/admin/users', { 'user-agent': DESKTOP_CHROME }),
            ),
        ).toBeNull();
        expect(
            rejectHeadquartersPublicSurface(
                req('https://unrelated.vercel.app/api/admin/users', { 'user-agent': DESKTOP_CHROME }),
            )?.status,
        ).toBe(404);
    });
});
