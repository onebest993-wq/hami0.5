import React, { useRef } from 'react';
import { Check, Cpu, Image as ImageIcon, Monitor, Moon, Palette, Sparkles, Sun } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { settingWiringHint } from '@/app/services/settings/settingsCapabilities';
import {
    EXTENDED_THEMES,
    FONT_PRESETS,
    SHAPE_OPTIONS,
    loadPersistedWallpaper,
    persistWallpaper,
    type AppSettingsState,
} from '@/app/services/settings';
import type { ShapeKey, ThemeKey } from '@/app/types/common';
import { SectionHeader, SettingCard, SettingRow, Toggle, Segmented, SliderRow } from './settings-ui';

export type AppearanceSectionProps = {
    settings: AppSettingsState;
    currentTheme: ThemeKey;
    currentShape: ShapeKey;
    setCurrentTheme: (t: ThemeKey) => void;
    setCurrentShape: (s: ShapeKey) => void;
    patchAppearance: (partial: Partial<AppSettingsState['appearance']>) => void;
};

export function AppearanceSection({
    settings,
    currentTheme,
    currentShape,
    setCurrentTheme,
    setCurrentShape,
    patchAppearance,
}: AppearanceSectionProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleWallpaper = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || file.size > 2_500_000) {
            SmartToast.warning('الحد الأقصى لحجم الخلفية 2.5 ميجابايت');
            e.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result);
            patchAppearance({ wallpaper: dataUrl });
            persistWallpaper(dataUrl);
            SmartToast.success('تم تطبيق الخلفية');
            e.target.value = '';
        };
        reader.readAsDataURL(file);
    };

    return (
        <>
            <SectionHeader title="المظهر والهوية" subtitle="ثيم، خط، زجاج، وخلفية التطبيق" icon={Palette} />
            <SettingCard>
                <div className="p-4 border-b border-white/[0.04]">
                    <label className="text-sm font-bold text-white mb-1 block">لوحة الألوان</label>
                    <p className="text-[10px] text-white/40 mb-3">{settingWiringHint('appearance.theme')}</p>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {EXTENDED_THEMES.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                    setCurrentTheme(t.id as ThemeKey);
                                    patchAppearance({ theme: t.id as ThemeKey, brandColor: t.color });
                                }}
                                className={`min-w-[52px] h-12 rounded-xl flex flex-col items-center justify-center border-2 transition-all ${
                                    currentTheme === t.id ? 'border-[#E6C673] scale-105' : 'border-transparent opacity-70'
                                }`}
                                style={{ backgroundColor: `${t.color}22` }}
                                title={t.name}
                            >
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }} />
                                {currentTheme === t.id && <Check size={10} className="text-white mt-0.5" />}
                            </button>
                        ))}
                    </div>
                </div>
                <SettingRow
                    icon={Sparkles}
                    label="شكل العناصر"
                    subLabel={settingWiringHint('appearance.shape') ?? 'حواف الأزرار والبطاقات'}
                    action={
                        <Segmented
                            value={currentShape}
                            options={SHAPE_OPTIONS.map((s) => ({ value: s.id, label: s.label }))}
                            onChange={(v) => {
                                setCurrentShape(v as ShapeKey);
                                patchAppearance({ shape: v as ShapeKey });
                            }}
                        />
                    }
                />
                <SettingRow
                    icon={Monitor}
                    label="وضع العرض"
                    subLabel={settingWiringHint('appearance.themeMode')}
                    action={
                        <Segmented
                            value={settings.appearance.themeMode}
                            options={[
                                { value: 'dark', label: 'ليلي' },
                                { value: 'light', label: 'نهاري' },
                                { value: 'auto', label: 'تلقائي' },
                            ]}
                            onChange={(v) =>
                                patchAppearance({ themeMode: v as AppSettingsState['appearance']['themeMode'] })
                            }
                        />
                    }
                />
                <div className="p-4 border-b border-white/[0.04]">
                    <label className="text-sm font-bold text-white mb-1 block">حجم الخط</label>
                    <p className="text-[10px] text-white/40 mb-2">{settingWiringHint('appearance.fontSize')}</p>
                    <div className="flex gap-2 flex-wrap">
                        {FONT_PRESETS.map((f) => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => patchAppearance({ fontPreset: f.id, fontSize: f.px })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                                    settings.appearance.fontSize === f.px
                                        ? 'bg-[#E6C673] text-black border-[#E6C673]'
                                        : 'border-white/10 text-white/50'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
                <SliderRow
                    label="شفافية الزجاج"
                    hint={settingWiringHint('appearance.glassOpacity')}
                    value={settings.appearance.glassOpacity}
                    min={0.2}
                    max={0.95}
                    step={0.05}
                    format={(v) => `${Math.round(v * 100)}%`}
                    onChange={(v) => patchAppearance({ glassOpacity: v })}
                />
                <SettingRow
                    icon={ImageIcon}
                    label="خلفية التطبيق"
                    subLabel={settingWiringHint('appearance.wallpaper') ?? 'تُحفظ محلياً على جهازك'}
                    action={
                        <>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleWallpaper} />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white"
                            >
                                اختيار صورة
                            </button>
                            {(settings.appearance.wallpaper || loadPersistedWallpaper()) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        patchAppearance({ wallpaper: undefined });
                                        persistWallpaper(undefined);
                                        SmartToast.success('تمت إزالة الخلفية');
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-rose-300"
                                >
                                    إزالة
                                </button>
                            )}
                        </>
                    }
                />
                <SettingRow
                    icon={settings.appearance.highContrast ? Sun : Moon}
                    label="تباين عالٍ"
                    subLabel={settingWiringHint('appearance.highContrast')}
                    action={<Toggle checked={settings.appearance.highContrast} onChange={(v) => patchAppearance({ highContrast: v })} />}
                />
                <SettingRow
                    icon={Cpu}
                    label="تقليل الحركة"
                    subLabel={settingWiringHint('appearance.reduceMotion')}
                    isLast
                    action={<Toggle checked={settings.appearance.reduceMotion} onChange={(v) => patchAppearance({ reduceMotion: v })} />}
                />
            </SettingCard>
        </>
    );
}

