import React from 'react';
import { Cpu, Gauge, Sparkles, Zap } from '@/app/components/ui/lucideIcons';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SettingCard, SettingRow, Toggle, Segmented } from '../settings-ui';
import type { AppearanceSectionViewModel } from './useAppearanceSection';
import type { LitePerformanceMode } from '@/app/services/settings/types';
import { useLitePerformanceActive } from '@/app/hooks/useLitePerformanceActive';

const LITE_OPTIONS: { value: LitePerformanceMode; label: string; testId?: string }[] = [
    { value: 'auto', label: 'تلقائي', testId: 'settings-lite-auto' },
    { value: 'on', label: 'مفعّل', testId: 'settings-lite-on' },
    { value: 'off', label: 'معطّل', testId: 'settings-lite-off' },
];

function liteSubLabel(mode: LitePerformanceMode, activeNow: boolean): string {
    if (mode === 'on') return 'بدون ضبابية ولا زخارف';
    if (mode === 'off') return 'أقصى جودة بصرية';
    return activeNow ? 'مفعّل تلقائياً على هذا الجهاز' : 'التأثيرات كاملة';
}

export function AppearancePerformanceCard({ vm }: { vm: AppearanceSectionViewModel }) {
    const liteActiveNow = useLitePerformanceActive();
    const liteMode = vm.performance.litePerformance;

    return (
        <SettingCard>
            <SettingRow
                icon={Gauge}
                label="الأداء الخفيف"
                subLabel={liteSubLabel(liteMode, liteActiveNow)}
                action={
                    <Segmented
                        value={liteMode}
                        options={LITE_OPTIONS}
                        onChange={(v) => {
                            vm.patchPerformance({ litePerformance: v });
                            if (v === 'on') SmartToast.info('الأداء الخفيف — بدون ضبابية وزخارف');
                            else if (v === 'off') SmartToast.info('أقصى جودة بصرية');
                        }}
                    />
                }
            />
            <SettingRow
                icon={Cpu}
                label="تقليل الحركة"
                subLabel="يوقف الانتقالات والحركات"
                action={
                    <Toggle
                        label="تقليل الحركة"
                        testId="settings-toggle-appearance-reduceMotion"
                        checked={vm.appearance.reduceMotion}
                        onChange={(v) => {
                            vm.patchAppearance({ reduceMotion: v });
                            SmartToast.info(v ? 'تم إيقاف الحركات والانتقالات' : 'الحركات مفعّلة');
                        }}
                    />
                }
            />
            <SettingRow
                icon={Sparkles}
                label="الحركات والانتقالات"
                subLabel="انتقالات الشاشات والأيقونات"
                action={
                    <Toggle
                        label="الحركات والانتقالات"
                        testId="settings-toggle-performance-enableAnimations"
                        checked={vm.performance.enableAnimations}
                        onChange={(v) => {
                            vm.patchPerformance({ enableAnimations: v });
                            SmartToast.info(v ? 'الحركات والانتقالات مفعّلة' : 'تم إيقاف انتقالات الشاشات والأيقونات');
                        }}
                    />
                }
            />
            <SettingRow
                icon={Zap}
                label="تحميل الشاشات مسبقاً"
                subLabel="تحميل مسبق عند اللمس"
                isLast
                action={
                    <Toggle
                        label="تحميل الشاشات مسبقاً"
                        testId="settings-toggle-performance-prefetchScreens"
                        checked={vm.performance.prefetchScreens}
                        onChange={(v) => {
                            vm.patchPerformance({ prefetchScreens: v });
                            SmartToast.info(
                                v ? 'تحميل مسبق عند اللمس — أسرع عند فتح الشاشات' : 'لا تحميل مسبق — توفير بيانات وذاكرة',
                            );
                        }}
                    />
                }
            />
        </SettingCard>
    );
}
