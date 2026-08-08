import { describe, expect, it, beforeEach } from 'vitest';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '../defaults';
import { glassTransparencyToOpacity } from '../glassTransparency';
import { syncDashboardBlockGlassPaint } from '../syncDashboardBlockGlassPaint';

describe('syncDashboardBlockGlassPaint', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div data-hami-lawyer-dashboard>
                <button data-hami-block="hubLawsuit" class="hami-sovereign-glass"
                    style="--hami-block-surface-bg: rgb(30, 35, 45);"></button>
            </div>
        `;
        document.documentElement.style.setProperty('--hami-board-surface-bg', '#0A0F1C');
        document.documentElement.dataset.hamiWallpaper = '0';
        delete document.documentElement.dataset.hamiNative;
        delete document.documentElement.dataset.hamiPlatform;
    });

    it('يحدّث --hami-glass-panel-bg على كل بطاقة بلا background-color inline', () => {
        const light = {
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            appearance: {
                ...LAWYER_SETTINGS_V2_DEFAULTS.appearance,
                glassOpacity: glassTransparencyToOpacity('light'),
            },
        };
        syncDashboardBlockGlassPaint(light);

        const tile = document.querySelector<HTMLElement>('[data-hami-block="hubLawsuit"]')!;
        const lightPanel = tile.style.getPropertyValue('--hami-glass-panel-bg');
        expect(lightPanel).toMatch(/^rgba?\(/);
        expect(tile.style.backgroundColor).toBe('');

        const clear = {
            ...light,
            appearance: {
                ...light.appearance,
                glassOpacity: glassTransparencyToOpacity('clear'),
            },
        };
        syncDashboardBlockGlassPaint(clear);

        const clearPanel = tile.style.getPropertyValue('--hami-glass-panel-bg');
        expect(clearPanel).not.toBe(lightPanel);
        expect(tile.style.getPropertyValue('--glass-opacity')).toBe('0.85');
    });
});
