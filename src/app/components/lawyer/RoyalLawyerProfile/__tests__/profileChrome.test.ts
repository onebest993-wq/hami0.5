import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('profileChrome.css', () => {
    const css = readFileSync(resolve(__dirname, '../profileChrome.css'), 'utf8');
    const critical = readFileSync(resolve(__dirname, '../../../../../styles/critical-shell.css'), 'utf8');
    const surfaceSrc = readFileSync(
        resolve(__dirname, '../components/ProfilePageSurfaceFrame.tsx'),
        'utf8',
    );
    const fxCss = readFileSync(resolve(__dirname, '../profilePageFx.css'), 'utf8');

    it('يثبّت خلفية الملف وصف الكروم العلوي لأول إطار', () => {
        expect(css).toContain('--profile-page-bg: #020408');
        expect(css).not.toContain('.hami-profile-instant-shell');
        expect(css).not.toContain('.hami-header-profile-avatar-warming');
        expect(css).toContain('.hami-profile-chrome-header');
        expect(css).toContain("lawyer-dashboard-profile-surface");
    });

    it('يُحمَّل من برميل الملف لا من critical-shell', () => {
        expect(critical).not.toContain('profileChrome.css');
        expect(surfaceSrc).toMatch(/import\s+['"][^'"]*profileChrome\.css['"]/);
        expect(fxCss).not.toMatch(/@import\s+['"].*profileChrome/);
    });
});
