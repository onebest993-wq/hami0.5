import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Header hide hardening', () => {
    it('uses visibility:hidden when shouldShow is false', () => {
        const src = readFileSync(
            resolve(__dirname, '../Header.tsx'),
            'utf8',
        );
        expect(src).toContain('ResizeObserver');
        expect(src).toContain("visibility: shouldShow ? 'visible' : 'hidden'");
        expect(src).toContain("data-header-visible={shouldShow ? 'true' : 'false'}");
        expect(src).toContain('fixed top-0');
        expect(src).toContain('HAMI_SHELL_CONTAINER');
        expect(src).not.toContain('fixed bottom-0');
        expect(src).not.toMatch(
            /visualViewport\?\.removeEventListener\('resize', syncOffset\);\s*clearPublishedLawyerHeaderOffset/,
        );
    });
});
