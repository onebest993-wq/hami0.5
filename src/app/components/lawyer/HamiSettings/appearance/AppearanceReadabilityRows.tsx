import React from 'react';
import { Contrast } from '@/app/components/ui/icons/Contrast';
import { FONT_PRESETS, normalizeFontPreset } from '@/app/services/settings';
import type { LitePerformanceMode } from '@/app/services/settings/types';
import { SelectRow, SettingRow, Toggle } from '../settings-ui/index';
import type { AppearanceSectionViewModel } from './useAppearanceSection';

const LITE_OPTIONS: { value: LitePerformanceMode; label: string; testId: string }[] = [
    { value: 'auto', label: 'تلقائي', testId: 'settings-lite-auto' },
    { value: 'on', label: 'تشغيل', testId: 'settings-lite-on' },
    { value: 'off', label: 'إيقاف', testId: 'settings-lite-off' },
];

export function AppearanceReadabilityRows({ vm }: { vm: AppearanceSectionViewModel }) {
    const fontPreset = normalizeFontPreset(vm.appearance.fontPreset, vm.appearance.fontSize);

    return (
        <>
            <SelectRow
                label="حجم النص"
                subLabel="ثلاثة أحجام على لوحة المحامي"
                value={fontPreset}
                options={FONT_PRESETS.map((preset) => ({
                    value: preset.id,
                    label: preset.label,
                    testId: `settings-font-preset-${preset.id}`,
                }))}
                onChange={(next) => {
                    const preset = FONT_PRESETS.find((item) => item.id === next);
                    if (!preset) return;
                    vm.patchAppearance({ fontPreset: preset.id, fontSize: preset.px });
                }}
            />
            <SettingRow
                icon={Contrast}
                label="تباين أوضح"
                subLabel="يزيد وضوح النص والحدود بلطف"
                action={
                    <Toggle
                        testId="settings-toggle-appearance-highContrast"
                        checked={vm.appearance.highContrast}
                        onChange={(next) => vm.patchAppearance({ highContrast: next })}
                    />
                }
            />
            <SelectRow
                label="أداء خفيف"
                subLabel="يقلّل الضبابية والتحميل المسبق"
                value={vm.performance.litePerformance}
                options={LITE_OPTIONS}
                onChange={(next) =>
                    vm.patchPerformance({ litePerformance: next as LitePerformanceMode })
                }
            />
        </>
    );
}
