import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useExecutionOverlayDismiss } from '../useExecutionOverlayDismiss';
import {
    consumeNativeBackForTests,
    resetNativeBackHandlersForTests,
} from '@/app/runtime/nativeBackStack';

function DismissProbe({ active, onClose }: { active: boolean; onClose: () => void }) {
    useExecutionOverlayDismiss(active, onClose);
    return null;
}

describe('useExecutionOverlayDismiss', () => {
    it('يستهلك زر الرجوع ويغلق الطبقة النشطة', () => {
        resetNativeBackHandlersForTests();
        const onClose = vi.fn();
        render(<DismissProbe active={true} onClose={onClose} />);

        expect(consumeNativeBackForTests()).toBe(true);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('لا يُسجَّل عندما الطبقة مغلقة', () => {
        resetNativeBackHandlersForTests();
        const onClose = vi.fn();
        render(<DismissProbe active={false} onClose={onClose} />);

        expect(consumeNativeBackForTests()).toBe(false);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('يبقى المعالج مستقراً عند تغيّر هوية onClose', () => {
        resetNativeBackHandlersForTests();
        const first = vi.fn();
        const second = vi.fn();
        const view = render(<DismissProbe active={true} onClose={first} />);
        view.rerender(<DismissProbe active={true} onClose={second} />);

        expect(consumeNativeBackForTests()).toBe(true);
        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledTimes(1);
    });

    it('Escape يغلق الطبقة', () => {
        resetNativeBackHandlersForTests();
        const onClose = vi.fn();
        render(<DismissProbe active={true} onClose={onClose} />);
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('Escape يغلق الطبقة العليا فقط عندما تتداخل نافذتان', () => {
        resetNativeBackHandlersForTests();
        const closeHub = vi.fn();
        const closeNested = vi.fn();
        render(
            <>
                <DismissProbe active={true} onClose={closeHub} />
                <DismissProbe active={true} onClose={closeNested} />
            </>,
        );
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(closeNested).toHaveBeenCalledTimes(1);
        expect(closeHub).not.toHaveBeenCalled();
    });
});
