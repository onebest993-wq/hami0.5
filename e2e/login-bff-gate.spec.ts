/**
 * دخول حي عبر بوابة BFF — يحتاج خادماً بـ VITE_SHELL_AUTH_OPEN=false و VITE_BFF_AUTH=true.
 *   E2E_LOGIN_GATE_ORIGIN=http://127.0.0.1:8081 npx playwright test e2e/login-bff-gate.spec.ts --project=chromium
 */
import { test, expect, type Page } from '@playwright/test';

const ORIGIN = (process.env.E2E_LOGIN_GATE_ORIGIN ?? '').trim().replace(/\/$/, '');
const TERMS_VERSION = 'v1-2026-08-12';

async function openAuthGate(page: Page): Promise<void> {
    const sessionProbe = page
        .waitForResponse((res) => {
            try {
                return new URL(res.url()).pathname === '/api/auth/session';
            } catch {
                return false;
            }
        }, { timeout: 20_000 })
        .catch(() => null);
    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('lawyer-sign-in-gate')).toBeVisible({ timeout: 45_000 });
    await sessionProbe;
    await expect(page.getByTestId('lawyer-auth-choice')).toBeVisible({ timeout: 20_000 });
}

async function openLoginForm(page: Page): Promise<void> {
    await openAuthGate(page);
    await page.getByTestId('lawyer-auth-go-login').click();
    await expect(page.getByTestId('lawyer-sign-in-form')).toBeVisible({ timeout: 20_000 });
}

test.describe('BFF login gate — live UI', () => {
    test.describe.configure({ timeout: 60_000 });

    test.skip(!ORIGIN, 'Set E2E_LOGIN_GATE_ORIGIN to a Vite origin with the auth gate open');

    test.beforeEach(async ({ page }) => {
        await page.addInitScript((termsVersion) => {
            try {
                localStorage.setItem(
                    'hami:legal:terms-accepted:v1',
                    JSON.stringify({ version: termsVersion, acceptedAt: new Date().toISOString() }),
                );
                document.cookie = `hami_legal_terms_accepted=${encodeURIComponent(termsVersion)}; path=/; max-age=31536000; SameSite=Lax`;
            } catch {
                /* ignore */
            }
        }, TERMS_VERSION);
    });

    test('wrong password shows a generic Arabic error and sets no session cookie', async ({ page }) => {
        await openLoginForm(page);
        const [loginRes] = await Promise.all([
            page.waitForResponse(
                (res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST',
                { timeout: 25_000 },
            ),
            page.evaluate(({ email, password }) => {
                const form = document.querySelector('[data-testid="lawyer-sign-in-form"]') as HTMLFormElement | null;
                const emailBox = document.querySelector('[data-testid="lawyer-sign-in-email"]') as HTMLInputElement | null;
                const passwordBox = document.querySelector('[data-testid="lawyer-sign-in-password"]') as HTMLInputElement | null;
                if (!form || !emailBox || !passwordBox) {
                    throw new Error('login form not mounted');
                }
                const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                setValue?.call(emailBox, email);
                emailBox.dispatchEvent(new Event('input', { bubbles: true }));
                setValue?.call(passwordBox, password);
                passwordBox.dispatchEvent(new Event('input', { bubbles: true }));
                form.requestSubmit();
            }, { email: 'assault-no-account@gmail.com', password: 'WrongPass9x' }),
        ]);
        expect([401, 503, 429]).toContain(loginRes.status());
        expect((loginRes.headers()['set-cookie'] ?? '').includes('hami_access_token=')).toBe(false);
        await expect(page.getByTestId('lawyer-sign-in-error')).toContainText(
            /البريد أو كلمة المرور|غير متاحة|محاولات كثيرة|فشل تسجيل الدخول/,
            { timeout: 10_000 },
        );
    });

    test('register rejects disposable email before calling signup', async ({ page }) => {
        const signupHits: number[] = [];
        page.on('response', (res) => {
            if (res.url().includes('/api/auth/signup') && res.request().method() === 'POST') {
                signupHits.push(res.status());
            }
        });

        await openAuthGate(page);
        await page.getByTestId('lawyer-auth-go-register').click();
        await expect(page.getByTestId('lawyer-register-credentials')).toBeVisible({ timeout: 20_000 });
        await page.getByTestId('lawyer-register-email').fill('e2e-assault@mailinator.com');
        await page.getByTestId('lawyer-register-password').fill('SecureLaw9');
        await page.getByTestId('lawyer-register-password-confirm').fill('SecureLaw9');
        await page.getByTestId('lawyer-register-credentials-next').click();
        await expect(page.getByTestId('lawyer-register-error')).toBeVisible({ timeout: 8_000 });
        expect(signupHits).toEqual([]);
    });

    test('forgot-password opens email container then verifies the mailbox before channels', async ({ page }) => {
        await openLoginForm(page);
        const forgotBtn = page.getByTestId('lawyer-sign-in-forgot');
        await expect(forgotBtn).toBeEnabled();
        await forgotBtn.click();
        await expect(page.getByTestId('lawyer-auth-otp-email-form')).toBeVisible({ timeout: 10_000 });
        await page.getByTestId('lawyer-auth-otp-email').fill('assault-no-account@gmail.com');
        const previewPromise = page.waitForResponse(
            (res) => res.url().includes('/api/auth/otp/preview') && res.request().method() === 'POST',
            { timeout: 25_000 },
        );
        await page.getByTestId('lawyer-auth-otp-email-continue').click();
        const previewRes = await previewPromise;
        if (previewRes.ok()) {
            await expect(page.getByTestId('lawyer-auth-otp-channel-whatsapp')).toBeVisible();
            await expect(page.getByTestId('lawyer-auth-otp-channel-email')).toBeVisible();
        } else {
            expect([400, 404]).toContain(previewRes.status());
            await expect(page.getByTestId('lawyer-auth-otp-error')).toBeVisible({ timeout: 10_000 });
            await expect(page.getByTestId('lawyer-auth-otp-code')).toHaveCount(0);
        }
    });

    test('recovery return URL opens the password-reset gate instead of the dashboard', async ({ page }) => {
        await page.goto(`${ORIGIN}/?hami_auth=recovery`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByTestId('lawyer-password-reset-gate')).toBeVisible({ timeout: 45_000 });
        await expect(page.getByTestId('lawyer-sign-in-form')).toHaveCount(0);
    });
});
