import React from 'react';
import { Cpu, Gauge, Sparkles, Zap } from 'lucide-react';
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
    if (mode === 'on') {
        return 'بلا ضبابية ولا خلفية جدارية ولا زخارف — تحرير ذاكرة أسرع';
    }
    if (mode === 'off') {
        return 'أقصى جودة بصرية وتحميل مسبق (إن كان مفعّلاً)';
    }
    return activeNow
        ? 'تلقائي: مفعّل الآن على هذا الجهاز'
        : 'تلقائي: الجهاز قوي — التأثيرات كاملة';
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
                        onChange={(v) => vm.patchPerformance({ litePerformance: v })}
                    />
                }
            />
            <SettingRow
                icon={Cpu}
                label="تقليل الحركة"
                subLabel="يوقف الحركات المستمرة والانتقالات فوراً"
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
                subLabel="انتقال الشاشات وضغط الأيقونات — يُلغى تلقائياً مع تقليل الحركة"
                action={
                    <Toggle
                        label="الحركات والانتقالات"
                        testId="settings-toggle-performance-enableAnimations"
                        checked={vm.performance.enableAnimations}
                        onChange={(v) => vm.patchPerformance({ enableAnimations: v })}
                    />
                }
            />
            <SettingRow
                icon={Zap}
                label="تحميل الشاشات مسبقاً"
                subLabel="يسخّن الشاشات عند اللمس قبل الفتح — عطّله لتوفير البيانات/الذاكرة"
                isLast
                action={
                    <Toggle
                        label="تحميل الشاشات مسبقاً"
                        testId="settings-toggle-performance-prefetchScreens"
                        checked={vm.performance.prefetchScreens}
                        onChange={(v) => vm.patchPerformance({ prefetchScreens: v })}
                    />
                }
            />
        </SettingCard>
    );
}
