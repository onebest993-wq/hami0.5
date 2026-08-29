import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { clickRepositoryChrome, fillControlledTextInput } from './repositoryFixtures';

/** PNG 1×1 — يمرّ عبر منتقي الملفات دون حوار نظام التشغيل */
export const E2E_TINY_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnXl7sAAAAASUVORK5CYII=',
    'base64',
);

export const E2E_TINY_PDF = Buffer.from('%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n', 'utf8');

export const E2E_REPO_IMAGE_FILE = {
    name: 'هوية-موكل.png',
    mimeType: 'image/png',
    buffer: E2E_TINY_PNG,
};

export const E2E_REPO_PDF_FILE = {
    name: 'عقد-البيع.pdf',
    mimeType: 'application/pdf',
    buffer: E2E_TINY_PDF,
};

export const E2E_REPO_COMPOSE_ATTACH_FILE = {
    name: 'مرفق-مسودة.png',
    mimeType: 'image/png',
    buffer: E2E_TINY_PNG,
};

function installScannerCameraInBrowser() {
    try {
        sessionStorage.setItem('hami:e2e-camera', '1');
    } catch {
        /* ignore */
    }
    (window as Window & { __hamiE2eCamera?: boolean }).__hamiE2eCamera = true;
    document.documentElement.setAttribute('data-hami-e2e-camera', '1');
}

export async function grantCameraPermission(page: Page) {
    const raw = page.url();
    const origin = !raw || raw === 'about:blank' ? 'http://localhost:8080' : new URL(raw).origin;
    await page.context().grantPermissions(['camera'], { origin }).catch(() => undefined);
}

/**
 * يفعّل مسار كاميرا E2E داخل الماسح (data-hami-e2e-camera).
 * لا يستبدل كاميرا هاتف حقيقي.
 */
export async function installScannerCameraMock(page: Page) {
    await page.addInitScript(installScannerCameraInBrowser);
}

export async function applyScannerCameraMockOnPage(page: Page) {
    await page.evaluate(installScannerCameraInBrowser);
}

/** بطاقة المسح قد تكون مقصوصة في الخلاصة الافتراضية — يمرّر إليها بعد إغلاق التصنيف */
export async function expectRepositoryScanTitleVisible(modal: Locator, title: string): Promise<void> {
    const page = modal.page();
    const scroll = page.getByTestId('repository-feed-virtual-scroll');
    if ((await scroll.count()) > 0) {
        await scroll.evaluate((el) => {
            (el as HTMLElement).scrollTop = 0;
        }).catch(() => undefined);
    }
    const heading = modal.getByRole('heading', { name: title });
    await heading.scrollIntoViewIfNeeded().catch(() => undefined);
    if (await heading.isVisible().catch(() => false)) {
        await expect(heading).toBeVisible();
        return;
    }
    await clickRepositoryChrome(modal.getByTestId('repository-classification-toggle'));
    await clickRepositoryChrome(page.getByTestId('repository-filter-all'));
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('repository-classification-panel')).toBeHidden({
        timeout: 5_000,
    });
    await heading.scrollIntoViewIfNeeded().catch(() => undefined);
    await expect(heading).toBeVisible({ timeout: 15_000 });
}

/**
 * يضبط ملف منتقي النظام على إدخال المودال الظاهر.
 * يصفّر القيمة أولاً حتى يعيد Chromium إطلاق change إن بقي نفس الملف عالقاً.
 */
export async function assignRepositoryOsPickerFile(
    modal: Locator,
    inputTestId: 'repository-upload-image-input' | 'repository-upload-pdf-input',
    file: { name: string; mimeType: string; buffer: Buffer },
): Promise<Locator> {
    const page = modal.page();
    const input = modal.getByTestId(inputTestId);
    await input.waitFor({ state: 'attached', timeout: 10_000 });
    await input.evaluate((el) => {
        (el as HTMLInputElement).value = '';
    }, undefined, { timeout: 4_000 });
    await input.setInputFiles({
        name: file.name,
        mimeType: file.mimeType,
        buffer: file.buffer,
    });
    const overlay = page.getByTestId('vault-upload-meta-overlay');
    if (!(await overlay.isVisible().catch(() => false))) {
        await input.evaluate((el) => {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }, undefined, { timeout: 4_000 }).catch(() => undefined);
    }
    await expect(overlay).toBeVisible({ timeout: 15_000 });
    return overlay;
}

export async function completeScannerCaptureAndSave(scanner: Locator, title: string): Promise<void> {
    await clickRepositoryChrome(scanner.getByTestId('vault-scanner-capture'));
    await expect(scanner).toHaveAttribute('data-scan-phase', 'capturing', { timeout: 8_000 });
    await expect(scanner.getByTestId('vault-scanner-save')).toBeVisible({ timeout: 8_000 });
    await fillControlledTextInput(scanner.getByTestId('vault-scanner-title'), title);
    await clickRepositoryChrome(scanner.getByTestId('vault-scanner-save'));
    await expect(scanner).toHaveAttribute('data-scan-phase', 'result', { timeout: 20_000 });
    await expect(scanner.getByTestId('vault-scanner-saved')).toBeVisible({ timeout: 8_000 });
}
