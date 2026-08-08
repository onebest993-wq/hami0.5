import { normalizeGlassOpacity } from './surfaceAppearance';

/** شفافية الحاويات — خفيف = أكثر شفافية (قيمة أقل) */
export type GlassTransparencyId = 'light' | 'medium' | 'clear';

export const GLASS_TRANSPARENCY_PRESETS: ReadonlyArray<{
    id: GlassTransparencyId;
    label: string;
    opacity: number;
}> = [
    { id: 'light', label: 'خفيف', opacity: 0.1 },
    { id: 'medium', label: 'متوسط', opacity: 0.42 },
    { id: 'clear', label: 'واضح', opacity: 0.85 },
];

export function glassTransparencyToOpacity(id: GlassTransparencyId): number {
    return GLASS_TRANSPARENCY_PRESETS.find((p) => p.id === id)?.opacity ?? 0.68;
}

export function opacityToGlassTransparency(opacity: unknown): GlassTransparencyId {
    const n = normalizeGlassOpacity(opacity);
    if (n <= 0.22) return 'light';
    if (n <= 0.62) return 'medium';
    return 'clear';
}
