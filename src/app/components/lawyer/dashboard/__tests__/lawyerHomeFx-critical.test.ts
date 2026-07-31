import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('lawyerHomeFx-critical', () => {
    const css = readFileSync(
        resolve(__dirname, '../lawyerHomeFx-critical.css'),
        'utf8',
    );

    it('يتضمن قواعد rim/accent اللازمة لأول رسم بلا FOUC', () => {
        expect(css).toContain('.hami-sovereign-rim');
        expect(css).toContain('.hami-sovereign-glass::before');
        expect(css).toContain('[data-hami-block].hami-sovereign-glass');
        expect(css).toContain('hami-home-block-solid');
        expect(css).toContain('data-hami-home-container-border');
        expect(css).toContain('.hami-forum-overlay-layer');
        expect(css).toContain('.hami-forum-overlay-layer--visible');
        expect(css).toContain('hami-dashboard-tab-preserve');
        expect(css).toContain('.hami-below-lawyer-header');
        expect(css).toContain('--hami-lawyer-header-offset');
        expect(css).toContain('.hami-forum-overlay-layer');
        expect(css).toContain('[data-testid=\'forum-screen-loading\']');
        expect(css).toContain('#0a0f1c');
        expect(css).not.toMatch(/\.hami-sovereign-glass\s*\{[^}]*transition:/s);
    });
});
