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
        expect(header).toContain('onPointerEnter');
        expect(header).toContain('if (id !== activeSection) onSectionChange(id)');
        expect(header).toContain('onPointerDown');
        const css = read('src/app/components/lawyer/HamiSettings/settingsChromeCards.css');
        expect(css).toContain('.hami-settings-section-frame > [hidden]');
        expect(css).toContain('content-visibility: hidden');
        expect(css).toContain('contain: strict');
        expect(css).toContain("data-settings-section-park='1'");
        expect(css).toContain('content-visibility: visible');
        const router = read('src/app/components/lawyer/HamiSettings/SettingsSectionRouter.tsx');
        expect(router).toContain('data-settings-section-park');
        expect(router).toContain('isIncoming');
        expect(router).toContain('SettingsSectionReveal');
        expect(router).toContain('readyIdsRef');
        const reveal = read('src/app/components/lawyer/HamiSettings/SettingsSectionReveal.tsx');
        expect(reveal).toContain('data-settings-section-cover');
        expect(reveal).toContain('isLaidOutSettingsInteractive');
        expect(reveal).toContain('absolute inset-inline-0 top-0 opacity-0');
    });

    it('خمول المنزل لا يسخّن المنظر؛ المركز المفتوح يحمّل التبويبات لتفادي الشاشة الفارغة', () => {
        const warm = read('src/app/components/lawyer/HamiSettings/hooks/useSettingsSectionWarm.ts');
        expect(warm).toContain('prefetchSettingsSection(activeSection)');
        expect(warm).toContain('prefetchSettingsOpenTabChunks');
        expect(warm).toContain('overlayOpen');
        expect(warm).not.toContain('prefetchSecondarySettingsSections');
        expect(warm).not.toContain('scheduleIdleWork');
        expect(warm).not.toContain('setTimeout');
        const load = read('src/app/components/lawyer/HamiSettings/settingsSectionLoad.ts');
        expect(load).toContain("import('./appearance/AppearanceSection')");
        expect(load).toContain('prefetchSettingsOpenTabChunks');
        expect(load).not.toContain('prefetchSecondarySettingsSections');
        expect(load).not.toMatch(/prefetchSettingsSection\('data'\)/);
        expect(load).not.toMatch(/prefetchSettingsSection\('account'\)/);
        const patches = read('src/app/components/lawyer/HamiSettings/hooks/useSettingsPatches.ts');
        expect(patches).toContain('isUnchangedSlicePatch');
        const observe = read(
            'src/app/components/lawyer/HamiSettings/hooks/observeSettingsSectionInteractive.ts',
        );
        expect(observe).toContain('settings-section-panel');
        expect(observe).not.toContain('obs?.observe(document.body');
    });
});
