import React, { useMemo } from 'react';
import type {
    ProfileBlockTextStyle,
    ProfileCustomBlock,
    ProfileTextSpanStyle,
} from '@/app/services/profile/profilePageCustomization';
import {
    blockFontFamilyClass,
    blockFontSizeClass,
    blockTextAlignClass,
    blockTextEffectClass,
    mergeBlockTextStyles,
} from '@/app/services/profile/profilePageCustomization';

type ProfileFreeTextProps = {
    block: ProfileCustomBlock;
    className?: string;
};

function spanStyleToCss(style: ProfileBlockTextStyle): React.CSSProperties {
    const textColor = style.color ?? '#ffffff';
    return {
        color: textColor,
        lineHeight: style.lineHeight ?? undefined,
        letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : undefined,
        ['--profile-block-text-color' as string]: textColor,
    };
}

function StyledTextSpan({
    text,
    style,
}: {
    text: string;
    style: ProfileBlockTextStyle;
}) {
    const effectClass = blockTextEffectClass(style.effect);
    const sizeClass = blockFontSizeClass(style.fontSize);
    const weightClass = style.fontWeight === 'bold' ? 'font-bold' : 'font-normal';
    const fontClass = blockFontFamilyClass(style.fontFamily);

    return (
        <span
            className={`${fontClass} ${sizeClass} ${weightClass} ${effectClass}`}
            style={spanStyleToCss(style)}
        >
            {text}
        </span>
    );
}

function FreeTextLine({
    text,
    style,
    lineIndex,
    spans,
}: {
    text: string;
    style: ProfileBlockTextStyle;
    lineIndex: number;
    spans?: ProfileTextSpanStyle[];
}) {
    const effectClass = blockTextEffectClass(style.effect);
    const sizeClass = blockFontSizeClass(style.fontSize);
    const alignClass = blockTextAlignClass(style.align);
    const weightClass = style.fontWeight === 'bold' ? 'font-bold' : 'font-normal';
    const fontClass = blockFontFamilyClass(style.fontFamily);

    const lineSpans = useMemo(
        () =>
            (spans ?? [])
                .filter((s) => s.lineIndex === lineIndex && s.end > s.start)
                .sort((a, b) => a.start - b.start),
        [spans, lineIndex],
    );

    if (lineSpans.length === 0) {
        return (
            <p
                className={`hami-profile-free-text-line ${fontClass} ${sizeClass} ${alignClass} ${weightClass} ${effectClass}`}
                style={spanStyleToCss(style)}
            >
                {text || '\u00A0'}
            </p>
        );
    }

    const parts: { text: string; style: ProfileBlockTextStyle }[] = [];
    let cursor = 0;
    for (const span of lineSpans) {
        const start = Math.max(0, Math.min(span.start, text.length));
        const end = Math.max(start, Math.min(span.end, text.length));
        if (start > cursor) {
            parts.push({ text: text.slice(cursor, start), style });
        }
        if (end > start) {
            parts.push({
                text: text.slice(start, end),
                style: mergeBlockTextStyles(style, span.style),
            });
        }
        cursor = Math.max(cursor, end);
    }
    if (cursor < text.length) {
        parts.push({ text: text.slice(cursor), style });
    }

    return (
        <p
            className={`hami-profile-free-text-line ${fontClass} ${sizeClass} ${alignClass} ${weightClass}`}
            style={spanStyleToCss(style)}
        >
            {parts.map((part, index) => (
                <StyledTextSpan key={`${index}-${part.text.slice(0, 8)}`} text={part.text} style={part.style} />
            ))}
            {!text ? '\u00A0' : null}
        </p>
    );
}

export function ProfileFreeText({ block, className = '' }: ProfileFreeTextProps) {
    const baseStyle: ProfileBlockTextStyle = {
        fontSize: 'lg',
        effect: 'none',
        align: 'right',
        color: '#ffffff',
        fontFamily: 'literary',
        lineHeight: 1.85,
        ...block.bodyStyle,
    };

    const raw = block.body?.trim();
    if (!raw) return null;

    const lines = raw.split('\n');

    return (
        <div
            data-profile-free-text
            className={`hami-profile-free-text ${className}`}
            style={{
                textAlign:
                    baseStyle.align === 'center' ? 'center' : baseStyle.align === 'left' ? 'left' : 'right',
            }}
        >
            {lines.map((line, index) => (
                <FreeTextLine
                    key={`${index}-${line.slice(0, 12)}`}
                    text={line}
                    lineIndex={index}
                    spans={block.textSpans}
                    style={mergeBlockTextStyles(baseStyle, block.lineStyles?.[index])}
                />
            ))}
        </div>
    );
}
