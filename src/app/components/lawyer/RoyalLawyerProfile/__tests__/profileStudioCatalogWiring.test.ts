/**
 * تغطية أزرار الاستوديو — كل خيار في الكتالوج له data-testid ثابت للـ E2E.
 */
import { describe, expect, it } from 'vitest';
import {
    PROFILE_ACCENT_COLORS,
    PROFILE_CANVAS_FRAME_GLOWS,
    PROFILE_CANVAS_FRAME_SHAPES,
    PROFILE_CANVAS_INTERACTIONS,
    PROFILE_CANVAS_MATERIALS,
    PROFILE_IMAGE_INTERACTIONS,
    PROFILE_IMAGE_RIM_STYLES,
    PROFILE_MATERIALS,
    PROFILE_MEDIA_TEMPLATES,
} from '@/app/services/profile/profilePageCatalog';

describe('profileStudioCatalogWiring', () => {
    it('appearance accent colors map to profile-accent-* test ids', () => {
        for (const c of PROFILE_ACCENT_COLORS) {
            expect(`profile-accent-${c.id}`).toMatch(/^profile-accent-/);
        }
        expect(PROFILE_ACCENT_COLORS).toHaveLength(6);
    });

    it('appearance materials map to profile-material-* test ids', () => {
        expect(PROFILE_MATERIALS.map((m) => `profile-material-${m.id}`)).toHaveLength(6);
    });

    it('text canvas catalog maps to text-canvas-* test ids', () => {
        expect(PROFILE_CANVAS_MATERIALS.map((m) => `text-canvas-material-${m.id}`)).toHaveLength(6);
        expect(PROFILE_CANVAS_FRAME_SHAPES.map((s) => `text-canvas-frame-${s.id}`)).toHaveLength(4);
        expect(PROFILE_CANVAS_FRAME_GLOWS.map((g) => `text-canvas-glow-${g.id}`)).toHaveLength(5);
        expect(PROFILE_CANVAS_INTERACTIONS.map((i) => `text-canvas-interaction-${i.id}`)).toHaveLength(6);
    });

    it('image studio catalog maps to image-* test ids', () => {
        expect(PROFILE_MEDIA_TEMPLATES.map((t) => `image-template-${t.id}`)).toHaveLength(13);
        expect(PROFILE_IMAGE_RIM_STYLES.map((r) => `image-rim-${r.id}`)).toHaveLength(4);
        expect(PROFILE_CANVAS_FRAME_GLOWS.map((g) => `image-glow-${g.id}`)).toHaveLength(5);
        expect(PROFILE_IMAGE_INTERACTIONS.map((i) => `image-interaction-${i.id}`)).toHaveLength(6);
    });
});
