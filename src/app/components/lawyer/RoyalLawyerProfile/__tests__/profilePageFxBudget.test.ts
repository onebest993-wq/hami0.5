import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('profile android FX import site', () => {
    const root = resolve(__dirname, '../../../../../styles');
    const critical = readFileSync(resolve(root, 'critical-shell.css'), 'utf8');
    const deferred = readFileSync(resolve(root, 'deferred-app.css'), 'utf8');

    it('loads lawyerProfileFx-android with profilePageFx لا deferred-app البارد', () => {
        const profileFx = readFileSync(resolve(__dirname, '../profilePageFx.css'), 'utf8');
        expect(profileFx).toContain('lawyerProfileFx-android.css');
        expect(deferred).not.toContain('lawyerProfileFx-android.css');
        expect(critical).not.toContain('lawyerProfileFx-android.css');
    });
});

describe('profilePageFx.css barrel', () => {
    const css = readFileSync(resolve(__dirname, '../profilePageFx.css'), 'utf8');

    it('keeps hero/tokens sync and syncs section/block/portrait to prevent FOUC', () => {
        expect(css).toContain('profilePageTokensFx.css');
        expect(css).toContain('profilePageHeroFx.css');
        expect(css).toMatch(/@import\s+['"].*profilePageSectionFx/);
        expect(css).toMatch(/@import\s+['"].*profilePageBlockFx/);
        expect(css).toMatch(/@import\s+['"].*profilePortraitFrameFx/);
        expect(css).not.toMatch(/@import\s+['"].*profilePageEnterFx/);
    });
});
