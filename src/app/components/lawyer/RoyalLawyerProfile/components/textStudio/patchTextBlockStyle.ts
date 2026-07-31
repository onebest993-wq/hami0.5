import type { ProfileBlockTextStyle, ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import { mergeBlockTextStyles } from '@/app/services/profile/profilePageCustomization';
import type { ProfileTextSpanStyle } from '@/app/services/profile/profilePageTypes';

export type TextStyleScope = 'all' | 'line' | 'phrase';

export const TEXT_STYLE_PRESETS: { id: string; label: string; style: ProfileBlockTextStyle }[] = [
    {
        id: 'literary',
        label: 'أدبي',
        style: {
            fontFamily: 'literary',
            fontSize: 'lg',
            align: 'right',
            lineHeight: 1.9,
            color: '#ffffff',
            effect: 'none',
        },
    },
    {
        id: 'bold',
        label: 'عريض',
        style: {
            fontFamily: 'cairo',
            fontSize: '2xl',
            fontWeight: 'bold',
            align: 'center',
            color: '#ffffff',
            effect: 'shadow',
        },
    },
    {
        id: 'glow',
        label: 'متوهج',
        style: {
            fontFamily: 'tajawal',
            fontSize: 'base',
            align: 'right',
            color: '#E6C673',
            effect: 'glow',
        },
    },
];

export function patchStyleForScope(
    block: ProfileCustomBlock,
    scope: TextStyleScope,
    lineIndex: number,
    phraseRange: { start: number; end: number } | null,
    stylePatch: ProfileBlockTextStyle,
    onChange: (patch: Partial<ProfileCustomBlock>) => void,
) {
    const base = {
        fontSize: 'lg' as const,
        effect: 'none' as const,
        align: 'right' as const,
        color: '#ffffff',
        fontFamily: 'literary' as const,
        lineHeight: 1.85,
        ...block.bodyStyle,
    };

    /** بدون تحديد مقطع → طبّق على كامل النص */
    const effectiveScope: TextStyleScope =
        scope === 'phrase' && !phraseRange ? 'all' : scope;

    if (effectiveScope === 'all') {
        onChange({
            bodyStyle: mergeBlockTextStyles(base, stylePatch),
            lineStyles: [],
            textSpans: [],
        });
        return;
    }

    if (effectiveScope === 'line') {
        const lineStyles = [...(block.lineStyles ?? [])];
        while (lineStyles.length <= lineIndex) lineStyles.push({});
        /* خزّن فرق السطر فقط — لا تكرار body كامل */
        lineStyles[lineIndex] = mergeBlockTextStyles(lineStyles[lineIndex], stylePatch);
        onChange({
            lineStyles,
            /* امسح مقاطع نفس السطر حتى لا تغطي تنسيق السطر */
            textSpans: (block.textSpans ?? []).filter((s) => s.lineIndex !== lineIndex),
        });
        return;
    }

    if (!phraseRange) return;
    const spans = [...(block.textSpans ?? [])].filter(
        (s) =>
            !(
                s.lineIndex === lineIndex &&
                s.start < phraseRange.end &&
                s.end > phraseRange.start
            ),
    );
    const entry: ProfileTextSpanStyle = {
        id: `span-${Date.now()}`,
        lineIndex,
        start: phraseRange.start,
        end: phraseRange.end,
        style: mergeBlockTextStyles(base, stylePatch),
    };
    spans.push(entry);
    onChange({ textSpans: spans });
}

export function resolveActiveTextStyle(
    block: ProfileCustomBlock,
    scope: TextStyleScope,
    lineIndex: number,
    phraseRange: { start: number; end: number } | null,
): ProfileBlockTextStyle {
    const base = {
        fontSize: 'lg' as const,
        effect: 'none' as const,
        align: 'right' as const,
        color: '#ffffff',
        fontFamily: 'literary' as const,
        lineHeight: 1.85,
        ...block.bodyStyle,
    };
    if (scope === 'line') {
        return mergeBlockTextStyles(base, block.lineStyles?.[lineIndex]);
    }
    if (scope === 'phrase' && phraseRange) {
        const span = block.textSpans?.find(
            (s) =>
                s.lineIndex === lineIndex &&
                s.start === phraseRange.start &&
                s.end === phraseRange.end,
        );
        return mergeBlockTextStyles(base, span?.style);
    }
    return base;
}
