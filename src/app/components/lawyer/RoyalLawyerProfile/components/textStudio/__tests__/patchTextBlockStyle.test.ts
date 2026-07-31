import { describe, expect, it, vi } from 'vitest';
import { patchStyleForScope } from '@/app/components/lawyer/RoyalLawyerProfile/components/textStudio/patchTextBlockStyle';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';

function textBlock(partial: Partial<ProfileCustomBlock> = {}): ProfileCustomBlock {
    return {
        id: 'b1',
        kind: 'text',
        body: 'سطر أول\nسطر ثان',
        bodyStyle: {
            fontSize: 'lg',
            effect: 'none',
            align: 'right',
            color: '#ffffff',
            fontFamily: 'literary',
        },
        lineStyles: [],
        textSpans: [],
        ...partial,
    };
}

describe('patchStyleForScope', () => {
    it('clears line and phrase overrides when applying to all', () => {
        const onChange = vi.fn();
        const block = textBlock({
            lineStyles: [{ fontSize: '3xl', color: '#720808' }],
            textSpans: [
                {
                    id: 's1',
                    lineIndex: 0,
                    start: 0,
                    end: 3,
                    style: { effect: 'glow' },
                },
            ],
        });

        patchStyleForScope(block, 'all', 0, null, { fontSize: 'base', color: '#00ff00' }, onChange);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                bodyStyle: expect.objectContaining({ fontSize: 'base', color: '#00ff00' }),
                lineStyles: [],
                textSpans: [],
            }),
        );
    });

    it('does not silently no-op phrase scope without a selection', () => {
        const onChange = vi.fn();
        patchStyleForScope(textBlock(), 'phrase', 0, null, { effect: 'gradient' }, onChange);
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                bodyStyle: expect.objectContaining({ effect: 'gradient' }),
                lineStyles: [],
                textSpans: [],
            }),
        );
    });

    it('applies line scope to the whole line and clears phrase spans on that line', () => {
        const onChange = vi.fn();
        const block = textBlock({
            textSpans: [
                {
                    id: 's0',
                    lineIndex: 0,
                    start: 0,
                    end: 3,
                    style: { color: '#ff0000' },
                },
                {
                    id: 's1',
                    lineIndex: 1,
                    start: 0,
                    end: 2,
                    style: { color: '#00ff00' },
                },
            ],
        });

        patchStyleForScope(block, 'line', 0, null, { color: '#c89319', fontSize: '2xl' }, onChange);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                lineStyles: [expect.objectContaining({ color: '#c89319', fontSize: '2xl' })],
                textSpans: [
                    expect.objectContaining({
                        id: 's1',
                        lineIndex: 1,
                    }),
                ],
            }),
        );
    });
});
