import React, { useMemo, useRef, useState } from 'react';
import {
    ChevronDown,
    ChevronUp,
    Contrast,
    Cpu,
    Globe,
    ImageIcon,
    LayoutGrid,
    Palette,
    Shapes,
    Sparkles,
    Square,
    Zap,
} from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import { compressImageToDataUrl } from '@/app/services/profileMediaService';
import { settingWiringHint } from '@/app/services/settings/settingsCapabilities';
import {
    FONT_PRESETS,
    SHAPE_OPTIONS,
    BACKGROUND_PRESETS,
    LAWYER_THEME_TOKENS,
    normalizeBackgroundPreset,
    persistWallpaper,
    resolveWallpaperSrc,
    resolveLawyerSurfaceBaseColor,
    resolvePatternPreviewStyle,
    BACKGROUND_PATTERN_OPACITY_MIN,
    BACKGROUND_PATTERN_OPACITY_MAX,
    GLASS_OPACITY_MIN,
    GLASS_OPACITY_MAX,
    type AppSettingsState,
    type BackgroundPresetId,
} from '@/app/services/settings';
import type { ThemeKey } from '@/app/types/common';
import { SectionHeader, SettingCard, SettingRow, Toggle, Segmented, SliderRow, SETTING_GLASS_INNER } from './settings-ui';
import { useSettingsPatches } from './hooks/useSettingsPatches';

const THEME_KEYS: ThemeKey[] = [
    'black',
    'gold',
    'navy',
    'crimson',
    'emerald',
    'silver',
    'sky',
    'brown',
    'purple',
    'bronze',
    'wine',
    'matcha',
    'teal',
    'greige',
    'obsidian',
    'coral',
    'plum',
    'brass',
    'chalk',
    'ice',
];

const THEME_COLLAPSED_COUNT = 10;
const PATTERN_COLLAPSED_COUNT = 9;

function pickCollapsedItems<T>(items: T[], limit: number, expanded: boolean, ensureItem?: T): T[] {
    if (expanded || items.length <= limit) return items;
    const head = items.slice(0, limit);
    if (ensureItem && !head.includes(ensureItem)) {
        return [...head.slice(0, limit - 1), ensureItem];
    }
    return head;
}

function CollapseToggle({
    expanded,
    hidden,
    onToggle,
    label,
}: {
    expanded: boolean;
    hidden: number;
    onToggle: () => void;
    label: string;
}) {
    if (hidden <= 0) return null;

    return (
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? `طي ${label}` : `عرض كل ${label}`}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[10px] font-bold text-white/55 hover:text-[#E6C673]/85 hover:border-[#E6C673]/20 transition-colors min-h-[32px]"
        >
            {expanded ? (
                <>
                    <span>طي</span>
                    <ChevronUp size={14} aria-hidden />
                </>
            ) : (
                <>
                    <span>+{hidden}</span>
                    <ChevronDown size={14} aria-hidden />
                </>
            )}
        </button>
    );
}

export function AppearanceSection({
    onEnterHomeLayoutEdit,
}: {
    onEnterHomeLayoutEdit?: () => void;
}) {
    const { settings, setSettings, setCurrentShape, setCurrentTheme } = useLawyerSettings();
    const { patchAppearance, patchPerformance } = useSettingsPatches();
    const wallpaperRef = useRef<HTMLInputElement>(null);
    const [themesExpanded, setThemesExpanded] = useState(false);
    const [patternsExpanded, setPatternsExpanded] = useState(false);
    const wallpaperSrc = resolveWallpaperSrc(settings.appearance);
    const hasWallpaper = !!wallpaperSrc;

    const activePreset = normalizeBackgroundPreset(settings.appearance.backgroundPreset);
    const activeTheme = settings.appearance.theme;
    const themeToken = LAWYER_THEME_TOKENS[activeTheme] ?? LAWYER_THEME_TOKENS.gold;
    const previewBaseColor = resolveLawyerSurfaceBaseColor(activeTheme, 'dark', false);
    const previewAccent = themeToken.primary;

    const selectTheme = (key: ThemeKey) => {
        setCurrentTheme(key);
    };

    const selectBackgroundPreset = (id: BackgroundPresetId) => {
        const nextAppearance =
            wallpaperSrc && id !== 'none'
                ? { backgroundPreset: id, wallpaper: undefined as string | undefined }
                : { backgroundPreset: id };

        if (wallpaperSrc && id !== 'none') {
            persistWallpaper(undefined);
        }

        setSettings((prev) => ({
            ...prev,
            appearance: { ...prev.appearance, ...nextAppearance },
        }));

        if (id !== 'none') {
            SmartToast.success('تم تطبيق الخلفية');
        }
    };

    const selectShape = (shape: AppSettingsState['appearance']['shape']) => {
        setCurrentShape(shape);
    };

    const uploadWallpaper = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            SmartToast.error('يرجى اختيار ملف صورة');
            return;
        }
        try {
            const dataUrl = await compressImageToDataUrl(file);
            if (!persistWallpaper(dataUrl)) {
                SmartToast.error('تعذر حفظ الصورة — مساحة التخزين ممتلئة');
                return;
            }
            patchAppearance({ wallpaper: dataUrl });
            SmartToast.success('تم تطبيق خلفية اللوحة');
        } catch {
            SmartToast.error('تعذر رفع الصورة — جرّب صورة أصغر');
        }
    };

    const removeWallpaper = () => {
        persistWallpaper(undefined);
        patchAppearance({ wallpaper: undefined });
        SmartToast.info('تمت إزالة الخلفية');
    };

    const patternControlsDisabled = activePreset === 'none' || hasWallpaper;

    const visibleThemeKeys = useMemo(
        () => pickCollapsedItems(THEME_KEYS, THEME_COLLAPSED_COUNT, themesExpanded, activeTheme),
        [themesExpanded, activeTheme],
    );
    const hiddenThemeCount = Math.max(0, THEME_KEYS.length - THEME_COLLAPSED_COUNT);

    const visiblePresets = useMemo(
        () => pickCollapsedItems(BACKGROUND_PRESETS, PATTERN_COLLAPSED_COUNT, patternsExpanded, BACKGROUND_PRESETS.find((p) => p.id === activePreset)),
        [patternsExpanded, activePreset],
    );
    const hiddenPatternCount = Math.max(0, BACKGROUND_PRESETS.length - PATTERN_COLLAPSED_COUNT);

    return (
        <>
            <SectionHeader title="تخصيص المنظر" icon={Palette} />

            {onEnterHomeLayoutEdit ? (
                <SettingCard className="mb-4 overflow-hidden">
                    <button
                        type="button"
                        onClick={onEnterHomeLayoutEdit}
                        className="w-full p-4 flex items-center gap-4 text-right hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors"
                    >
                        <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center bg-[#E6C673]/12 border border-[#E6C673]/25">
                            <LayoutGrid size={22} className="text-[#E6C673]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white">تخصيص الواجهة الرئيسية</p>
                            <p className="text-[10px] text-white/45 mt-1 leading-relaxed">
                                انتقل للوحة — حرّك الحاويات، خصّص الشريط السفلي، غيّر الحجم واللون والنمط
                            </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold text-[#E6C673] px-2.5 py-1 rounded-full border border-[#E6C673]/30">
                            فتح
                        </span>
                    </button>
                </SettingCard>
            ) : null}

            <SettingCard className="mb-4">
                <div className="p-4 border-b border-white/[0.03]">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                            <label className="text-sm font-bold text-white block">لون الخلفية</label>
                            <p className="text-[10px] text-white/40 mt-1">{settingWiringHint('appearance.theme')}</p>
                        </div>
                        <CollapseToggle
                            expanded={themesExpanded}
                            hidden={hiddenThemeCount}
                            onToggle={() => setThemesExpanded((v) => !v)}
                            label="الألوان"
                        />
                    </div>
                    <div className="grid grid-cols-5 gap-2 mt-3">
                        {visibleThemeKeys.map((key) => {
                            const token = LAWYER_THEME_TOKENS[key];
                            const active = activeTheme === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => selectTheme(key)}
                                    title={token.name}
                                    className={`relative h-12 rounded-xl overflow-hidden transition-all ${SETTING_GLASS_INNER} ${
                                        active
                                            ? 'ring-2 ring-[#E6C673]/50 scale-[1.02]'
                                            : 'hover:bg-white/[0.05]'
                                    }`}
                                    aria-pressed={active}
                                >
                                    <div className="absolute inset-0" style={{ backgroundColor: token.bg }} />
                                    <div
                                        className="absolute inset-0 opacity-50"
                                        style={{
                                            background: `radial-gradient(circle at 70% 80%, ${token.primary}66, transparent 62%)`,
                                        }}
                                    />
                                    <div
                                        className="absolute bottom-0 inset-x-0 h-2.5"
                                        style={{ backgroundColor: token.primary }}
                                    />
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[10px] text-white/45 mt-2 text-center">{themeToken.name}</p>
                </div>

                <div className="p-4 border-b border-white/[0.03]">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                            <label className="text-sm font-bold text-white block">خلفية اللوحة</label>
                            <p className="text-[10px] text-white/40 mt-1">{settingWiringHint('appearance.backgroundPreset')}</p>
                        </div>
                        <CollapseToggle
                            expanded={patternsExpanded}
                            hidden={hiddenPatternCount}
                            onToggle={() => setPatternsExpanded((v) => !v)}
                            label="الزخارف"
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                        {visiblePresets.map((preset) => {
                            const active = activePreset === preset.id;
                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => selectBackgroundPreset(preset.id)}
                                    className={`relative h-[4.5rem] rounded-xl overflow-hidden transition-colors ${SETTING_GLASS_INNER} ${
                                        active
                                            ? 'ring-2 ring-[#E6C673]/45'
                                            : 'hover:bg-white/[0.05]'
                                    }`}
                                    aria-pressed={active}
                                >
                                    <div
                                        className="absolute inset-0"
                                        style={resolvePatternPreviewStyle(
                                            preset.id,
                                            previewAccent,
                                            previewBaseColor,
                                            settings.appearance.backgroundPatternOpacity,
                                            'dark',
                                        )}
                                    />
                                    <span className="absolute inset-x-0 bottom-0 z-10 px-1.5 py-1.5 text-[9px] font-bold text-white/80 text-center leading-tight bg-gradient-to-t from-black/75 to-transparent">
                                        {preset.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className={patternControlsDisabled ? 'opacity-40 pointer-events-none' : ''}>
                    <SliderRow
                        label="حدة الزخرفة"
                        hint={settingWiringHint('appearance.backgroundPatternOpacity')}
                        value={settings.appearance.backgroundPatternOpacity}
                        min={BACKGROUND_PATTERN_OPACITY_MIN}
                        max={BACKGROUND_PATTERN_OPACITY_MAX}
                        step={0.01}
                        format={(v) => `${Math.round(v * 100)}%`}
                        onChange={(v) => patchAppearance({ backgroundPatternOpacity: v })}
                    />
                </div>

                <div className="p-4 border-b border-white/[0.03]">
                    <SliderRow
                        label="كثافة الحاويات"
                        hint={settingWiringHint('appearance.glassOpacity')}
                        value={settings.appearance.glassOpacity}
                        min={GLASS_OPACITY_MIN}
                        max={GLASS_OPACITY_MAX}
                        step={0.01}
                        format={(v) => `${Math.round(v * 100)}%`}
                        onChange={(v) => patchAppearance({ glassOpacity: v })}
                    />
                </div>

                <SettingRow
                    icon={Square}
                    label="إطار الحاويات"
                    subLabel={settingWiringHint('appearance.homeContainerBorder')}
                    isLast={false}
                    action={
                        <Toggle
                            checked={settings.appearance.homeContainerBorder !== false}
                            onChange={(v) => patchAppearance({ homeContainerBorder: v })}
                        />
                    }
                />

                <SettingRow
                    icon={Shapes}
                    label="شكل البطاقات"
                    subLabel={settingWiringHint('appearance.shape')}
                    isLast={false}
                    action={
                        <Segmented
                            value={settings.appearance.shape}
                            options={SHAPE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                            onChange={(v) => selectShape(v as AppSettingsState['appearance']['shape'])}
                        />
                    }
                />
                <SettingRow
                    icon={Globe}
                    label="لغة الواجهة"
                    subLabel={settingWiringHint('appearance.language')}
                    isLast
                    action={
                        <Segmented
                            value={settings.appearance.language}
                            options={[
                                { value: 'ar', label: 'عربي' },
                                { value: 'en', label: 'EN' },
                            ]}
                            onChange={(v) => patchAppearance({ language: v as AppSettingsState['appearance']['language'] })}
                        />
                    }
                />
            </SettingCard>

            <SettingCard className="mb-4">
                <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <ImageIcon size={16} className="text-[#E6C673]" />
                                <span className="text-sm font-bold text-white">صورة خلفية</span>
                            </div>
                            <p className="text-[10px] text-white/40">{settingWiringHint('appearance.wallpaper')}</p>
                        </div>
                        {wallpaperSrc ? (
                            <button
                                type="button"
                                onClick={removeWallpaper}
                                className="text-[10px] font-bold text-rose-400/90 hover:text-rose-300 shrink-0"
                            >
                                إزالة
                            </button>
                        ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`w-20 h-14 rounded-xl overflow-hidden shrink-0 ${SETTING_GLASS_INNER}`}>
                            {wallpaperSrc ? (
                                <img src={wallpaperSrc} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full" style={{ backgroundColor: previewBaseColor }} />
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => wallpaperRef.current?.click()}
                            className="flex-1 py-2.5 rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/10 backdrop-blur-sm text-[11px] font-bold text-[#E6C673] hover:bg-[#E6C673]/15 transition-colors min-h-[44px]"
                        >
                            {wallpaperSrc ? 'تغيير الخلفية' : 'رفع صورة خلفية'}
                        </button>
                    </div>
                </div>
                <input
                    ref={wallpaperRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadWallpaper(f);
                        e.target.value = '';
                    }}
                />
            </SettingCard>

            <SettingCard className="mb-4">
                <div className="p-4 border-b border-white/[0.03]">
                    <label className="text-sm font-bold text-white mb-1 block">حجم الخط</label>
                    <p className="text-[10px] text-white/40 mb-2">{settingWiringHint('appearance.fontSize')}</p>
                    <div className="flex gap-2 flex-wrap">
                        {FONT_PRESETS.map((f) => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => patchAppearance({ fontPreset: f.id, fontSize: f.px })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                    settings.appearance.fontSize === f.px
                                        ? 'bg-[#E6C673]/20 text-[#E6C673] ring-1 ring-inset ring-[#E6C673]/30'
                                        : `${SETTING_GLASS_INNER} text-white/50 hover:bg-white/[0.05]`
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
                <SettingRow
                    icon={Contrast}
                    label="تباين أعلى"
                    subLabel={settingWiringHint('appearance.highContrast')}
                    isLast
                    action={
                        <Toggle
                            checked={settings.appearance.highContrast}
                            onChange={(v) => patchAppearance({ highContrast: v })}
                        />
                    }
                />
            </SettingCard>

            <SettingCard>
                <SettingRow
                    icon={Cpu}
                    label="تقليل الحركة"
                    subLabel={settingWiringHint('appearance.reduceMotion')}
                    action={
                        <Toggle
                            checked={settings.appearance.reduceMotion}
                            onChange={(v) => patchAppearance({ reduceMotion: v })}
                        />
                    }
                />
                <SettingRow
                    icon={Sparkles}
                    label="الحركات والانتقالات"
                    subLabel={settingWiringHint('performance.enableAnimations')}
                    action={
                        <Toggle
                            checked={settings.performance.enableAnimations}
                            onChange={(v) => patchPerformance({ enableAnimations: v })}
                        />
                    }
                />
                <SettingRow
                    icon={Zap}
                    label="تحميل الشاشات مسبقاً"
                    subLabel={settingWiringHint('performance.prefetchScreens')}
                    isLast
                    action={
                        <Toggle
                            checked={settings.performance.prefetchScreens}
                            onChange={(v) => patchPerformance({ prefetchScreens: v })}
                        />
                    }
                />
            </SettingCard>
        </>
    );
}
