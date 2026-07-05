import React from 'react';
import { Sparkles } from 'lucide-react';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import {
    BACKGROUND_PRESETS,
    HOME_BLOCK_ACCENT_PRESETS,
    LAWYER_THEME_TOKENS,
    BACKGROUND_PATTERN_OPACITY_MAX,
    BACKGROUND_PATTERN_OPACITY_MIN,
    GLASS_OPACITY_MAX,
    GLASS_OPACITY_MIN,
    normalizeBackgroundPatternOpacity,
    normalizeGlassOpacity,
    resolveLawyerSurfaceBaseColor,
    resolvePatternPreviewStyle,
    hasPersistedWallpaper,
    type HomeBlockPattern,
    type HomeBlockShape,
    type HomeBlockSize,
    type HomeBlockStyleOverride,
} from '@/app/services/settings';
import type { ThemeKey } from '@/app/types/common';
import {
    HOME_BLOCK_PATTERN_LABELS,
    HOME_BLOCK_SHAPE_LABELS,
    HOME_BLOCK_SIZE_LABELS,
} from '@/app/services/settings/homeBlockLabels';
import { isHomeWidgetId, getWidgetZone, type HomeWidgetId } from '@/app/services/settings/homeLayout';
import {
    isHeightProtectedWidget,
    resolveHomeBlockAccent,
} from '@/app/services/settings/resolveHomeBlockStyle';
import { normalizeBackgroundPreset } from '@/app/services/settings/backgroundPresets';
import { Segmented, SliderRow, Toggle } from '@/app/components/lawyer/HamiSettings/settings-ui';

const THEME_KEYS = Object.keys(LAWYER_THEME_TOKENS) as ThemeKey[];

export function HomeBlockCustomizer({
    blockId,
    override,
    onChange,
    compact,
}: {
    blockId: HomeWidgetId | 'dockShell';
    override?: HomeBlockStyleOverride;
    onChange: (partial: HomeBlockStyleOverride) => void;
    compact?: boolean;
}) {
    const { settings } = useLawyerSettings();
    const accent = override?.accentColor ?? '';
    const activeTheme = settings.appearance.theme;
    const themePrimary = settings.appearance.brandColor || LAWYER_THEME_TOKENS[activeTheme]?.primary || '#E6C673';
    const resolvedAccent = resolveHomeBlockAccent(override, themePrimary);
    const baseColor = resolveLawyerSurfaceBaseColor(
        settings.appearance.theme,
        settings.appearance.themeMode,
        hasPersistedWallpaper(),
    );
    const patternOpacity = normalizeBackgroundPatternOpacity(
        override?.patternOpacity ?? settings.appearance.backgroundPatternOpacity,
    );
    const glassOpacity = normalizeGlassOpacity(override?.glassOpacity ?? settings.appearance.glassOpacity);

    const widgetZone =
        blockId !== 'dockShell' && isHomeWidgetId(blockId)
            ? getWidgetZone(settings.homeLayout.placements, blockId)
            : 'main';
    const inDockZone = widgetZone === 'dock';

    return (
        <div className={`space-y-4 ${compact ? '' : 'pt-1'}`}>
            <div>
                <p className="text-[10px] text-white/45 mb-2">ألوان الثيم</p>
                <div className="grid grid-cols-5 gap-1.5">
                    {THEME_KEYS.slice(0, 10).map((key) => {
                        const token = LAWYER_THEME_TOKENS[key];
                        const active = accent.toLowerCase() === token.primary.toLowerCase();
                        return (
                            <button
                                key={key}
                                type="button"
                                title={token.name}
                                onClick={() => onChange({ accentColor: token.primary })}
                                className={`h-9 rounded-lg border transition-all ${
                                    active ? 'ring-2 ring-[#E6C673]/50 scale-105' : 'border-white/10'
                                }`}
                                style={{ background: `linear-gradient(135deg, ${token.bg}, ${token.primary}88)` }}
                            />
                        );
                    })}
                </div>
            </div>

            <div>
                <p className="text-[10px] text-white/45 mb-2">لون مميز</p>
                <div className="flex flex-wrap gap-2">
                    {HOME_BLOCK_ACCENT_PRESETS.map((preset) => {
                        const active =
                            preset.id === 'inherit'
                                ? !accent
                                : accent.toLowerCase() === preset.color.toLowerCase();
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() =>
                                    onChange({
                                        accentColor: preset.id === 'inherit' ? undefined : preset.color,
                                    })
                                }
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                                    active
                                        ? 'border-[#E6C673]/50 bg-[#E6C673]/12 text-white'
                                        : 'border-white/[0.08] text-white/55'
                                }`}
                            >
                                {preset.color ? (
                                    <span
                                        className="w-3 h-3 rounded-full ring-1 ring-white/20"
                                        style={{ background: preset.color }}
                                        aria-hidden
                                    />
                                ) : (
                                    <Sparkles size={12} className="text-[#E6C673]/80" aria-hidden />
                                )}
                                {preset.label}
                            </button>
                        );
                    })}
                </div>
                <input
                    type="color"
                    value={accent || LAWYER_THEME_TOKENS[activeTheme]?.primary || '#E6C673'}
                    onChange={(e) => onChange({ accentColor: e.target.value })}
                    className="mt-2 w-full h-9 rounded-xl cursor-pointer bg-transparent border border-white/[0.08]"
                    aria-label="لون مخصص"
                />
            </div>

            <div>
                <p className="text-[10px] text-white/45 mb-2">خلفيات وزخارف</p>
                <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto scrollbar-hide">
                    {BACKGROUND_PRESETS.map((preset) => {
                        const active = override?.backgroundPreset === preset.id;
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => onChange({ backgroundPreset: preset.id })}
                                className={`h-10 rounded-lg text-[8px] font-bold border transition-all overflow-hidden relative ${
                                    active ? 'ring-2 ring-[#E6C673]/45 border-[#E6C673]/40' : 'border-white/10 text-white/50'
                                }`}
                                style={resolvePatternPreviewStyle(
                                    normalizeBackgroundPreset(preset.id),
                                    resolvedAccent,
                                    baseColor,
                                    patternOpacity,
                                    settings.appearance.themeMode,
                                )}
                            >
                                <span className="relative z-[1] drop-shadow-sm">{preset.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <SliderRow
                label="حدة الزخرفة"
                hint="وضوح النمط على هذه البطاقة — ارفعها للحدة أو خفّضها للنعومة"
                value={patternOpacity}
                min={BACKGROUND_PATTERN_OPACITY_MIN}
                max={BACKGROUND_PATTERN_OPACITY_MAX}
                step={0.01}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => onChange({ patternOpacity: v })}
            />

            <SliderRow
                label="كثافة الحاوية"
                hint="شفافية/كثافة الزجاج لهذه البطاقة — اخفض للشفافية، ارفع للكثافة"
                value={glassOpacity}
                min={GLASS_OPACITY_MIN}
                max={GLASS_OPACITY_MAX}
                step={0.01}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => onChange({ glassOpacity: v })}
            />

            {blockId === 'dockShell' ? (
                <div>
                    <p className="text-[10px] text-white/45 mb-2">حجم الحاوية</p>
                    <Segmented
                        value={override?.size ?? 'normal'}
                        options={(
                            Object.entries(HOME_BLOCK_SIZE_LABELS) as [HomeBlockSize, string][]
                        ).map(([value, label]) => ({ value, label }))}
                        onChange={(size) => onChange({ size })}
                    />
                    <SliderRow
                        label="موضع الشريط"
                        hint="ارفع أو اخفض الشريط بصرياً — أو اسحب مقبض ≡ أعلى الحاوية"
                        value={override?.dockLiftPx ?? 0}
                        min={-80}
                        max={140}
                        step={1}
                        format={(v) => `${v}px`}
                        onChange={(dockLiftPx) => onChange({ dockLiftPx })}
                    />
                    <p className="text-[10px] text-white/40 mt-2 leading-relaxed">
                        اسحب أيقونات الدوك لإعادة ترتيبها بين الشريط والرئيسية.
                    </p>
                </div>
            ) : null}

            {blockId === 'dockQuickNote' && inDockZone ? (
                <SliderRow
                    label="موضع شريط الملاحظة"
                    hint="ارفع الشريط بعيداً عن حاوية الأيقونات — يُحفظ بعد إعادة التشغيل"
                    value={override?.dockLiftPx ?? 0}
                    min={0}
                    max={140}
                    step={1}
                    format={(v) => `${v}px`}
                    onChange={(dockLiftPx) => onChange({ dockLiftPx })}
                />
            ) : null}

            {inDockZone && blockId !== 'dockShell' && blockId !== 'dockQuickNote' ? (
                <p className="text-[10px] text-white/40 leading-relaxed">
                    في الشريط السفلي: العرض والارتفاع ثابتان — الألوان والشكل والنمط فقط.
                </p>
            ) : blockId !== 'dockShell' && blockId !== 'dockQuickNote' && isHomeWidgetId(blockId) ? (
                <p className="text-[10px] text-white/40 leading-relaxed">
                    العرض (نصف / كامل) من شريط البطاقة — الألوان والشكل والنمط من هنا.
                </p>
            ) : null}

            {blockId !== 'dockShell' && isHomeWidgetId(blockId) && isHeightProtectedWidget(blockId) ? (
                <p className="text-[10px] text-white/40 leading-relaxed">
                    ارتفاع التنبيهات ثابت لحماية المحتوى — يمكنك تغيير الشكل والنمط والألوان.
                </p>
            ) : null}

            <div>
                <p className="text-[10px] text-white/45 mb-2">الشكل</p>
                <Segmented
                    value={override?.shape ?? 'rounded'}
                    options={(
                        Object.entries(HOME_BLOCK_SHAPE_LABELS) as [HomeBlockShape, string][]
                    ).map(([value, label]) => ({ value, label }))}
                    onChange={(shape) => onChange({ shape })}
                />
            </div>

            <div>
                <p className="text-[10px] text-white/45 mb-2">النمط</p>
                <Segmented
                    value={override?.pattern ?? 'glass'}
                    options={(
                        Object.entries(HOME_BLOCK_PATTERN_LABELS) as [HomeBlockPattern, string][]
                    ).map(([value, label]) => ({ value, label }))}
                    onChange={(pattern) => onChange({ pattern })}
                />
            </div>

            <div>
                <p className="text-[10px] text-white/45 mb-2">إطار الحاوية</p>
                <Segmented
                    value={
                        override?.containerBorder === undefined
                            ? 'inherit'
                            : override.containerBorder
                              ? 'on'
                              : 'off'
                    }
                    options={[
                        { value: 'inherit', label: 'عام' },
                        { value: 'on', label: 'إظهار' },
                        { value: 'off', label: 'إخفاء' },
                    ]}
                    onChange={(mode) => {
                        if (mode === 'inherit') onChange({ containerBorder: undefined });
                        else onChange({ containerBorder: mode === 'on' });
                    }}
                />
                <p className="text-[10px] text-white/35 mt-1.5 leading-relaxed">
                    {override?.containerBorder === undefined
                        ? `يتبع الإعداد العام (${settings.appearance.homeContainerBorder !== false ? 'مُفعّل' : 'مُخفى'})`
                        : 'تجاوز محلي لهذه البطاقة فقط'}
                </p>
            </div>

            <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-white/60">إظهار</span>
                <Toggle
                    checked={override?.visible !== false}
                    onChange={(visible) => onChange({ visible })}
                />
            </div>
        </div>
    );
}
