import { test, expect, type Page } from '@playwright/test';
import { seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers } from './helpers/productivityE2EFixtures';
import { prepareForumE2E, dismissForumBlockers, openForumFromHome } from './helpers/forumFixtures';

const TINY_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnXl7sAAAAASUVORK5CYII=',
    'base64',
);

async function dismissRepositoryIfBlocking(page: Page) {
    const modal = page.getByTestId('smart-repository-modal');
    const isVisible = await modal.isVisible().catch(() => false);
    if (!isVisible) return;

    const ariaHidden = await modal.getAttribute('aria-hidden').catch(() => null);
    if (ariaHidden === 'true') return;

    const closeButton = page.getByTestId('smart-repository-close');
    if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click({ force: true }).catch(() => undefined);
    } else {
        await page.keyboard.press('Escape').catch(() => undefined);
    }

    await expect(async () => {
        const stillVisible = await modal.isVisible().catch(() => false);
        if (!stillVisible) return;
        const hiddenState = await modal.getAttribute('aria-hidden').catch(() => null);
        expect(hiddenState === 'true').toBeTruthy();
    }).toPass({ timeout: 10_000 });
}

test.describe('forum attachment persistence', () => {
    test.describe.configure({ timeout: 120_000 });

    test.beforeEach(async ({ page }) => {
        await seedLawyerFiles(page);
        await prepareForumE2E(page);
    });

    test('keeps an image post after reload', async ({ page }) => {
        const postText = 'اختبار ثبات مرفق الصورة للمنتىى الوسمي مع نص كاف لإتمام النشر';

        await page.goto('/');
        await openForumFromHome(page);
        await dismissProductivityBlockers(page);
        await dismissForumBlockers(page);
        await dismissRepositoryIfBlocking(page);

        await page.getByTestId('forum-add-question-fab').click({ force: true });
        await expect(page.getByTestId('forum-add-question-sheet')).toBeVisible({ timeout: 10_000 });
        await page.locator('textarea').first().fill(postText);
        await page.getByTestId('forum-add-question-image-input').setInputFiles({
            name: 'forum-e2e-image.png',
            mimeType: 'image/png',
            buffer: TINY_PNG,
        });
        await expect(
            page.getByTestId('forum-add-question-sheet').getByAltText('Preview'),
        ).toBeVisible({ timeout: 10_000 });
        await dismissRepositoryIfBlocking(page);
        await page
            .getByTestId('forum-add-question-sheet')
            .getByRole('button', { name: 'نشر', exact: true })
            .click({ force: true });

        await expect(page.getByText(postText)).toBeVisible({ timeout: 20_000 });
        await expect(page.getByAltText('صورة مرفقة')).toBeVisible({ timeout: 20_000 });

        const persistDump = await page.evaluate((needle) => {
            const w = window as Window & {
                __hamiE2eSecureStore?: { getItemSync?: (key: string) => string | null };
            };
            const raw =
                w.__hamiE2eSecureStore?.getItemSync?.('hami:community:posts:v1') ??
                localStorage.getItem('hami:community:posts:v1');
            let parsed: unknown = null;
            try {
                parsed = raw ? JSON.parse(raw) : null;
            } catch (error) {
                parsed = { parseError: String(error) };
            }
            const list = Array.isArray(parsed) ? parsed : [];
            const hit = list.find((post) =>
                String((post as { content?: string }).content ?? '').includes(needle),
            );
            return {
                saved: Boolean(hit),
                attachmentType: (hit as { attachment?: { type?: string } } | undefined)?.attachment?.type ?? null,
            };
        }, postText);
        expect(persistDump.saved, `المنشور غير محفوظ في SecureStore: ${JSON.stringify(persistDump)}`).toBe(true);
        expect(persistDump.attachmentType).toBe('image');

        await page.reload({ waitUntil: 'domcontentloaded' });
        await openForumFromHome(page);
        await dismissProductivityBlockers(page);

        await expect(page.getByText(postText)).toBeVisible({ timeout: 20_000 });
        await expect(page.getByAltText('صورة مرفقة')).toBeVisible({ timeout: 20_000 });
    });
});
