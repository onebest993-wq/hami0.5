import { describe, expect, it } from 'vitest';
import {
    defaultProfilePageCustomization,
    normalizeProfilePageCustomization,
} from '../profilePageCustomization';

describe('normalizeProfilePageCustomization (P0)', () => {
    it('returns defaults for null and non-object input', () => {
        const defaults = defaultProfilePageCustomization();
        expect(normalizeProfilePageCustomization(null)).toEqual(defaults);
        expect(normalizeProfilePageCustomization(undefined)).toEqual(defaults);
        expect(normalizeProfilePageCustomization('bad')).toEqual(defaults);
    });

    it('coerces privacy flags — explicit false stays false', () => {
        const next = normalizeProfilePageCustomization({
            privacy: {
                showContactChannels: false,
                showGallery: false,
                showCustomBlocks: false,
                showPhoneMeta: false,
            },
        });
        expect(next.privacy.showContactChannels).toBe(false);
        expect(next.privacy.showGallery).toBe(false);
        expect(next.privacy.showCustomBlocks).toBe(false);
        expect(next.privacy.showPhoneMeta).toBe(false);
    });

    it('filters hiddenContactIds to strings only', () => {
        const next = normalizeProfilePageCustomization({
            privacy: { hiddenContactIds: ['a1', 2, null, 'a2'] as unknown as string[] },
        });
        expect(next.privacy.hiddenContactIds).toEqual(['a1', 'a2']);
    });

    it('falls back invalid appearance to gold/glass', () => {
        const next = normalizeProfilePageCustomization({
            appearance: { accentColor: 'invalid' as never, material: 'unknown' as never },
        });
        expect(next.appearance).toEqual({
            accentColor: 'gold',
            material: 'glass',
            portraitFrame: 'classic',
        });
    });

    it('rejects unsafe image and canvas URLs', () => {
        const next = normalizeProfilePageCustomization({
            customBlocks: [
                {
                    id: 'b1',
                    kind: 'image',
                    title: 'x',
                    shape: 'rounded',
                    width: 'full',
                    minHeightPx: 120,
                    imageUrl: 'javascript:alert(1)',
                },
                {
                    id: 'b2',
                    kind: 'text',
                    title: 'y',
                    shape: 'rounded',
                    width: 'full',
                    minHeightPx: 120,
                    body: 'hello',
                    canvasStyle: {
                        enabled: true,
                        backgroundImage: 'https://cdn.example.com/bg.png',
                        backgroundColor: 'red);url(',
                    },
                },
            ],
        });

        expect(next.customBlocks[0]?.imageUrl).toBeUndefined();
        expect(next.customBlocks[1]?.canvasStyle?.backgroundImage).toBe('https://cdn.example.com/bg.png');
        expect(next.customBlocks[1]?.canvasStyle?.backgroundColor).toBe('rgba(10,15,28,0.62)');
    });

    it('migrates legacy offsets and polaroid template', () => {
        const next = normalizeProfilePageCustomization({
            customBlocks: [
                {
                    id: 'legacy',
                    kind: 'text',
                    title: 't',
                    shape: 'rounded',
                    width: 'full',
                    minHeightPx: 120,
                    offsetX: 12,
                    offsetY: -6,
                },
                {
                    id: 'img',
                    kind: 'image',
                    title: 'pic',
                    shape: 'rounded',
                    width: 'full',
                    minHeightPx: 120,
                    imageUrl: 'https://cdn.example.com/a.jpg',
                    mediaTemplate: 'polaroid',
                },
            ],
        });
        const text = next.customBlocks[0];
        const image = next.customBlocks[1];
        expect(typeof text?.posX).toBe('number');
        expect(typeof text?.posY).toBe('number');
        expect(image?.mediaTemplate).toBe('arch');
    });

    it('clamps block layout and image focus/zoom', () => {
        const next = normalizeProfilePageCustomization({
            customBlocks: [
                {
                    id: 'b',
                    kind: 'image',
                    title: 'z',
                    shape: 'rounded',
                    width: 'full',
                    minHeightPx: 9999,
                    imageHeightPx: 10,
                    imageFocusX: -5,
                    imageFocusY: 150,
                    imageZoom: 500,
                    blockWidthPct: 5,
                    posX: 200,
                    posY: -10,
                },
            ],
        });
        const b = next.customBlocks[0]!;
        expect(b.minHeightPx).toBeLessThanOrEqual(480);
        expect(b.imageHeightPx).toBeGreaterThanOrEqual(72);
        expect(b.imageFocusX).toBe(0);
        expect(b.imageFocusY).toBe(100);
        expect(b.imageZoom).toBe(220);
        expect(b.blockWidthPct).toBeGreaterThanOrEqual(28);
        expect(b.posX).toBeLessThanOrEqual(94);
        expect(b.posY).toBeGreaterThanOrEqual(0);
    });

    it('يستبدل posX/posY غير المحدودة (NaN) بموضع افتراضي', () => {
        const next = normalizeProfilePageCustomization({
            customBlocks: [
                {
                    id: 'nan',
                    kind: 'text',
                    title: 'نص',
                    shape: 'rounded',
                    width: 'full',
                    minHeightPx: 120,
                    posX: Number.NaN,
                    posY: Number.NaN,
                },
            ],
        });
        expect(Number.isFinite(next.customBlocks[0]?.posX)).toBe(true);
        expect(Number.isFinite(next.customBlocks[0]?.posY)).toBe(true);
    });

    it('infers image kind from imageUrl when kind missing', () => {
        const next = normalizeProfilePageCustomization({
            customBlocks: [
                {
                    id: 'infer',
                    title: 'pic',
                    shape: 'rounded',
                    width: 'full',
                    minHeightPx: 120,
                    imageUrl: 'https://cdn.example.com/x.png',
                },
            ],
        });
        expect(next.customBlocks[0]?.kind).toBe('image');
    });
});
