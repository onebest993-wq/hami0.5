import React, { useEffect, useMemo } from 'react';
import type { ProfileBlockTextStyle, ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import {
    PROFILE_FONT_SIZES,
    PROFILE_TEXT_EFFECTS,
    PROFILE_TEXT_FONTS,
} from '@/app/services/profile/profilePageCustomization';
import { scheduleDeferredGoogleFonts } from '@/app/runtime/deferredGoogleFonts';
import {
    patchStyleForScope,
    resolveActiveTextStyle,
    TEXT_STYLE_PRESETS,
    type TextStyleScope,
} from './patchTextBlockStyle';
import { tokenizeTextPhrases } from './tokenizeTextPhrases';
import { TextBlockStyleScopeTabs } from './TextBlockStyleScopeTabs';

type TextBlockStylePanelProps = {
    block: ProfileCustomBlock;
    scope: TextStyleScope;
    lineIndex: number;
    phraseRange: { start: number; end: number } | null;
    lines: string[];
    onScopeChange: (scope: TextStyleScope) => void;
    onLineIndexChange: (index: number) => void;
    onPhraseRangeChange: (range: { start: number; end: number } | null) => void;
    onChange: (patch: Partial<ProfileCustomBlock>) => void;
};

export function TextBlockStylePanel({
    block,
    scope,
    lineIndex,
    phraseRange,
    lines,
    onScopeChange,
    onLineIndexChange,
    onPhraseRangeChange,
    onChange,
}: TextBlockStylePanelProps) {
    useEffect(() => {
        scheduleDeferredGoogleFonts();
    }, []);

    const activeStyle = useMemo(
        () => resolveActiveTextStyle(block, scope, lineIndex, phraseRange),
        [block, scope, lineIndex, phraseRange],
    );

    const phraseTokens = useMemo(
        () => tokenizeTextPhrases(lines[lineIndex] ?? ''),
        [lines, lineIndex],
    );

    const applyStylePatch = (stylePatch: ProfileBlockTextStyle) => {
        patchStyleForScope(block, scope, lineIndex, phraseRange, stylePatch, onChange);
    };

    return (
        <div className="profile-studio-panel space-y-3" data-testid="text-block-style-panel">
            <TextBlockStyleScopeTabs
                scope={scope}
                onScopeChange={onScopeChange}
                onPhraseRangeChange={onPhraseRangeChange}
            />

            {scope === 'line' || scope === 'phrase' ? (
                <div>
                    <p className="profile-studio-field-label">السطر</p>
                    <div className="profile-studio-line-chip-row">
                        {lines.map((line, index) => (
                            <button
                                key={index}
                                type="button"
                                data-active={lineIndex === index ? 'true' : 'false'}
                                data-testid={`text-style-line-${index}`}
                                className="profile-studio-line-chip min-h-[44px]"
                                onClick={() => {
                                    onLineIndexChange(index);
                                    onPhraseRangeChange(null);
                                }}
                            >
                                {line.trim() ? line.slice(0, 28) : `سطر ${index + 1}`}
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}

            {scope === 'phrase' ? (
                <div>
                    <p className="profile-studio-field-label">اختر كلمة أو مقطعاً</p>
                    <div className="flex flex-wrap gap-1.5">
                        {phraseTokens.length === 0 ? (
                            <p className="text-[10px] text-white/35">اكتب نصاً في السطر أولاً</p>
                        ) : (
                            phraseTokens.map((token) => {
                                const active =
                                    phraseRange?.start === token.start && phraseRange?.end === token.end;
                                return (
                                    <button
                                        key={`${token.start}-${token.end}`}
                                        type="button"
                                        data-active={active ? 'true' : 'false'}
                                        data-testid={`text-style-phrase-${token.start}`}
                                        className="profile-studio-word-chip min-h-[44px]"
                                        onClick={() =>
                                            onPhraseRangeChange({ start: token.start, end: token.end })
                                        }
                                    >
                                        {token.text}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            ) : null}

            <div className="profile-settings-quick-presets">
                {TEXT_STYLE_PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        type="button"
                        data-testid={`text-style-preset-${preset.id}`}
                        className="profile-settings-quick-preset min-h-[44px]"
                        onClick={() => applyStylePatch(preset.style)}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            <div>
                <p className="profile-studio-field-label">اللون</p>
                <label className="profile-studio-color-picker" data-testid="text-style-color-wrap">
                    <span className="profile-studio-color-picker__orb" aria-hidden>
                        <input
                            type="color"
                            value={activeStyle.color ?? '#ffffff'}
                            onChange={(e) => applyStylePatch({ color: e.target.value })}
                            className="profile-studio-color-swatch"
                            data-testid="text-style-color"
                            aria-label="لون النص"
                        />
                    </span>
                    <span className="profile-studio-color-picker__meta">
                        <span className="profile-studio-color-picker__title">اختر لوناً</span>
                        <span className="profile-studio-color-picker__hint">اضغط لتغيير اللون</span>
                    </span>
                </label>
            </div>

            <div>
                <p className="profile-studio-field-label">الحجم</p>
                <div className="profile-studio-option-grid profile-studio-option-grid--sizes">
                    {PROFILE_FONT_SIZES.map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            data-selected={(activeStyle.fontSize ?? 'base') === f.id ? 'true' : 'false'}
                            data-testid={`text-style-size-${f.id}`}
                            className={`profile-studio-option-chip ${f.className}`}
                            onClick={() =>
                                applyStylePatch({
                                    fontSize: f.id,
                                })
                            }
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="profile-studio-field-label">الخط</p>
                <div className="profile-studio-option-grid profile-studio-option-grid--fonts">
                    {PROFILE_TEXT_FONTS.map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            data-selected={(activeStyle.fontFamily ?? 'literary') === f.id ? 'true' : 'false'}
                            data-testid={`text-style-font-${f.id}`}
                            className={`profile-studio-option-chip profile-studio-option-chip--font ${f.className}`}
                            onClick={() =>
                                applyStylePatch({
                                    fontFamily: f.id,
                                })
                            }
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="profile-studio-field-label">التأثير</p>
                <div
                    className="profile-studio-option-grid profile-studio-option-grid--effects"
                    style={
                        {
                            '--profile-block-text-color': activeStyle.color ?? '#ffffff',
                        } as React.CSSProperties
                    }
                >
                    {PROFILE_TEXT_EFFECTS.map((effect) => (
                        <button
                            key={effect.id}
                            type="button"
                            data-selected={(activeStyle.effect ?? 'none') === effect.id ? 'true' : 'false'}
                            data-testid={`text-style-effect-${effect.id}`}
                            className={`profile-studio-option-chip profile-studio-option-chip--effect ${
                                effect.id === 'glow'
                                    ? 'hami-profile-block-text--glow'
                                    : effect.id === 'underline'
                                      ? 'hami-profile-block-text--underline'
                                      : effect.id === 'shadow'
                                        ? 'hami-profile-block-text--shadow'
                                        : ''
                            }`}
                            onClick={() =>
                                applyStylePatch({
                                    effect: effect.id,
                                })
                            }
                        >
                            {effect.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
