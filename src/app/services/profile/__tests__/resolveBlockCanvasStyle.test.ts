import { describe, expect, it } from 'vitest';
import { resolveBlockCanvasStyle } from '../profilePageDefaults';
import type { ProfileCustomBlock } from '../profilePageTypes';

function textBlock(canvasStyle: ProfileCustomBlock['canvasStyle']): ProfileCustomBlock {
    return {
        id: 'b1',
        kind: 'text',
        body: 'نص',
        canvasStyle,
    };
}

describe('resolveBlockCanvasStyle', () => {
    it('auto-enables canvas when a reveal interaction is set', () => {
        const resolved = resolveBlockCanvasStyle(
            textBlock({ enabled: false, interaction: 'mistSwipe' }),
        );
        expect(resolved.enabled).toBe(true);
        expect(resolved.interaction).toBe('mistSwipe');
    });

    it('keeps canvas disabled when interaction is none', () => {
        const resolved = resolveBlockCanvasStyle(textBlock({ enabled: false, interaction: 'none' }));
        expect(resolved.enabled).toBe(false);
    });
});
