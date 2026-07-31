import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('profileChrome.css', () => {
    const css = readFileSync(resolve(__dirname, '../profileChrome.css'), 'utf8');

    it('يثبّت خلفية الملف وزر الرجوع لأول إطار', () => {
        expect(css).toContain('--profile-page-bg: #020408');
        expect(css).toContain('.hami-profile-instant-shell');
        expect(css).toContain('.hami-profile-instant-back-btn');
        expect(css).toContain("lawyer-dashboard-profile-surface");
    });
});
