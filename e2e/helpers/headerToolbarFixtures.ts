import { expect, type Page } from '@playwright/test';

export async function revealHeaderToolbarTools(page: Page): Promise<void> {
    const nav = page.getByTestId('header-toolbar-nav');
    await expect(nav).toBeVisible({ timeout: 20_000 });
    await expect(async () => {
        if ((await nav.getAttribute('data-hami-tools-open')) !== '1') {
            const reveal = page.getByTestId('header-tools-reveal');
            await expect(reveal).toBeVisible({ timeout: 5_000 });
            await reveal.evaluate((el) => {
                if (el instanceof HTMLElement) el.click();
            });
        }
        await expect(nav).toHaveAttribute('data-hami-tools-open', '1', { timeout: 4_000 });
        await expect(page.getByTestId('header-settings-trigger')).toBeVisible({ timeout: 4_000 });
    }).toPass({ timeout: 20_000 });
}

export async function expectHeaderToolbarCollapsed(page: Page): Promise<void> {
    await expect(page.getByTestId('header-toolbar-nav')).toHaveAttribute('data-hami-tools-open', '0');
    await expect(page.getByTestId('header-toolbar-tools')).toBeHidden();
}

const HEADER_TOOL_IDS = [
    'header-tools-reveal',
    'header-search-trigger',
    'header-notifications-trigger',
    'header-settings-trigger',
] as const;

export type HomeShellColumnMetrics = {
    navW: number;
    navX: number;
    gridW: number;
    gridX: number;
    cols: number;
    /** عرض مزراب شريط التمرير المحجوز في جذر تمرير الرئيسية — 0 على الأصل */
    scrollGutter: number;
    tools: { id: string; left: number; right: number }[];
};

export async function readHomeShellColumnMetrics(page: Page): Promise<HomeShellColumnMetrics | null> {
    return page.evaluate((toolIds: readonly string[]) => {
        const navEl = document.querySelector('[data-testid="header-toolbar-nav"]');
        const gridEl = document.querySelector('[data-testid="home-main-grid"]');
        if (!(navEl instanceof HTMLElement) || !(gridEl instanceof HTMLElement)) return null;
        const scroller = document.querySelector('.hami-home-scroll-root');
        const n = navEl.getBoundingClientRect();
        const g = gridEl.getBoundingClientRect();
        return {
            navW: n.width,
            navX: n.x,
            gridW: g.width,
            gridX: g.x,
            cols: getComputedStyle(gridEl).gridTemplateColumns.trim().split(/\s+/).filter(Boolean)
                .length,
            scrollGutter:
                scroller instanceof HTMLElement ? scroller.offsetWidth - scroller.clientWidth : 0,
            tools: toolIds.flatMap((id) => {
                const el = document.querySelector(`[data-testid="${id}"]`);
                if (!(el instanceof HTMLElement)) return [];
                const r = el.getBoundingClientRect();
                return [{ id, left: r.x, right: r.x + r.width }];
            }),
        };
    }, HEADER_TOOL_IDS);
}

/**
 * بعد فتح النجمة: الشريط بعرض عمود اللوحة، لا على عرض الشاشة.
 *
 * الفرق المسموح مشتقّ من مزراب التمرير لا من رقم مُختار: الهيدر `position: fixed`
 * على عرض النافذة كاملاً، بينما الشبكة داخل `.hami-home-scroll-root` وله
 * `scrollbar-gutter: stable`. فوق نقطة تقييد `--hami-shell-max-width` يتقاسم
 * التوسيط المزراب (نصفه)، وتحتها يبتلعه العمود كاملاً. على الأصل
 * (`data-hami-native='1'`) المزراب صفر — فيُطلب تطابق تام.
 */
export async function expectOpenHeaderMatchesHomeGrid(
    page: Page,
    bounds: { minNavW: number; maxNavW: number; cols: number },
): Promise<HomeShellColumnMetrics> {
    await revealHeaderToolbarTools(page);
    const metrics = await readHomeShellColumnMetrics(page);
    expect(metrics).not.toBeNull();
    const m = metrics as HomeShellColumnMetrics;
    const tolerance = m.scrollGutter + 1;

    expect(m.cols).toBe(bounds.cols);
    expect(m.navW).toBeGreaterThan(bounds.minNavW);
    expect(m.navW).toBeLessThanOrEqual(bounds.maxNavW);
    expect(m.navW, 'الشريط لا يضيق عن عمود الشبكة').toBeGreaterThanOrEqual(m.gridW - 1);
    expect(
        m.navW,
        `الشريط أوسع من عمود الشبكة بأكثر من مزراب التمرير (${m.scrollGutter}px)`,
    ).toBeLessThanOrEqual(m.gridW + tolerance);
    expect(
        Math.abs(m.navX - m.gridX),
        `إزاحة أفقية أكبر من مزراب التمرير (${m.scrollGutter}px)`,
    ).toBeLessThanOrEqual(tolerance);

    expect(m.tools.map((tool) => tool.id)).toEqual([...HEADER_TOOL_IDS]);
    for (const tool of m.tools) {
        expect(tool.left, tool.id).toBeGreaterThanOrEqual(m.gridX - 4);
        expect(tool.right, tool.id).toBeLessThanOrEqual(m.gridX + m.gridW + 4);
    }

    return m;
}

