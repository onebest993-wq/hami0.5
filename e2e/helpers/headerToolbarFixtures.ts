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

export type HomeShellColumnMetrics = {
    navW: number;
    navX: number;
    gridW: number;
    gridX: number;
    cols: number;
};

export async function readHomeShellColumnMetrics(page: Page): Promise<HomeShellColumnMetrics | null> {
    return page.evaluate(() => {
        const navEl = document.querySelector('[data-testid="header-toolbar-nav"]');
        const gridEl = document.querySelector('[data-testid="home-main-grid"]');
        if (!(navEl instanceof HTMLElement) || !(gridEl instanceof HTMLElement)) return null;
        const n = navEl.getBoundingClientRect();
        const g = gridEl.getBoundingClientRect();
        return {
            navW: n.width,
            navX: n.x,
            gridW: g.width,
            gridX: g.x,
            cols: getComputedStyle(gridEl).gridTemplateColumns.trim().split(/\s+/).filter(Boolean)
                .length,
        };
    });
}

/** بعد فتح النجمة: الشريط داخل عمود اللوحة لا على عرض الشاشة */
export async function expectOpenHeaderMatchesHomeGrid(
    page: Page,
    bounds: { minNavW: number; maxNavW: number; cols: number; slop?: number },
): Promise<HomeShellColumnMetrics> {
    await revealHeaderToolbarTools(page);
    const metrics = await readHomeShellColumnMetrics(page);
    expect(metrics).not.toBeNull();
    const slop = bounds.slop ?? 20;
    expect(metrics?.cols).toBe(bounds.cols);
    expect(metrics?.navW ?? 0).toBeGreaterThan(bounds.minNavW);
    expect(metrics?.navW ?? 0).toBeLessThanOrEqual(bounds.maxNavW);
    expect(Math.abs((metrics?.navW ?? 0) - (metrics?.gridW ?? 0))).toBeLessThan(slop);
    expect(Math.abs((metrics?.navX ?? 0) - (metrics?.gridX ?? 0))).toBeLessThan(slop);

    const tools = await page.evaluate(() => {
        const grid = document.querySelector('[data-testid="home-main-grid"]');
        if (!(grid instanceof HTMLElement)) return [];
        const g = grid.getBoundingClientRect();
        return [
            'header-tools-reveal',
            'header-search-trigger',
            'header-notifications-trigger',
            'header-settings-trigger',
        ].map((id) => {
            const el = document.querySelector(`[data-testid="${id}"]`);
            if (!(el instanceof HTMLElement)) return { id, missing: true, left: 0, right: 0, gridLeft: g.x, gridRight: g.x + g.width };
            const r = el.getBoundingClientRect();
            return {
                id,
                missing: false,
                left: r.x,
                right: r.x + r.width,
                gridLeft: g.x,
                gridRight: g.x + g.width,
            };
        });
    });
    expect(tools).toHaveLength(4);
    for (const tool of tools) {
        expect(tool.missing, tool.id).toBe(false);
        expect(tool.left, tool.id).toBeGreaterThanOrEqual(tool.gridLeft - 4);
        expect(tool.right, tool.id).toBeLessThanOrEqual(tool.gridRight + 4);
    }

    return metrics as HomeShellColumnMetrics;
}

