import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    SETTINGS_INTERACTIVE_FALLBACK_MS,
    SETTINGS_PERF_BUDGET,
} from '@/app/services/settings/settingsPerfBudget';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('settings performance close honesty', () => {
    it('علامة interactive لا تنتظر 1200ms والميزانية أضيق من الإغلاق السابق', () => {
        expect(SETTINGS_INTERACTIVE_FALLBACK_MS).toBeLessThanOrEqual(180);
        expect(SETTINGS_PERF_BUDGET.openToInteractiveMs.target).toBeLessThanOrEqual(800);
        expect(SETTINGS_PERF_BUDGET.openToInteractiveMs.ciCachedMax).toBeLessThanOrEqual(2_000);
        expect(SETTINGS_PERF_BUDGET.openToInteractiveMs.ciColdMax).toBeLessThanOrEqual(4_000);
        const life = read('src/app/components/lawyer/HamiSettings/hooks/useSettingsLifecycle.ts');
        expect(life).toContain('SETTINGS_INTERACTIVE_FALLBACK_MS');
        expect(life).not.toMatch(/setTimeout\(markInteractiveNow,\s*1_?200\)/);
    });

    it('التبويب يتبدّل عند pointerdown والأقسام المخفية لا تُخطَّط', () => {
        const header = read('src/app/components/lawyer/HamiSettings/SettingsShellHeader.tsx');
        expect(header).toContain('prefetchSettingsSection(item.id)');
        expect(header).toContain('if (!active) onSectionChange(item.id)');
        expect(header).toContain('onPointerDown');
        const css = read('src/app/components/lawyer/HamiSettings/settingsChromeCards.css');
        expect(css).toContain('.hami-settings-section-frame > [hidden]');
        expect(css).toContain('content-visibility: hidden');
        expect(css).toContain('contain: strict');
    });

    it('prefetch الثانوي بعد الخمول والترقيع يتخطى القيم المطابقة', () => {
        const warm = read('src/app/components/lawyer/HamiSettings/hooks/useSettingsSectionWarm.ts');
        expect(warm).toContain('prefetchSecondarySettingsSections');
        expect(warm).toContain('scheduleIdleWork');
        expect(warm).not.toContain('setTimeout');
        const patches = read('src/app/components/lawyer/HamiSettings/hooks/useSettingsPatches.ts');
        expect(patches).toContain('isUnchangedSlicePatch');
        const observe = read(
            'src/app/components/lawyer/HamiSettings/hooks/observeSettingsSectionInteractive.ts',
        );
        expect(observe).toContain('settings-section-panel');
        expect(observe).not.toContain('obs?.observe(document.body');
    });
});
