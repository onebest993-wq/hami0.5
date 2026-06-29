import React from 'react';
import type { ProfileBlockTextStyle } from '@/app/services/profile/profilePageCustomization';
import {
    blockFontSizeClass,
    blockTextAlignClass,
    blockTextEffectClass,
} from '@/app/services/profile/profilePageCustomization';

type ProfileBlockTextProps = {
    text: string;
    style?: ProfileBlockTextStyle;
    className?: string;
};

export function ProfileBlockText({ text, style, className = '' }: ProfileBlockTextProps) {
    if (!text.trim()) return null;

    const textColor = style?.color ?? 'var(--profile-accent)';
    const effectClass = blockTextEffectClass(style?.effect);
    const sizeClass = blockFontSizeClass(style?.fontSize);
    const alignClass = blockTextAlignClass(style?.align);
    const weightClass = style?.fontWeight === 'bold' ? 'font-bold' : 'font-normal';

    return (
        <p
            className={`leading-relaxed whitespace-pre-wrap ${sizeClass} ${alignClass} ${weightClass} ${effectClass} ${className}`}
            style={{ '--profile-block-text-color': textColor, color: textColor } as React.CSSProperties}
        >
            {text}
        </p>
    );
}
