import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolvePasswordResetRedirectTo } from './passwordResetRedirectAllowlist.ts';

const envMocks = vi.hoisted(() => ({ production: false }));

vi.mock('../security/wifeStoreEnv.ts', () => ({
    isWifeProduction: () => envMocks.production,
}));

function req(origin?: string): Request {
    const request = new Request('https://app.hami.legal/api/auth/forgot-password', {
        method: 'POST',
        headers: origin ? { origin } : {},
    });
    if (origin && !request.headers.get('origin')) {
        vi.spyOn(request.headers, 'get').mockImplementation((name: string) =>
            name.toLowerCase() === 'origin' ? origin : null,
        );
    }
    return request;
}

describe('passwordResetRedirectAllowlist', () => {
    beforeEach(() => {
        delete process.env.PASSWORD_RESET_ALLOWED_ORIGINS;
        delete process.env.PUBLIC_APP_URL;
        delete process.env.SITE_URL;
    });

    it('rejects attacker-controlled https origins', () => {
        expect(
            resolvePasswordResetRedirectTo('https://evil.example/steal', req('https://app.hami.legal')),
        ).toBe('');
    });

    it('allows hami.legal https origins', () => {
        expect(
            resolvePasswordResetRedirectTo('https://app.hami.legal/reset', req()),
        ).toBe('https://app.hami.legal/reset');
    });

    it('allows capacitor deep link schemes', () => {
        expect(resolvePasswordResetRedirectTo('iq.hami.legal://auth/reset', req())).toBe(
            'iq.hami.legal://auth/reset',
        );
    });

    it('falls back to request origin when redirect empty', () => {
        expect(resolvePasswordResetRedirectTo('', req('https://app.hami.legal'))).toBe(
            'https://app.hami.legal',
        );
    });

    it('ignores evil origin header', () => {
        expect(resolvePasswordResetRedirectTo('', req('https://evil.example'))).toBe('');
    });

    /*
     * رابط الاستعادة يحمل رمزاً يكفي وحده للاستيلاء على الحساب: `flowType`
     * الافتراضي في auth-js 2.108.2 هو `implicit`، فالرمز يصل في العنوان لا كرمز
     * يُبادَل بمُتحقِّق. وكل ما تحته يمنع تسليمه إلى وجهة لا يملكها التطبيق.
     */
    describe('سطح الرابط العميق — أضيق ما يمكن', () => {
        afterEach(() => {
            envMocks.production = false;
        });

        /*
         * `com.hami.app://` و`hami://` كانا مقبولين ولا وجود لهما في المشروع:
         * المانيفست يُعلن `iq.hami.legal` وحده، و`applyAuthDeepLink` لا يُطبّع
         * سواه. أي أن قبولهما يسلّم الرمز إلى نطاق لا يستقبله تطبيق Hami أصلاً —
         * والنطاق المخصّص غير حصري، فأي تطبيق يسجّله يلتقط الرمز.
         */
        it('يرفض النطاقات المخصّصة التي لا يُعلنها التطبيق', () => {
            expect(resolvePasswordResetRedirectTo('hami://auth/reset', req())).toBe('');
            expect(resolvePasswordResetRedirectTo('com.hami.app://auth/reset', req())).toBe('');
            expect(resolvePasswordResetRedirectTo('HAMI://auth/reset', req())).toBe('');
        });

        it('يُبقي النطاق الوحيد المُعلَن في المانيفست', () => {
            expect(resolvePasswordResetRedirectTo('iq.hami.legal://auth/reset', req())).toBe(
                'iq.hami.legal://auth/reset',
            );
        });

        /*
         * `localhost` كان مقبولاً بلا قيد — في الإنتاج أيضاً. فيُسلَّم الرمز إلى
         * أي مُنصِت محلي على جهاز الضحية، وتطبيقٌ خبيث على الجهاز نفسه يستطيع
         * أن يكونه.
         */
        it('يمنع loopback في الإنتاج ويُبقيه في التطوير', () => {
            envMocks.production = false;
            expect(resolvePasswordResetRedirectTo('http://localhost:5173/reset', req())).toBe(
                'http://localhost:5173/reset',
            );

            envMocks.production = true;
            expect(resolvePasswordResetRedirectTo('http://localhost:5173/reset', req())).toBe('');
            expect(resolvePasswordResetRedirectTo('https://127.0.0.1/reset', req())).toBe('');
        });

        /* الرمز على نص صريح يقرؤه أي وسيط على الشبكة */
        it('يمنع http في الإنتاج ولو كان المضيف مسموحاً', () => {
            envMocks.production = true;
            expect(resolvePasswordResetRedirectTo('http://app.hami.legal/reset', req())).toBe('');
            expect(resolvePasswordResetRedirectTo('https://app.hami.legal/reset', req())).toBe(
                'https://app.hami.legal/reset',
            );
        });

        /* ترويسة Origin تمرّ بالمسار نفسه — لا باب خلفياً */
        it('يطبّق القيد نفسه على الرجوع إلى ترويسة Origin', () => {
            envMocks.production = true;
            expect(resolvePasswordResetRedirectTo('', req('http://localhost:5173'))).toBe('');
            expect(resolvePasswordResetRedirectTo('', req('https://app.hami.legal'))).toBe(
                'https://app.hami.legal',
            );
        });
    });
});
