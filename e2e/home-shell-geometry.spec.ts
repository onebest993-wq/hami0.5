/**
 * هندسة عمود الرئيسية من CSS الحرج — بلا إقلاع/تسجيل دخول.
 * يغلق قياس الهيدر والشبكة على عروض الهاتف والشاشة العريضة.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const criticalCss = readFileSync(
    resolve(process.cwd(), 'src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css'),
    'utf8',
);

const SHELL_MARKUP = `<!doctype html>
<html dir="rtl" lang="ar">
  <body>
    <div data-hami-lawyer-dashboard="">
      <header class="hami-lawyer-header hami-shell-gutter-x" data-testid="geometry-header">
        <div class="hami-shell-container">
          <nav data-testid="header-toolbar-nav" data-hami-tools-open="1">
            <button type="button" data-testid="header-tools-reveal">كشف</button>
            <div class="hami-header-tool-actions">
              <button type="button">بحث</button>
              <button type="button">تنبيه</button>
              <button type="button">إعداد</button>
            </div>
          </nav>
        </div>
      </header>
      <div class="hami-home-main-zone hami-shell-gutter-x">
        <div class="hami-shell-container">
          <div data-testid="home-main-grid">
            <div data-hami-layout-span="2">
              <section data-testid="home-hub-card"></section>
            </div>
            <div data-hami-layout-span="1">
              <button type="button" data-hami-block="dockRepository">
                <div class="hami-hub-tile-face">
                  <p class="hami-hub-title hami-hub-title--half-fill">المستودع</p>
                </div>
              </button>
            </div>
            <div data-hami-layout-span="1">
              <button type="button" data-hami-block="dockTasks">
                <div class="hami-hub-tile-face">
                  <p class="hami-hub-title hami-hub-title--half-fill hami-hub-title--half-compact">المعاملات</p>
                </div>
              </button>
            </div>
            <div data-hami-layout-span="1"></div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;

async function mountHomeShell(page: Page): Promise<void> {
    await page.setContent(SHELL_MARKUP);
    await page.addStyleTag({
        content: `${criticalCss}
*, *::before, *::after { box-sizing: border-box; }
html { font-size: 16px; }
body { margin: 0; }
.hami-lawyer-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
[data-testid='header-toolbar-nav'] { display: flex; }
[data-hami-layout-span='1'] > * { width: 100%; }
`,
    });
}

async function readShellMetrics(page: Page) {
    return page.evaluate(() => {
        const nav = document.querySelector('[data-testid="header-toolbar-nav"]');
        const grid = document.querySelector('[data-testid="home-main-grid"]');
        const hub = document.querySelector('[data-testid="home-hub-card"]');
        if (!(nav instanceof HTMLElement) || !(grid instanceof HTMLElement) || !(hub instanceof HTMLElement)) {
            return null;
        }
        const n = nav.getBoundingClientRect();
        const g = grid.getBoundingClientRect();
        const h = hub.getBoundingClientRect();
        return {
            navW: n.width,
            navX: n.x,
            gridW: g.width,
            gridX: g.x,
            hubH: h.height,
            cols: getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).filter(Boolean)
                .length,
            span: getComputedStyle(grid.querySelector('[data-hami-layout-span="2"]') as HTMLElement)
                .gridColumn,
            titleOverflow: Array.from(grid.querySelectorAll('.hami-hub-title--half-fill')).map(
                (el) => {
                    const node = el as HTMLElement;
                    return {
                        text: node.textContent,
                        overflow: node.scrollWidth - node.clientWidth,
                    };
                },
            ),
        };
    });
}

test.describe('هندسة عمود الرئيسية', () => {
    test.describe.configure({ timeout: 20_000 });

    test('على 1440px: ثلاثة أعمدة، والأدوات المفتوحة داخل عمود اللوحة', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await mountHomeShell(page);
        const metrics = await readShellMetrics(page);
        expect(metrics).not.toBeNull();
        expect(metrics?.cols).toBe(3);
        expect(metrics?.span).toMatch(/span 3/);
        expect(metrics?.navW ?? 0).toBeGreaterThan(520);
        expect(metrics?.navW ?? 0).toBeLessThanOrEqual(800);
        expect(Math.abs((metrics?.navW ?? 0) - (metrics?.gridW ?? 0))).toBeLessThan(2);
        expect(Math.abs((metrics?.navX ?? 0) - (metrics?.gridX ?? 0))).toBeLessThan(2);
        expect(metrics?.hubH ?? 0).toBeGreaterThanOrEqual(108);
    });

    test('على 390px: عمودان، وشريط الأدوات يملأ عرض العمود', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await mountHomeShell(page);
        const metrics = await readShellMetrics(page);
        expect(metrics).not.toBeNull();
        expect(metrics?.cols).toBe(2);
        expect(metrics?.span).toMatch(/span 2/);
        expect(metrics?.navW ?? 0).toBeGreaterThan(280);
        expect(metrics?.navW ?? 0).toBeLessThan(390);
        expect(Math.abs((metrics?.navW ?? 0) - (metrics?.gridW ?? 0))).toBeLessThan(2);
        expect(Math.abs((metrics?.navX ?? 0) - (metrics?.gridX ?? 0))).toBeLessThan(2);
        expect(metrics?.hubH ?? 0).toBeGreaterThanOrEqual(108);
    });

    test('على 1024px: ثلاثة أعمدة داخل سقف 640px', async ({ page }) => {
        await page.setViewportSize({ width: 1024, height: 768 });
        await mountHomeShell(page);
        const metrics = await readShellMetrics(page);
        expect(metrics).not.toBeNull();
        expect(metrics?.cols).toBe(3);
        expect(metrics?.span).toMatch(/span 3/);
        expect(metrics?.navW ?? 0).toBeGreaterThan(480);
        expect(metrics?.navW ?? 0).toBeLessThanOrEqual(640);
        expect(Math.abs((metrics?.navW ?? 0) - (metrics?.gridW ?? 0))).toBeLessThan(2);
        expect(Math.abs((metrics?.navX ?? 0) - (metrics?.gridX ?? 0))).toBeLessThan(2);
        for (const title of metrics?.titleOverflow ?? []) {
            expect(title.overflow, title.text ?? '').toBeLessThanOrEqual(1);
        }
    });
});
