import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { TextBlockStudioEditor } from '@/app/components/lawyer/RoyalLawyerProfile/components/TextBlockStudioEditor';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';

vi.mock('@/app/runtime/deferredGoogleFonts', () => ({
    scheduleDeferredGoogleFonts: vi.fn(),
}));
vi.mock('@/app/runtime/nativePlatform', () => ({
    isAndroidNativeShell: () => false,
}));

function Harness() {
    const [block, setBlock] = useState<ProfileCustomBlock>({
        id: 't1',
        type: 'text',
        body: 'سطر أول\nسطر ثانٍ\nسطر ثالث',
    });
    return (
        <TextBlockStudioEditor
            block={block}
            onChange={(patch) => setBlock((prev) => ({ ...prev, ...patch }))}
        />
    );
}

describe('TextBlockStudioEditor line scope', () => {
    it('لا يصفّر فهرس السطر عند كل حرف في body', () => {
        render(<Harness />);
        fireEvent.click(screen.getByTestId('text-style-scope-line'));
        fireEvent.click(screen.getByTestId('text-style-line-1'));
        expect(screen.getByTestId('text-style-line-1').getAttribute('data-active')).toBe('true');

        const input = screen.getByTestId('text-block-body-input') as HTMLTextAreaElement;
        fireEvent.change(input, {
            target: { value: 'سطر أول\nسطر ثانٍ معدّل\nسطر ثالث' },
        });

        expect(screen.getByTestId('text-style-line-1').getAttribute('data-active')).toBe('true');
        expect(input.value).toContain('معدّل');
    });
});
