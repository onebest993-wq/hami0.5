import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const loaderPath = path.join(__dirname, '..', 'criminalDashboardLoader.ts');

describe('criminalDashboardLoader first-open contract', () => {
    it('لا يُسخّن cassation/trial/procedural من idle بعد الـ store', () => {
        const source = fs.readFileSync(loaderPath, 'utf8');
        expect(source).toContain('prefetchCriminalPartiesGrid');
        expect(source).toContain('prefetchCriminalHeavyEnginesOnIntent');

        const storePrefetchBlock = source.slice(
            source.indexOf('function prefetchCriminalStore'),
            source.indexOf('function createCriminalModuleImport'),
        );
        expect(storePrefetchBlock).not.toContain('trialSessionsEngine');
        expect(storePrefetchBlock).not.toContain('cassationEngine');
        expect(storePrefetchBlock).not.toContain('proceduralContainersEngine');
    });

    it('chrome warm لا يحمّل الـ dashboard الكامل ولا المحركات الثقيلة', () => {
        const source = fs.readFileSync(loaderPath, 'utf8');
        const chromeWarmBlock = source.slice(
            source.indexOf('export function prefetchCriminalDashboardChromeWarm'),
            source.indexOf('export function prefetchCriminalHeavyEnginesOnIntent'),
        );
        expect(chromeWarmBlock).toContain('CriminalDashboardBootChrome');
        expect(chromeWarmBlock).not.toContain('createCriminalModuleImport');
        expect(chromeWarmBlock).not.toContain('cassationEngine');
        expect(chromeWarmBlock).not.toContain('trialSessionsEngine');
    });
});
