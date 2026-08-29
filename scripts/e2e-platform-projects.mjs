#!/usr/bin/env node
/**
 * مشاريع Playwright المتاحة فعلياً — يتخطى محركاً إن لم يُثبَّت.
 */
import { existsSync } from 'node:fs';

async function browserAvailable(name) {
    try {
        const playwright = await import('playwright');
        const browserType = playwright[name];
        if (!browserType?.executablePath) return false;
        return existsSync(browserType.executablePath());
    } catch {
        return false;
    }
}

/**
 * @param {{ allPlatforms?: boolean, includeDesktopExtras?: boolean, logPrefix?: string }} opts
 * @returns {Promise<string[]>} playwright --project flags
 */
export async function resolveE2ePlatformProjects({
    allPlatforms = false,
    includeDesktopExtras = false,
    logPrefix = '[e2e]',
} = {}) {
    if (!allPlatforms) {
        return ['--project=chromium'];
    }

    const projects = ['chromium', 'mobile-chrome', 'tablet-ipad'];

    if (await browserAvailable('webkit')) {
        projects.push('mobile-safari');
        if (includeDesktopExtras) projects.push('webkit');
    } else {
        console.warn(`${logPrefix} تخطي WebKit / mobile-safari — شغّل: npx playwright install webkit`);
    }

    if (includeDesktopExtras) {
        if (await browserAvailable('firefox')) {
            projects.push('firefox');
        } else {
            console.warn(`${logPrefix} تخطي firefox — شغّل: npx playwright install firefox`);
        }
    }

    return [...new Set(projects)].map((name) => `--project=${name}`);
}

/**
 * @param {{ allPlatforms?: boolean }} opts
 * @returns {Promise<string[]>}
 */
export async function resolveGlobalSearchE2eProjects({ allPlatforms = false } = {}) {
    return resolveE2ePlatformProjects({
        allPlatforms,
        includeDesktopExtras: false,
        logPrefix: '[global-search-e2e]',
    });
}
