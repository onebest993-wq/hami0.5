/**
 * E2E — استوديو الملف المهني: كل لون/خامة/تفاعل في الكتالوج قابل للاختيار.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import {
    prepareProfileE2E,
    openProfileStudio,
    reopenProfileStudio,
    dismissProfileBlockers,
} from './helpers/profileFixtures';
import { ensureLawyerDashboard } from './helpers/civilLawsuitFixtures';
import {
    PROFILE_ACCENT_COLORS,
    PROFILE_CANVAS_FRAME_GLOWS,
    PROFILE_CANVAS_FRAME_SHAPES,
    PROFILE_CANVAS_INTERACTIONS,
    PROFILE_CANVAS_MATERIALS,
    PROFILE_IMAGE_INTERACTIONS,
    PROFILE_IMAGE_RIM_STYLES,
    PROFILE_MATERIALS,
    PROFILE_MEDIA_TEMPLATES,
} from '../src/app/services/profile/profilePageCatalog';

async function clickCatalogChip(chip: Locator) {
    await expect(chip).toBeVisible({ timeout: 12_000 });
    await chip.scrollIntoViewIfNeeded();
    await chip.click({ timeout: 10_000 });
    await expect(chip).toHaveAttribute('data-selected', 'true', { timeout: 8_000 });
}

async function openTextBlockStudio(sheet: Locator) {
    await sheet.getByTestId('profile-settings-tab-containers').click();
    await expect(sheet.getByTestId('profile-settings-containers-tab')).toBeVisible();

    if ((await sheet.locator('[data-testid^="profile-block-expand-"]').count()) === 0) {
        await sheet.getByRole('button', { name: 'إضافة نص حر' }).click();
        await expect(sheet.locator('[data-testid^="profile-block-expand-"]').first()).toBeVisible({
            timeout: 10_000,
        });
    }

    const expandBtn = sheet.locator('[data-testid^="profile-block-expand-"]').first();
    const blockId = (await expandBtn.getAttribute('data-testid'))?.replace('profile-block-expand-', '');
    if (blockId) {
        const head = sheet.locator(`[data-testid="profile-block-expand-${blockId}"]`).locator('..');
        if ((await head.getAttribute('data-open')) !== 'true') {
            await expandBtn.click();
        }
        await expect(sheet.getByTestId(`profile-block-body-${blockId}`)).toBeVisible({ timeout: 12_000 });
    }

    const bodyInput = sheet.getByTestId('text-block-body-input');
    await expect(bodyInput).toBeVisible({ timeout: 10_000 });
    await bodyInput.fill('نص اختبار الاستوديو');
}

async function ensureTextCanvasPanelEnabled(sheet: Locator) {
    await sheet.getByTestId('text-studio-tab-canvas').click();
    const toggle = sheet
        .getByTestId('text-canvas-enabled-toggle')
        .locator('.profile-settings-luxury-toggle');
    if ((await toggle.getAttribute('data-on')) !== 'true') {
        await sheet.getByTestId('text-canvas-enabled-toggle').click();
    }
    await expect(sheet.getByTestId('text-block-canvas-panel')).toBeVisible({ timeout: 10_000 });
}

async function openTextBlockInteractionPanel(sheet: Locator) {
    await openTextBlockStudio(sheet);
    await sheet.getByTestId('text-studio-tab-interaction').click();
    const panel = sheet.getByTestId('text-block-interaction-panel');
    await expect(panel).toBeVisible({ timeout: 12_000 });
    return panel;
}

async function openImageBlockStudio(sheet: Locator) {
    await sheet.getByTestId('profile-settings-tab-containers').click();
    await sheet.getByRole('button', { name: 'صور مخصصة' }).click();

    const expandSelector = '[data-testid^="profile-block-expand-"]';
    if ((await sheet.locator(expandSelector).count()) === 0) {
        await sheet.getByRole('button', { name: 'إضافة صورة' }).click();
        await expect(sheet.locator(expandSelector).first()).toBeVisible({ timeout: 10_000 });
    }

    const expandBtn = sheet.locator(expandSelector).first();
    const blockId = (await expandBtn.getAttribute('data-testid'))?.replace('profile-block-expand-', '');
    if (blockId) {
        const head = expandBtn.locator('..');
        if ((await head.getAttribute('data-open')) !== 'true') {
            await expandBtn.click();
        }
        await expect(sheet.getByTestId(`profile-block-body-${blockId}`)).toBeVisible({
            timeout: 12_000,
        });
    }

    await expect(sheet.getByTestId('image-block-studio-editor')).toBeVisible({ timeout: 12_000 });
}

async function openStudioSheet(page: Page, reuse = false) {
    if (reuse) {
        return reopenProfileStudio(page);
    }
    return openProfileStudio(page);
}

function studioSuiteSetup() {
    let booted = false;
    return async (page: Page) => {
        await prepareProfileE2E(page);
        if (!booted) {
            await page.goto('/');
            await ensureLawyerDashboard(page);
            booted = true;
        }
        await dismissProfileBlockers(page);
    };
}

const bootCatalogStudio = studioSuiteSetup();
const bootImageStudio = studioSuiteSetup();

test.describe('استوديو الملف المهني — تغطية الكتالوج', () => {
    test.describe.configure({ mode: 'serial', timeout: 120_000 });

    test.beforeEach(async ({ page }) => {
        await bootCatalogStudio(page);
    });

    for (const color of PROFILE_ACCENT_COLORS) {
        test(`لون التمييز: ${color.label}`, async ({ page }) => {
            const sheet = await openStudioSheet(page);
            await sheet.getByTestId('profile-settings-tab-appearance').click();
            await clickCatalogChip(sheet.getByTestId(`profile-accent-${color.id}`));
        });
    }

    for (const material of PROFILE_MATERIALS) {
        test(`خامة الصفحة: ${material.label}`, async ({ page }) => {
            const sheet = await openStudioSheet(page, true);
            await sheet.getByTestId('profile-settings-tab-appearance').click();
            await clickCatalogChip(sheet.getByTestId(`profile-material-${material.id}`));
        });
    }

    for (const mat of PROFILE_CANVAS_MATERIALS) {
        test(`خامة لوحة النص: ${mat.label}`, async ({ page }) => {
            const sheet = await openStudioSheet(page, true);
            await openTextBlockStudio(sheet);
            await ensureTextCanvasPanelEnabled(sheet);
            await clickCatalogChip(sheet.getByTestId(`text-canvas-material-${mat.id}`));
        });
    }

    for (const shape of PROFILE_CANVAS_FRAME_SHAPES) {
        test(`شكل إطار النص: ${shape.label}`, async ({ page }) => {
            const sheet = await openStudioSheet(page, true);
            await openTextBlockStudio(sheet);
            await ensureTextCanvasPanelEnabled(sheet);
            await clickCatalogChip(sheet.getByTestId(`text-canvas-frame-${shape.id}`));
        });
    }

    for (const glow of PROFILE_CANVAS_FRAME_GLOWS) {
        test(`توهج لوحة النص: ${glow.label}`, async ({ page }) => {
            const sheet = await openStudioSheet(page, true);
            await openTextBlockStudio(sheet);
            await ensureTextCanvasPanelEnabled(sheet);
            await clickCatalogChip(sheet.getByTestId(`text-canvas-glow-${glow.id}`));
        });
    }

    for (const interaction of PROFILE_CANVAS_INTERACTIONS) {
        test(`تفاعل كشف النص: ${interaction.label}`, async ({ page }) => {
            const sheet = await openStudioSheet(page, true);
            await openTextBlockInteractionPanel(sheet);
            const btn = sheet.getByTestId(`text-canvas-interaction-${interaction.id}`);
            await clickCatalogChip(btn);
            const preview = sheet.locator('[data-profile-block-shell][data-block-kind="text"]').first();
            if (interaction.id !== 'none') {
                await expect(preview.locator('.profile-text-canvas')).toHaveAttribute(
                    'data-interaction',
                    interaction.id,
                    { timeout: 8_000 },
                );
            }
        });
    }

    test('تفاعل الستارة الذهبية يكشف النص في المعاينة', async ({ page }) => {
        const sheet = await openStudioSheet(page, true);
        await openTextBlockInteractionPanel(sheet);
        await sheet.getByTestId('text-canvas-interaction-tapReveal').click();
        const canvas = sheet.locator('.profile-text-canvas').first();
        await expect(canvas).toHaveAttribute('data-revealed', 'false');
        await canvas.locator('.profile-text-canvas__reveal-tap').click({ force: true });
        await expect(canvas).toHaveAttribute('data-revealed', 'true', { timeout: 8_000 });
    });
});

test.describe('استوديو صورة مخصصة — قوالب وتفاعلات', () => {
    test.describe.configure({ mode: 'serial', timeout: 120_000 });

    test.beforeEach(async ({ page }) => {
        await bootImageStudio(page);
    });

    for (const template of PROFILE_MEDIA_TEMPLATES) {
        test(`قالب الصورة: ${template.label}`, async ({ page }) => {
            const sheet = await openStudioSheet(page);
            await openImageBlockStudio(sheet);
            await clickCatalogChip(sheet.getByTestId(`image-template-${template.id}`));
        });
    }

    for (const rim of PROFILE_IMAGE_RIM_STYLES) {
        test(`حافة الصورة: ${rim.label}`, async ({ page }) => {
            const sheet = await openStudioSheet(page, true);
            await openImageBlockStudio(sheet);
            await clickCatalogChip(sheet.getByTestId(`image-rim-${rim.id}`));
        });
    }

    for (const glow of PROFILE_CANVAS_FRAME_GLOWS) {
        test(`توهج الصورة: ${glow.label}`, async ({ page }) => {
            const sheet = await openStudioSheet(page, true);
            await openImageBlockStudio(sheet);
            await clickCatalogChip(sheet.getByTestId(`image-glow-${glow.id}`));
        });
    }

    for (const fx of PROFILE_IMAGE_INTERACTIONS) {
        test(`حركة الصورة: ${fx.label}`, async ({ page }) => {
            const sheet = await openStudioSheet(page, true);
            await openImageBlockStudio(sheet);
            await sheet.getByTestId('image-studio-tab-fx').click();
            await clickCatalogChip(sheet.getByTestId(`image-interaction-${fx.id}`));
        });
    }
});
