import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Header hide hardening', () => {
    it('uses visibility:hidden when shouldShow is false', () => {
        const src = readFileSync(
            resolve(__dirname, '../Header.tsx'),
            'utf8',
        );
        expect(src).toContain("visibility: shouldShow ? 'visible' : 'hidden'");
        expect(src).toContain("data-header-visible={shouldShow ? 'true' : 'false'}");
    });
});
