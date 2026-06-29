import {
    PROFILE_FONT_SIZES,
    PROFILE_TEXT_FONTS,
} from './profilePageCatalog';
import type {
    ProfileBlockShape,
    ProfileBlockTextStyle,
    ProfileFontSize,
    ProfileMediaTemplate,
    ProfileTextEffect,
    ProfileTextFont,
} from './profilePageTypes';

export function mediaTemplateClipPath(template: ProfileMediaTemplate | undefined): string | undefined {
    switch (template) {
        case 'circle':
            return 'circle(50% at 50% 50%)';
        case 'lens':
            return 'ellipse(46% 46% at 50% 50%)';
        case 'flower':
            return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
        case 'star':
            return 'polygon(50% 0%, 58% 32%, 95% 25%, 68% 50%, 95% 75%, 58% 68%, 50% 100%, 42% 68%, 5% 75%, 32% 50%, 5% 25%, 42% 32%)';
        case 'crest':
            return 'polygon(50% 0%, 92% 18%, 100% 58%, 50% 100%, 0% 58%, 8% 18%)';
        case 'diamond':
            return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
        case 'hexagon':
            return 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)';
        case 'temple':
            return 'polygon(0% 100%, 0% 38%, 50% 0%, 100% 38%, 100% 100%)';
        case 'arch':
            return 'ellipse(50% 42% at 50% 50%)';
        case 'cinema':
            return 'inset(0 round 10px)';
        case 'vault':
            return 'inset(4% round 22px)';
        case 'perspective':
            return undefined;
        default:
            return 'inset(0 round 14px)';
    }
}

export function mediaTemplateUsesAspectRatio(template: ProfileMediaTemplate | undefined): boolean {
    return template === 'cinema';
}

export function mediaTemplateAspectRatio(template: ProfileMediaTemplate | undefined): string | undefined {
    if (template === 'cinema') return '2.35 / 1';
    return undefined;
}

export function mediaTemplateClass(template: ProfileMediaTemplate | undefined): string {
    if (template === 'perspective') {
        return 'transform [transform-style:preserve-3d] perspective-[500px] rotate-y-[-10deg] rotate-x-[6deg] shadow-[0_18px_40px_rgba(0,0,0,0.45)]';
    }
    return '';
}

export function blockShapeClass(shape: ProfileBlockShape): string {
    switch (shape) {
        case 'pill':
            return 'rounded-[2rem]';
        case 'circle':
            return 'rounded-full max-w-[220px] mx-auto';
        case 'diamond':
        case 'hexagon':
            return '';
        default:
            return 'rounded-2xl';
    }
}

export function blockTextEffectClass(effect: ProfileTextEffect | undefined): string {
    switch (effect) {
        case 'glow':
            return 'hami-profile-block-text--glow';
        case 'gradient':
            return 'hami-profile-block-text--gradient';
        case 'underline':
            return 'hami-profile-block-text--underline';
        case 'shadow':
            return 'hami-profile-block-text--shadow';
        default:
            return '';
    }
}

export function blockFontSizeClass(size: ProfileFontSize | undefined): string {
    return PROFILE_FONT_SIZES.find((f) => f.id === size)?.className ?? 'text-sm';
}

export function blockFontFamilyClass(family: ProfileTextFont | undefined): string {
    return PROFILE_TEXT_FONTS.find((f) => f.id === family)?.className ?? PROFILE_TEXT_FONTS[0].className;
}

export function blockTextAlignClass(align: ProfileBlockTextStyle['align']): string {
    if (align === 'center') return 'text-center';
    if (align === 'left') return 'text-left';
    return 'text-right';
}
