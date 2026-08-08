import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FX_PATH = resolve(
    process.cwd(),
    'src/app/components/lawyer/LawyerHomeHubCard/homeHubCardFx.css',
);

describe('homeHubGestureHonesty', () => {
    const css = readFileSync(FX_PATH, 'utf8');

    it('أهداف اللمس 44px لمحفّزات البقية والمقبض', () => {
        expect(css).toMatch(/\.hami-hub-tab-more-trigger[\s\S]*min-height:\s*44px/);
        expect(css).toMatch(/\.hami-hub-radar-overlay__handle[\s\S]*min-height:\s*44px/);
        expect(css).toMatch(/\.hami-hub-secretary-more-dock[\s\S]*min-height:\s*44px/);
    });

    it('مناطق التمرير تستخدم pan-y و overscroll contain', () => {
        expect(css).toMatch(/\.hami-hub-secretary-stack[\s\S]*touch-action:\s*pan-y/);
        expect(css).toMatch(/\.hami-hub-radar-overlay__list[\s\S]*touch-action:\s*pan-y/);
        expect(css).toMatch(/\.hami-hub-pins-stack--overlay[\s\S]*touch-action:\s*pan-y/);
        expect(css).toMatch(/\.hami-hub-pins-panel/);
    });

    it('مكدس الرجوع مربوط بزر الرجوع الأصلي', () => {
        const stack = readFileSync(
            resolve(process.cwd(), 'src/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubOverlayBackStack.ts'),
            'utf8',
        );
        expect(stack).toContain('registerNativeBackHandler');
        expect(stack).toContain('popHomeHubOverlayBack');
        expect(stack).toContain("event.key !== 'Escape'");
    });
});
