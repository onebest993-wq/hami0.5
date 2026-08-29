/**
 * هندسة عمود الرئيسية من CSS الحرج وحده — بلا إقلاع/تسجيل دخول.
 *
 * النطاق: ما يملكه `lawyerHomeFx-critical.css` فعلاً — عرض العمود
 * (`--hami-shell-max-width` + `.hami-shell-container` + `.hami-shell-gutter-x`)،
 * أعمدة الشبكة ومداها، عرض شريط الأدوات المفتوح، وارتفاع مقعد البطاقة الفارغ.
 *
 * خارج النطاق عمداً: تثبيت الهيدر و`flex` و`w-full` للبلاطات — مصدرها Tailwind
 * داخل المكوّنات، وحقنها هنا كان يجعل الاختبار يفحص ما يكتبه بنفسه. تغطيتها
 * الحقيقية في `header-toolbar.spec.ts` على DOM حيّ.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

let cachedCriticalCss: string | null = null;

/** القراءة كسولة — قراءة على مستوى الوحدة تُسقِط تجميع البوابة كلها لو اختلف cwd */
function criticalCss(): string {
    cachedCriticalCss ??= readFileSync(
        resolve(process.cwd(), 'src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css'),
        'utf8',
    );
    return cachedCriticalCss;
}

/**
 * ما يقدّمه Tailwind preflight في التطبيق — ليس محل الفحص، لكن حساب العرض
 * لا يصحّ بدونه.
 */
const PREFLIGHT = `
*, *::before, *::after { box-sizing: border-box; }
html { font-size: 16px; }
body { margin: 0; }
`;

const SHELL_MARKUP = `<!doctype html>
<html dir="rtl" lang="ar">
  <body>
    <div data-hami-lawyer-dashboard="">
      <header class="hami-lawyer-header hami-shell-gutter-x">
        <div class="hami-shell-container">
          <nav data-testid="header-toolbar-nav" data-hami-tools-open="1">
            <button type="button">كشف</button>
            <button type="button">بحث</button>
          </nav>
        </div>
      </header>
      <div class="hami-home-main-zone hami-shell-gutter-x">
        <div class="hami-shell-container">
          <div data-testid="home-main-grid">
            <div data-hami-layout-span="2">
              <section data-testid="home-hub-card"></section>
            </div>
            <div data-hami-layout-span="1"></div>
            <div data-hami-layout-span="1"></div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;

type ShellMetrics = {
    navW: number;
    navX: number;
    gridW: number;
    gridX: number;
    hubH: number;
    cols: number;
    span: string;
};

async function mountHomeShell(page: Page): Promise<ShellMetrics> {
    await page.setContent(SHELL_MARKUP);
    await page.addStyleTag({ content: `${criticalCss()}\n${PREFLIGHT}` });

    const metrics = await page.evaluate(() => {
        const nav = document.querySelector('[data-testid="header-toolbar-nav"]');
        const grid = document.querySelector('[data-testid="home-main-grid"]');
        const hub = document.querySelector('[data-testid="home-hub-card"]');
        const span2 = document.querySelector('[data-hami-layout-span="2"]');
        if (
            !(nav instanceof HTMLElement) ||
            !(grid instanceof HTMLElement) ||
            !(hub instanceof HTMLElement) ||
            !(span2 instanceof HTMLElement)
        ) {
            return null;
        }
        const n = nav.getBoundingClientRect();
        const g = grid.getBoundingClientRect();
        return {
            navW: n.width,
            navX: n.x,
            gridW: g.width,
            gridX: g.x,
            hubH: hub.getBoundingClientRect().height,
            cols: getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).filter(Boolean)
                .length,
            span: getComputedStyle(span2).gridColumn,
        };
    });
    expect(metrics).not.toBeNull();
    return metrics as ShellMetrics;
}

/** بلا شريط تمرير في هذه الصفحة الساكنة — العمودان متطابقان تماماً */
function expectHeaderColumnEqualsGrid(m: ShellMetrics): void {
    expect(Math.abs(m.navW - m.gridW), 'عرض شريط الأدوات = عرض عمود الشبكة').toBeLessThanOrEqual(1);
    expect(Math.abs(m.navX - m.gridX), 'بداية شريط الأدوات = بداية عمود الشبكة').toBeLessThanOrEqual(
        1,
    );
}

test.describe('هندسة عمود الرئيسية', () => {
    test.describe.configure({ timeout: 20_000 });
    /* حساب CSS خالص — لا قيمة من تكراره على كل محرّك، والتكرار يضاعف الهشاشة */
    test.skip(({ browserName }) => browserName !== 'chromium', 'chromium يكفي لحساب CSS');

    test('على 1440px: ثلاثة أعمدة، وعمود الهيدر بسقف 800px', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        const m = await mountHomeShell(page);

        expect(m.cols).toBe(3);
        expect(m.span).toMatch(/span 3/);
        expect(m.navW).toBeGreaterThan(520);
        expect(m.navW).toBeLessThanOrEqual(800);
        expectHeaderColumnEqualsGrid(m);
        expect(m.hubH, 'مقعد البطاقة محجوز ضد القفز').toBeGreaterThanOrEqual(108);
    });

    test('على 1024px: ثلاثة أعمدة داخل سقف 640px', async ({ page }) => {
        await page.setViewportSize({ width: 1024, height: 768 });
        const m = await mountHomeShell(page);

        expect(m.cols).toBe(3);
        expect(m.span).toMatch(/span 3/);
        expect(m.navW).toBeGreaterThan(480);
        expect(m.navW).toBeLessThanOrEqual(640);
        expectHeaderColumnEqualsGrid(m);
    });

    test('على 390px: عمودان، وشريط الأدوات يملأ عرض العمود', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        const m = await mountHomeShell(page);

        expect(m.cols).toBe(2);
        expect(m.span).toMatch(/span 2/);
        expect(m.navW).toBeGreaterThan(280);
        expect(m.navW).toBeLessThan(390);
        expectHeaderColumnEqualsGrid(m);
        expect(m.hubH, 'مقعد البطاقة محجوز ضد القفز').toBeGreaterThanOrEqual(108);
    });
});
