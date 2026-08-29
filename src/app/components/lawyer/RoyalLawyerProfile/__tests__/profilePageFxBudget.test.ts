import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('profile android FX import site', () => {
    const root = resolve(__dirname, '../../../../../styles');
    const critical = readFileSync(resolve(root, 'critical-shell.css'), 'utf8');
    const deferred = readFileSync(resolve(root, 'deferred-app.css'), 'utf8');
    const profileFx = readFileSync(resolve(__dirname, '../profilePageFx.css'), 'utf8');
    const androidLoader = readFileSync(
        resolve(__dirname, '../../../../runtime/profileAndroidFxLoader.ts'),
        'utf8',
    );
    const shellBoot = readFileSync(
        resolve(__dirname, '../../../../runtime/capacitorShellBoot.ts'),
        'utf8',
    );
    const royalIndex = readFileSync(resolve(__dirname, '../index.tsx'), 'utf8');

    it('يبقي Android FX خارج برميل sync والـ critical/deferred البارد', () => {
        expect(profileFx).not.toContain('lawyerProfileFx-android.css');
        expect(deferred).not.toContain('lawyerProfileFx-android.css');
        expect(critical).not.toContain('lawyerProfileFx-android.css');
    });

    it('يحمّل Android FX عبر loader منصّي فقط', () => {
        expect(androidLoader).toContain('isAndroidNativeShell');
        expect(androidLoader).toContain('lawyerProfileFx-android.css');
        expect(shellBoot).toContain('profileAndroidFxLoader');
        expect(royalIndex).toContain('prefetchProfileAndroidFx');
    });
});

describe('profilePageFx.css barrel', () => {
    const css = readFileSync(resolve(__dirname, '../profilePageFx.css'), 'utf8');

    it('keeps hero/tokens/portrait/section sync — block CSS rides the custom-blocks chunk', () => {
        expect(css).toContain('profilePageTokensFx.css');
        expect(css).toContain('profilePageHeroFx.css');
        expect(css).toMatch(/@import\s+['"].*profilePortraitFrameFx/);
        expect(css).toMatch(/@import\s+['"].*profilePageSectionFx/);
        expect(css).not.toMatch(/@import\s+['"].*profilePageBlockFx/);
        expect(css).not.toMatch(/@import\s+['"].*profilePageEnterFx/);
        expect(css).not.toMatch(/@import\s+['"].*lawyerProfileFx-android/);
        expect(css).not.toMatch(/@import\s+['"].*profileChrome/);
        const body = readFileSync(
            resolve(__dirname, '../components/ProfileContentBodySections.tsx'),
            'utf8',
        );
        expect(body).not.toContain('profilePageSectionFx.css');
        expect(body).not.toContain('profilePageBlockFx.css');
        const blocks = readFileSync(
            resolve(__dirname, '../components/ProfileCustomBlocks.tsx'),
            'utf8',
        );
        expect(blocks).toContain('profilePageBlockFx.css');
    });
});
