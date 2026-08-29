/**
 * Lawsuit visual language — lighter + modern (2026-08-22).
 * Explicit design permission: reduce glass weight while keeping navy/gold brand.
 * Prefer these tokens from lawsuit chrome/themes; do not invent heavier stacks.
 */

/** Soft elevated navy plane — primary card/shell */
export const LV_SURFACE =
    'bg-[linear-gradient(165deg,rgba(16,22,36,0.97),rgba(10,15,28,0.99))] border border-white/[0.08]';

/** Gold hairline accent (replaces heavy radial gold wash) */
export const LV_SURFACE_GOLD =
    'bg-[linear-gradient(165deg,rgba(18,24,38,0.98),rgba(10,15,28,0.99))] border border-[#E6C673]/18';

/** Nested modal shell — fully opaque (no see-through over dossier) */
export const LV_SURFACE_GOLD_SOLID =
    'bg-[linear-gradient(165deg,#121826,#0A0F1C)] border border-[#E6C673]/18';

/** Blur budget: sm max on lawsuit shells (perf + lighter look) */
export const LV_BLUR = 'backdrop-blur-sm';

export const LV_BLUR_SM = 'backdrop-blur-sm';

/** Modal / sheet elevation — soft, not black fog */
export const LV_ELEVATION =
    'shadow-[0_8px_22px_rgba(0,0,0,0.24),0_1px_0_rgba(255,255,255,0.04)_inset]';

export const LV_ELEVATION_SOFT =
    'shadow-[0_6px_16px_rgba(0,0,0,0.2),0_1px_0_rgba(255,255,255,0.04)_inset]';

/** Radius — slightly tighter than ornate 28px era */
export const LV_RADIUS = 'rounded-2xl';
export const LV_RADIUS_LG = 'rounded-[1.35rem]';

/** Field / chip / section micro-surfaces */
export const LV_INSET =
    'bg-white/[0.03] border border-white/[0.07]';

export const LV_INSET_HOVER =
    'hover:bg-white/[0.055] hover:border-white/[0.11]';

export const LV_GOLD_FOCUS =
    'focus:border-[#E6C673]/40 focus:bg-white/[0.045]';

/** Primary gold CTA — flat glass, no glow bloom */
export const LV_BTN_GOLD =
    'bg-[#E6C673]/12 border border-[#E6C673]/32 text-[#E6C673] hover:bg-[#E6C673]/20';

export const LV_CHIP_ACTIVE =
    'border border-[#E6C673]/32 bg-[#E6C673]/14 text-[#E6C673]';

/** Overlay scrim — readable, less ink */
export const LV_OVERLAY_SCRIM = 'bg-[#03050B]/68';
