/**
 * Theme / shape appearance types.
 */

export interface ThemeConfig {
    name?: string;
    primary: string;
    secondary: string;
    /** Lawyer dashboard themes use `bg`; other screens may use `background`. */
    background?: string;
    bg?: string;
    text?: string;
    border?: string;
    accent?: string;
}

export type ThemeMode = 'light' | 'dark' | 'auto';
/** Aligned with `THEMES` keys in `LawyerShared.tsx`. */
export type ThemeKey =
    | 'gold'
    | 'navy'
    | 'crimson'
    | 'emerald'
    | 'black'
    | 'silver'
    | 'sky'
    | 'brown'
    | 'purple'
    | 'bronze'
    | 'wine'
    | 'matcha'
    | 'teal'
    | 'greige'
    | 'obsidian'
    | 'coral'
    | 'plum'
    | 'brass'
    | 'chalk'
    | 'ice';
export type ShapeKey = 'pill' | 'rounded' | 'square' | 'circle';
