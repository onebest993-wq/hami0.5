import React from 'react';
import { Cpu, RotateCcw, Sparkles } from 'lucide-react';
import type { AppSettingsState } from '@/app/services/settings';
import { SectionHeader, SettingCard, SettingRow, Toggle } from './settings-ui';
import { SmartToast } from '@/app/components/ui/SmartToast';

export type AdvancedSectionProps = {
    settings: AppSettingsState;
    patchPerformance: (partial: Partial<AppSettingsState['performance']>) => void;
    resetToDefaults: () => void;
};

export function AdvancedSection({ settings, patchPerformance, resetToDefaults }: AdvancedSectionProps) {
    return (
        <>
            <SectionHeader title="متقدم" subtitle="أداء، مطور، وإعادة ضبط" icon={Cpu} />
            <SettingCard>
                <SettingRow
                    icon={Sparkles}
                    label="الحركات والانتقالات"
                    subLabel="يُعطّل إن فعّلت «تقليل الحركة» في المظهر"
                    action={<Toggle checked={settings.performance.enableAnimations} onChange={(v) => patchPerformance({ enableAnimations: v })} />}
                />
                <SettingRow
                    icon={Cpu}
                    label="تحميل مسبق للشاشات"
                    subLabel="تحميل مكونات ثقيلة بعد الدخول"
                    action={<Toggle checked={settings.performance.prefetchScreens} onChange={(v) => patchPerformance({ prefetchScreens: v })} />}
                />
                {import.meta.env.DEV && (
                    <SettingRow
                        icon={Cpu}
                        label="مراقب الأداء"
                        subLabel="عداد FPS/ذاكرة أعلى الشاشة"
                        action={<Toggle checked={settings.performance.devPerformanceMonitor} onChange={(v) => patchPerformance({ devPerformanceMonitor: v })} />}
                    />
                )}
                <SettingRow
                    icon={RotateCcw}
                    label="إعادة ضبط الإعدادات"
                    subLabel="استعادة القيم الافتراضية"
                    isLast
                    action={
                        <button
                            type="button"
                            onClick={() => {
                                resetToDefaults();
                                SmartToast.success('تمت إعادة الضبط');
                            }}
                            className="text-rose-400 text-xs font-bold"
                        >
                            إعادة ضبط
                        </button>
                    }
                />
            </SettingCard>
        </>
    );
}

