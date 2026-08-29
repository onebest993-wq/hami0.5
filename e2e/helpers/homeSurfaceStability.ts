import type { Page } from '@playwright/test';
import {
    evaluateHomeSurfaceStability,
    type HomeSurfaceStabilityProbe,
    type HomeSurfaceStabilityVerdict,
} from '@/app/services/alerts/homeSurfaceStabilityGate';

const SAMPLE_MS = 1100;

type ProbeInstallOptions = { sampleMs: number };

function installHomeSurfaceStabilityProbeInBrowser({ sampleMs }: ProbeInstallOptions): void {
    const w = window as Window & {
        __hamiHomeSurfaceStability?: {
            firstHubVisibleAt: number | null;
            layoutShifts: Array<{
                value: number;
                startTime: number;
                hadRecentInput: boolean;
                affectsHomeSurface: boolean;
            }>;
            frames: Array<{
                t: number;
                hub: { present: boolean; x: number; y: number; w: number; h: number };
                grid: { present: boolean; x: number; y: number; w: number; h: number };
                header: { present: boolean; x: number; y: number; w: number; h: number };
            }>;
        };
    };
    if (w.__hamiHomeSurfaceStability) return;

    const selectors = {
        hub: '[data-testid="home-hub-card"], [data-testid="home-hub-card-skeleton"]',
        grid: '[data-testid="home-main-grid"]',
        header: '.hami-lawyer-header',
    };

    const probe = {
        firstHubVisibleAt: null as number | null,
        layoutShifts: [] as NonNullable<typeof w.__hamiHomeSurfaceStability>['layoutShifts'],
        frames: [] as NonNullable<typeof w.__hamiHomeSurfaceStability>['frames'],
    };
    w.__hamiHomeSurfaceStability = probe;

    const isHomeSurfaceNode = (node: Node | null): boolean => {
        if (!(node instanceof Element)) return false;
        return Boolean(
            node.closest('[data-testid="home-main-grid"]') ||
                node.closest('[data-testid="home-hub-card"]') ||
                node.closest('[data-testid="home-hub-card-skeleton"]') ||
                node.closest('[data-testid="home-main-zone"]') ||
                node.closest('.hami-lawyer-header') ||
                node.closest('[data-testid="home-bottom-chrome"]'),
        );
    };

    try {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                const shift = entry as PerformanceEntry & {
                    value?: number;
                    hadRecentInput?: boolean;
                    sources?: Array<{ node?: Node | null }>;
                };
                const sources = shift.sources ?? [];
                const affectsHomeSurface =
                    sources.length === 0 || sources.some((source) => isHomeSurfaceNode(source.node ?? null));
                probe.layoutShifts.push({
                    value: shift.value ?? 0,
                    startTime: entry.startTime,
                    hadRecentInput: shift.hadRecentInput === true,
                    affectsHomeSurface,
                });
            }
        });
        observer.observe({ type: 'layout-shift', buffered: true });
    } catch {
        /* layout-shift unsupported */
    }

    const snapshot = (selector: string) => {
        const el = document.querySelector(selector);
        if (!(el instanceof HTMLElement)) {
            return { present: false, x: 0, y: 0, w: 0, h: 0 };
        }
        const rect = el.getBoundingClientRect();
        return {
            present: true,
            x: Math.round(rect.x * 100) / 100,
            y: Math.round(rect.y * 100) / 100,
            w: Math.round(rect.width * 100) / 100,
            h: Math.round(rect.height * 100) / 100,
        };
    };

    const tick = (ts: number) => {
        const hub = snapshot(selectors.hub);
        if (hub.present && hub.w > 0 && hub.h > 0 && probe.firstHubVisibleAt == null) {
            probe.firstHubVisibleAt = ts;
        }
        if (probe.firstHubVisibleAt != null) {
            probe.frames.push({
                t: ts,
                hub,
                grid: snapshot(selectors.grid),
                header: snapshot(selectors.header),
            });
        }
        const elapsed = probe.firstHubVisibleAt == null ? 0 : ts - probe.firstHubVisibleAt;
        if (elapsed < sampleMs) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

/** يُزرع قبل goto حتى تُلتقط إزاحات أول ظهور للبطاقة */
export async function installHomeSurfaceStabilityProbe(page: Page): Promise<void> {
    await page.addInitScript(installHomeSurfaceStabilityProbeInBrowser, { sampleMs: SAMPLE_MS });
}

/**
 * يعيد أخذ العينات بعد استقرار الإقلاع — القياس «بعد الكشف» لا يشمل
 * انهيار الهيكل 240px → البطاقة الفارغة عند data-hub-boot-settling=0.
 */
export async function restartHomeSurfaceStabilityProbe(page: Page): Promise<void> {
    await page.evaluate((sampleMs: number) => {
        const w = window as Window & {
            __hamiHomeSurfaceStability?: HomeSurfaceStabilityProbe;
        };
        const probe = w.__hamiHomeSurfaceStability;
        if (!probe) return;
        probe.firstHubVisibleAt = null;
        probe.layoutShifts.length = 0;
        probe.frames.length = 0;

        const selectors = {
            hub: '[data-testid="home-hub-card"], [data-testid="home-hub-card-skeleton"]',
            grid: '[data-testid="home-main-grid"]',
            header: '.hami-lawyer-header',
        };
        const snapshot = (selector: string) => {
            const el = document.querySelector(selector);
            if (!(el instanceof HTMLElement)) {
                return { present: false, x: 0, y: 0, w: 0, h: 0 };
            }
            const rect = el.getBoundingClientRect();
            return {
                present: true,
                x: Math.round(rect.x * 100) / 100,
                y: Math.round(rect.y * 100) / 100,
                w: Math.round(rect.width * 100) / 100,
                h: Math.round(rect.height * 100) / 100,
            };
        };
        const tick = (ts: number) => {
            const hub = snapshot(selectors.hub);
            if (hub.present && hub.w > 0 && hub.h > 0 && probe.firstHubVisibleAt == null) {
                probe.firstHubVisibleAt = ts;
            }
            if (probe.firstHubVisibleAt != null) {
                probe.frames.push({
                    t: ts,
                    hub,
                    grid: snapshot(selectors.grid),
                    header: snapshot(selectors.header),
                });
            }
            const elapsed = probe.firstHubVisibleAt == null ? 0 : ts - probe.firstHubVisibleAt;
            if (elapsed < sampleMs) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, SAMPLE_MS);
}

export async function collectHomeSurfaceStability(
    page: Page,
    minSampleMs = SAMPLE_MS,
): Promise<HomeSurfaceStabilityProbe> {
    await page.waitForFunction(
        (ms) => {
            const probe = (window as Window & { __hamiHomeSurfaceStability?: HomeSurfaceStabilityProbe })
                .__hamiHomeSurfaceStability;
            if (probe == null || probe.firstHubVisibleAt == null) return false;
            const last = probe.frames.at(-1);
            return last != null && last.t - probe.firstHubVisibleAt >= ms;
        },
        minSampleMs,
        { timeout: 20_000 },
    );

    const probe = await page.evaluate(() => {
        return (window as Window & { __hamiHomeSurfaceStability?: HomeSurfaceStabilityProbe })
            .__hamiHomeSurfaceStability;
    });
    if (!probe) {
        return { firstHubVisibleAt: null, layoutShifts: [], frames: [] };
    }
    return probe;
}

export async function measureHomeSurfaceStability(page: Page): Promise<HomeSurfaceStabilityVerdict> {
    const probe = await collectHomeSurfaceStability(page);
    return evaluateHomeSurfaceStability(probe);
}
