/**
 * Live HQ first screen: white document, no HQ chrome, no session → OTP probe asks for login.
 * Does not automate the document unlock.
 */
import { expect, test } from '@playwright/test';

const ORIGIN = (process.env.HQ_GATE_ORIGIN ?? 'http://127.0.0.1:8080').trim().replace(/\/$/, '');

test.describe('HQ live first screen', () => {
    test.describe.configure({ timeout: 30_000 });

    test(' /admin is a blank document and anonymous OTP status is not trusted', async ({ page }) => {
        const res = await page.goto(`${ORIGIN}/admin`, { waitUntil: 'domcontentloaded' });
        expect(res?.ok() ?? false).toBeTruthy();

        await expect(page.getByTestId('doc-surface')).toBeVisible({ timeout: 20_000 });
        await expect(page.getByTestId('doc-surface')).toHaveText('');
        await expect(page.getByTestId('lawyer-sign-in-submit')).toHaveCount(0);
        await expect(page.getByTestId('admin-otp-input')).toHaveCount(0);
        await expect(page.getByTestId('hq-end-session')).toHaveCount(0);
        await expect(page.getByRole('heading', { name: 'مقر القيادة' })).toHaveCount(0);

        const probe = await page.request.get(
            `${ORIGIN}/api/admin/otp/status?deviceFingerprint=livedevice1`,
            { headers: { Origin: ORIGIN, Accept: 'application/json' } },
        );
        expect(probe.ok()).toBeTruthy();
        const body = (await probe.json()) as { trusted?: boolean; sessionRequired?: boolean };
        expect(body.trusted).toBe(false);
        expect(body.sessionRequired).toBe(true);
    });
});
