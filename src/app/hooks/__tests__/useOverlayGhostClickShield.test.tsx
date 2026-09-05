import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React, { useRef } from 'react';
import { useOverlayGhostClickShield } from '../useOverlayGhostClickShield';

function ShieldProbe({ onInnerClick }: { onInnerClick: () => void }) {
    const rootRef = useRef<HTMLDivElement>(null);
    useOverlayGhostClickShield(rootRef, 10_000);
    return (
        <div ref={rootRef} data-testid="shield-root">
            <button type="button" data-testid="shield-inner" onClick={onInnerClick}>
                inner
            </button>
        </div>
    );
}

describe('useOverlayGhostClickShield', () => {
    it('يبتلع click داخل الطبقة فور التركيب', () => {
        const onInnerClick = vi.fn();
        const { getByTestId } = render(<ShieldProbe onInnerClick={onInnerClick} />);
        fireEvent.click(getByTestId('shield-inner'));
        expect(onInnerClick).not.toHaveBeenCalled();
    });
});
