/**
 * E2E — استوديو الملف المهني: كل لون/خامة في الكتالوج قابل للاختيار.
 * كل فئة في اختبار واحد لتجنّب إعادة فتح الاستوديو بين كل chip (أكثر استقراراً).
 */
import { test, expect, type Page } from '@playwright/test';
import {
    prepareProfileStudioE2E,
    openProfileStudio,
    clickCatalogChip,
    resetProfileScreenForE2E,
    saveProfileStudioAndClose,
    visibleProfileRoot,
    reopenLawyerProfileFromHome,
    uploadStudioCustomBlockImage,
} from './helpers/profileFixtures';
import {
    PROFILE_ACCENT_COLORS,
    PROFILE_CANVAS_FRAME_SHAPES,
    PROFILE_CANVAS_MATERIALS,
    PROFILE_IMAGE_RIM_STYLES,
    PROFILE_MATERIALS,
    PROFILE_MEDIA_TEMPLATES,
    PROFILE_PORTRAIT_FRAMES,
} from '../src/app/services/profile/profilePageCatalog';

async function clickStudioControl(page: Page, testId: string) {
    const control = page.getByTestId(testId);
    await expect(control).toBeVisible({ timeout: 12_000 });
    await control.evaluate((el) => (el as HTMLButtonElement).click());
}

async function clickStudioRole(page: Page, name: string) {
    const btn = page.getByRole('button', { name });
    await expect(btn).toBeVisible({ timeout: 12_000 });
    await btn.evaluate((el) => (el as HTMLButtonElement).click());
}

async function openTextBlockStudio(page: Page) {
    await clickStudioControl(page, 'profile-settings-tab-containers');
    await expect(page.getByTestId('profile-settings-containers-tab')).toBeVisible({ timeout: 12_000 });

    const sheet = page.getByTestId('profile-settings-sheet');
    if ((await sheet.locator('[data-testid^="profile-block-expand-"]').count()) === 0) {
        await clickStudioRole(page, 'إضافة نص حر');
        await expect(sheet.locator('[data-testid^="profile-block-expand-"]').first()).toBeVisible({
            timeout: 10_000,
        });
    }

    const expandBtn = sheet.locator('[data-testid^="profile-block-expand-"]').first();
    const blockId = (await expandBtn.getAttribute('data-testid'))?.replace('profile-block-expand-', '');
    if (blockId) {
        const head = sheet.locator(`[data-testid="profile-block-expand-${blockId}"]`).locator('..');
        if ((await head.getAttribute('data-open')) !== 'true') {
            await expandBtn.evaluate((el) => (el as HTMLButtonElement).click());
        }
        await expect(page.getByTestId(`profile-block-body-${blockId}`)).toBeVisible({ timeout: 12_000 });
    }

    const bodyInput = page.getByTestId('text-block-body-input');
    await expect(bodyInput).toBeVisible({ timeout: 10_000 });
    await bodyInput.fill('نص اختبار الاستوديو');
}

async function ensureTextCanvasPanelEnabled(page: Page) {
    await clickStudioControl(page, 'text-studio-tab-canvas');
    const toggle = page
        .getByTestId('text-canvas-enabled-toggle')
        .locator('.profile-settings-luxury-toggle');
    if ((await toggle.getAttribute('data-on')) !== 'true') {
        await page.getByTestId('text-canvas-enabled-toggle').evaluate((el) =>
            (el as HTMLButtonElement).click(),
        );
    }
    await expect(page.getByTestId('text-block-canvas-panel')).toBeVisible({ timeout: 10_000 });
}

async function openImageBlockStudio(page: Page) {
    await clickStudioControl(page, 'profile-settings-tab-containers');
    await clickStudioRole(page, 'صور مخصصة');

    const sheet = page.getByTestId('profile-settings-sheet');
    const expandSelector = '[data-testid^="profile-block-expand-"]';
    if ((await sheet.locator(expandSelector).count()) === 0) {
        await clickStudioRole(page, 'إضافة صورة');
        await expect(sheet.locator(expandSelector).first()).toBeVisible({ timeout: 10_000 });
    }

    const expandBtn = sheet.locator(expandSelector).first();
    const blockId = (await expandBtn.getAttribute('data-testid'))?.replace('profile-block-expand-', '');
    if (blockId) {
        const head = expandBtn.locator('..');
        if ((await head.getAttribute('data-open')) !== 'true') {
            await expandBtn.evaluate((el) => (el as HTMLButtonElement).click());
        }
        await expect(page.getByTestId(`profile-block-body-${blockId}`)).toBeVisible({
            timeout: 12_000,
        });
    }

    await expect(page.getByTestId('image-block-studio-editor')).toBeVisible({ timeout: 12_000 });
}

/** قوالب الإطار في تبويب «الإطار» — ليس تبويب الصورة الافتراضي */
async function openImageBlockFramePanel(page: Page) {
    await openImageBlockStudio(page);
    await clickStudioControl(page, 'image-studio-tab-frame');
    await expect(page.getByTestId('image-block-frame-panel')).toBeVisible({ timeout: 12_000 });
}

test.describe('استوديو الملف المهني — تغطية الكتالوج', () => {
    test.describe.configure({ mode: 'serial', timeout: 180_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProfileStudioE2E(page);
    });

    test('كل ألوان التمييز في الكتالوج', async ({ page }) => {
        await openProfileStudio(page);
        await clickStudioControl(page, 'profile-settings-tab-appearance');
        await expect(page.getByTestId('profile-settings-appearance-tab')).toBeVisible({
            timeout: 12_000,
        });
        for (const color of PROFILE_ACCENT_COLORS) {
            await clickCatalogChip(page, `profile-accent-${color.id}`);
        }
    });

    test('كل خامات الصفحة في الكتالوج', async ({ page }) => {
        await openProfileStudio(page);
        await clickStudioControl(page, 'profile-settings-tab-appearance');
        await expect(page.getByTestId('profile-settings-appearance-tab')).toBeVisible({
            timeout: 12_000,
        });
        for (const material of PROFILE_MATERIALS) {
            await clickCatalogChip(page, `profile-material-${material.id}`);
        }
    });

    test('كل إطارات الصورة الشخصية في الكتالوج', async ({ page }) => {
        await openProfileStudio(page);
        await clickStudioControl(page, 'profile-settings-tab-appearance');
        await expect(page.getByTestId('profile-settings-appearance-tab')).toBeVisible({
            timeout: 12_000,
        });
        for (const frame of PROFILE_PORTRAIT_FRAMES) {
            await clickCatalogChip(page, `profile-portrait-frame-${frame.id}`);
        }
    });

    test('كل خامات لوحة النص في الكتالوج', async ({ page }) => {
        await openProfileStudio(page);
        await openTextBlockStudio(page);
        await ensureTextCanvasPanelEnabled(page);
        for (const mat of PROFILE_CANVAS_MATERIALS) {
            await clickCatalogChip(page, `text-canvas-material-${mat.id}`);
        }
    });

    test('كل أشكال إطار النص في الكتالوج', async ({ page }) => {
        await openProfileStudio(page);
        await openTextBlockStudio(page);
        await ensureTextCanvasPanelEnabled(page);
        for (const shape of PROFILE_CANVAS_FRAME_SHAPES) {
            await clickCatalogChip(page, `text-canvas-frame-${shape.id}`);
        }
        await resetProfileScreenForE2E(page);
    });
});

test.describe('حفظ مظهر الاستوديو', () => {
    test.describe.configure({ timeout: 240_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProfileStudioE2E(page);
    });

    test('حفظ اللون والخامة والإطار يبقى بعد إغلاق الملف وإعادة فتحه', async ({ page }) => {
        await openProfileStudio(page);
        await clickStudioControl(page, 'profile-settings-tab-appearance');
        await expect(page.getByTestId('profile-settings-appearance-tab')).toBeVisible({
            timeout: 12_000,
        });
        await clickCatalogChip(page, 'profile-accent-emerald');
        await clickCatalogChip(page, 'profile-material-metallic');
        await clickCatalogChip(page, 'profile-portrait-frame-arch');
        await saveProfileStudioAndClose(page);

        const root = visibleProfileRoot(page);
        await expect(root).toHaveAttribute('data-profile-accent', 'emerald', { timeout: 10_000 });
        await expect(root).toHaveAttribute('data-profile-material', 'metallic');
        await expect(root).toHaveAttribute('data-profile-portrait-frame', 'arch');

        await reopenLawyerProfileFromHome(page);

        const reopened = visibleProfileRoot(page);
        await expect(reopened).toHaveAttribute('data-profile-accent', 'emerald', { timeout: 15_000 });
        await expect(reopened).toHaveAttribute('data-profile-material', 'metallic');
        await expect(reopened).toHaveAttribute('data-profile-portrait-frame', 'arch');
        await resetProfileScreenForE2E(page);
    });
});

test.describe('حفظ حاوية نص في الاستوديو', () => {
    test.describe.configure({ timeout: 240_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProfileStudioE2E(page);
    });

    test('نص الحاوية يبقى على الملف بعد الحفظ وإعادة الفتح', async ({ page }) => {
        const body = `حاوية نص E2E ${Date.now()}`;
        await openProfileStudio(page);
        await clickStudioControl(page, 'profile-settings-tab-containers');
        await expect(page.getByTestId('profile-settings-containers-tab')).toBeVisible({
            timeout: 12_000,
        });
        await clickStudioRole(page, 'إضافة نص حر');
        const bodyInput = page.getByTestId('text-block-body-input');
        await expect(bodyInput).toBeVisible({ timeout: 12_000 });
        await bodyInput.fill(body);
        await saveProfileStudioAndClose(page);

        await expect(page.getByTestId('profile-custom-blocks')).toBeVisible({ timeout: 12_000 });
        await expect(visibleProfileRoot(page).getByText(body)).toBeVisible({ timeout: 10_000 });

        await reopenLawyerProfileFromHome(page);
        await expect(page.getByTestId('profile-custom-blocks')).toBeVisible({ timeout: 15_000 });
        await expect(visibleProfileRoot(page).getByText(body)).toBeVisible({ timeout: 10_000 });
        await resetProfileScreenForE2E(page);
    });
});

test.describe('حفظ صورة مخصصة في الاستوديو', () => {
    test.describe.configure({ timeout: 240_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProfileStudioE2E(page);
    });

    test('الصورة والإطار والتعليق يبقون بعد الحفظ وإعادة الفتح', async ({ page }) => {
        const caption = `حاوية صورة E2E ${Date.now()}`;
        await openProfileStudio(page);
        await clickStudioControl(page, 'profile-settings-tab-containers');
        await expect(page.getByTestId('profile-settings-containers-tab')).toBeVisible({
            timeout: 12_000,
        });
        await clickStudioRole(page, 'صور مخصصة');
        await clickStudioRole(page, 'إضافة صورة');
        const captionInput = page.getByTestId('image-caption-input');
        await expect(captionInput).toBeVisible({ timeout: 12_000 });
        await captionInput.fill(caption);
        await uploadStudioCustomBlockImage(page);
        await clickStudioControl(page, 'image-studio-tab-frame');
        await expect(page.getByTestId('image-block-frame-panel')).toBeVisible({ timeout: 12_000 });
        await clickCatalogChip(page, 'image-template-cinema');
        await clickCatalogChip(page, 'image-rim-neon');
        await saveProfileStudioAndClose(page);

        const saved = visibleProfileRoot(page)
            .getByTestId('profile-page-image-block')
            .filter({ hasText: caption });
        await expect(saved).toBeVisible({ timeout: 12_000 });
        await expect(saved).toHaveAttribute('data-has-image', 'true');
        await expect(saved.locator('[data-profile-media-shell]')).toHaveAttribute(
            'data-template',
            'cinema',
        );
        await expect(saved.locator('[data-profile-media-shell]')).toHaveAttribute('data-rim', 'neon');

        await reopenLawyerProfileFromHome(page);

        const reopened = visibleProfileRoot(page)
            .getByTestId('profile-page-image-block')
            .filter({ hasText: caption });
        await expect(reopened).toBeVisible({ timeout: 15_000 });
        await expect(reopened).toHaveAttribute('data-has-image', 'true');
        await expect(reopened.locator('[data-profile-media-shell]')).toHaveAttribute(
            'data-template',
            'cinema',
        );
        await expect(reopened.locator('[data-profile-media-shell]')).toHaveAttribute(
            'data-rim',
            'neon',
        );
        await resetProfileScreenForE2E(page);
    });
});

test.describe('استوديو صورة مخصصة — قوالب الإطار', () => {
    test.describe.configure({ mode: 'serial', timeout: 180_000 });

    test.beforeEach(async ({ page }) => {
        await prepareProfileStudioE2E(page);
    });

    test('كل قوالب الصورة في الكتالوج', async ({ page }) => {
        await openProfileStudio(page);
        await openImageBlockFramePanel(page);
        for (const template of PROFILE_MEDIA_TEMPLATES) {
            await clickCatalogChip(page, `image-template-${template.id}`);
        }
    });

    test('كل حواف الصورة في الكتالوج', async ({ page }) => {
        await openProfileStudio(page);
        await openImageBlockFramePanel(page);
        for (const rim of PROFILE_IMAGE_RIM_STYLES) {
            await clickCatalogChip(page, `image-rim-${rim.id}`);
        }
        await resetProfileScreenForE2E(page);
    });
});
