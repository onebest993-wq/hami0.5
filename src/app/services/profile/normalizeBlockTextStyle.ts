import { PROFILE_TEXT_EFFECTS, PROFILE_TEXT_FONTS } from './profilePageCatalog';
import type {
    ProfileBlockTextStyle,
    ProfileFontSize,
    ProfileTextSpanStyle,
} from './profilePageTypes';

function coerceProfileFontSize(raw: unknown): ProfileFontSize {
    switch (raw) {
        case 'xs':
            return 'xs';
        case 'sm':
        case 'base':
            return 'base';
        case 'lg':
        case 'xl':
            return 'lg';
        case '2xl':
        case '3xl':
            return '2xl';
        default:
            return 'base';
    }
}

export function normalizeBlockTextStyle(raw: unknown): ProfileBlockTextStyle | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as ProfileBlockTextStyle;
    /* placeholder فارغ من patchTextBlockStyle — لا تملأه بخطوط افتراضية تُفسد باقي الأسطر */
    if (Object.keys(o).length === 0) return {};

    const out: ProfileBlockTextStyle = {};
    if ('fontSize' in o) out.fontSize = coerceProfileFontSize(o.fontSize);
    if ('effect' in o) {
        out.effect = PROFILE_TEXT_EFFECTS.find((e) => e.id === o.effect)?.id ?? 'none';
    }
    if ('align' in o) {
        out.align = o.align === 'center' || o.align === 'left' ? o.align : 'right';
    }
    if ('fontWeight' in o) {
        out.fontWeight = o.fontWeight === 'bold' ? 'bold' : 'normal';
    }
    if ('color' in o) {
        out.color =
            typeof o.color === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(o.color) ? o.color : undefined;
    }
    if ('fontFamily' in o) {
        out.fontFamily = PROFILE_TEXT_FONTS.find((f) => f.id === o.fontFamily)?.id ?? 'literary';
    }
    if ('lineHeight' in o) {
        out.lineHeight =
            typeof o.lineHeight === 'number' ? Math.max(1, Math.min(3, o.lineHeight)) : undefined;
    }
    if ('letterSpacing' in o) {
        out.letterSpacing =
            typeof o.letterSpacing === 'number'
                ? Math.max(-1, Math.min(8, o.letterSpacing))
                : undefined;
    }
    return out;
}

export function mergeBlockTextStyles(
    base?: ProfileBlockTextStyle,
    override?: ProfileBlockTextStyle,
): ProfileBlockTextStyle {
    const result: ProfileBlockTextStyle = { ...(base ?? {}) };
    if (!override) return result;
    (Object.keys(override) as (keyof ProfileBlockTextStyle)[]).forEach((key) => {
        const value = override[key];
        if (value !== undefined) {
            (result as Record<string, unknown>)[key] = value;
        }
    });
    return result;
}

export function normalizeTextSpan(raw: unknown, index: number): ProfileTextSpanStyle | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as Partial<ProfileTextSpanStyle>;
    if (typeof o.lineIndex !== 'number' || typeof o.start !== 'number' || typeof o.end !== 'number') {
        return undefined;
    }
    const style = normalizeBlockTextStyle(o.style);
    if (!style) return undefined;
    const start = Math.max(0, Math.floor(o.start));
    const end = Math.max(start + 1, Math.floor(o.end));
    return {
        id: typeof o.id === 'string' ? o.id : `span-${index}`,
        lineIndex: Math.max(0, Math.floor(o.lineIndex)),
        start,
        end,
        style,
    };
}
