import { normalizeBackgroundPatternOpacity } from './surfaceAppearance';

export type PatternIntensityId = 'light' | 'medium' | 'clear';

export const PATTERN_INTENSITY_PRESETS: ReadonlyArray<{
    id: PatternIntensityId;
    label: string;
    opacity: number;
}> = [
    { id: 'light', label: 'خفيف', opacity: 0.08 },
    { id: 'medium', label: 'متوسط', opacity: 0.32 },
    { id: 'clear', label: 'واضح', opacity: 0.78 },
];

export function patternIntensityToOpacity(id: PatternIntensityId): number {
    return PATTERN_INTENSITY_PRESETS.find((p) => p.id === id)?.opacity ?? 0.45;
}

export function opacityToPatternIntensity(opacity: unknown): PatternIntensityId {
    const n = normalizeBackgroundPatternOpacity(opacity);
    if (n <= 0.18) return 'light';
    if (n <= 0.52) return 'medium';
    return 'clear';
}
