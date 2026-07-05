import React from 'react';
import { Cpu, Gauge, Sparkles, Zap } from 'lucide-react';
import { SettingCard, SettingRow, Toggle, Segmented } from '../settings-ui';
import type { AppearanceSectionViewModel } from './useAppearanceSection';
import type { LitePerformanceMode } from '@/app/services/settings/types';

const LITE_OPTIONS: { value: LitePerformanceMode; label: string }[] = [
    { value: 'auto', label: 'تلقائي' },
    { value: 'on', label: 'مفعّل' },
    { value: 'off', label: 'معطّل' },
];

export function AppearancePerformanceCard({ vm }: { vm: AppearanceSectionViewModel }) {
    return (
        <SettingCard>
            <SettingRow
                icon={Gauge}
                label="الأداء الخفيف"
                action={
                    <Segmented
                        value={vm.performance.litePerformance}
                        options={LITE_OPTIONS}
                        onChange={(v) => vm.patchPerformance({ litePerformance: v })}
                    />
                }
            />
            <SettingRow
                icon={Cpu}
                label="تقليل الحركة"
                action={
                    <Toggle
                        label="تقليل الحركة"
                        testId="settings-toggle-appearance-reduceMotion"
                        checked={vm.appearance.reduceMotion}
                        onChange={(v) => vm.patchAppearance({ reduceMotion: v })}
                    />
                }
            />
            <SettingRow
                icon={Sparkles}
                label="الحركات والانتقالات"
                action={
                    <Toggle
                        label="الحركات والانتقالات"
                        checked={vm.performance.enableAnimations}
                        onChange={(v) => vm.patchPerformance({ enableAnimations: v })}
                    />
                }
            />
            <SettingRow
                icon={Zap}
                label="تحميل الشاشات مسبقاً"
                isLast
                action={
                    <Toggle
                        label="تحميل الشاشات مسبقاً"
                        checked={vm.performance.prefetchScreens}
                        onChange={(v) => vm.patchPerformance({ prefetchScreens: v })}
                    />
                }
            />
        </SettingCard>
    );
}
