import { test, expect, type Page } from '@playwright/test';
import { seedLawyerFiles } from './helpers/civilLawsuitFixtures';
import { dismissProductivityBlockers } from './helpers/productivityE2EFixtures';
import { prepareForumE2E, dismissForumBlockers } from './helpers/forumFixtures';

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
        await prepareForumE2E(page);
        await seedLawyerFiles(page);
    });

    test('keeps an image post after reload', async ({ page }) => {
        const postText = `اختبار ثبات مرفق الصورة ${Date.now()} مع نص كافٍ لإتمام النشر`;

        await page.addInitScript(() => {
            try {
                sessionStorage.setItem('hami:lawyer-community-open', '1');
                sessionStorage.setItem('hami:lawyer-dashboard-tab', 'community');
                sessionStorage.setItem('hami:community-section', 'forum');
            } catch {
                /* ignore */
            }
        });
        await page.goto('/');
        await expect(page.getByTestId('forum-screen')).toBeVisible({ timeout: 20_000 });
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
        await dismissRepositoryIfBlocking(page);
        await page
            .getByTestId('forum-add-question-sheet')
            .getByRole('button', { name: 'نشر', exact: true })
            .click({ force: true });

        await expect(page.getByText(postText)).toBeVisible({ timeout: 20_000 });
        await expect(page.getByAltText('forum-e2e-image.png')).toBeVisible({ timeout: 20_000 });

        const savedBeforeReload = await page.evaluate((needle) => {
            const posts = JSON.parse(localStorage.getItem('hami:community:posts:v1') || '[]') as Array<{ content?: string; attachment?: { name?: string; storagePath?: string; url?: string } }>;
            return posts.find((post) => post.content?.includes(needle)) ?? null;
        }, postText);

        expect(savedBeforeReload).not.toBeNull();

        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.getByTestId('forum-screen')).toBeVisible({ timeout: 20_000 });
        await dismissProductivityBlockers(page);

        await expect(page.getByText(postText)).toBeVisible({ timeout: 20_000 });
        await expect(page.getByAltText('forum-e2e-image.png')).toBeVisible({ timeout: 20_000 });
    });
});
