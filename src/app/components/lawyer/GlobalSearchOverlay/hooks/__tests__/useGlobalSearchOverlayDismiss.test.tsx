import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import {
    blurActiveGlobalSearchField,
    useGlobalSearchOverlayDismiss,
} from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchOverlayDismiss';
import {
    consumeNativeBackForTests,
    resetNativeBackHandlersForTests,
} from '@/app/runtime/capacitorAppLifecycle';

function DismissProbe({ open, onClose }: { open: boolean; onClose: () => void }) {
    useGlobalSearchOverlayDismiss(open, onClose);
    return null;
}

describe('useGlobalSearchOverlayDismiss', () => {
    it('يستهلك زر الرجوع ويغلق البحث', () => {
        resetNativeBackHandlersForTests();
        const onClose = vi.fn();
        render(<DismissProbe open={true} onClose={onClose} />);

        expect(consumeNativeBackForTests()).toBe(true);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('لا يُسجَّل عندما مغلق', () => {
        resetNativeBackHandlersForTests();
        const onClose = vi.fn();
        render(<DismissProbe open={false} onClose={onClose} />);

        expect(consumeNativeBackForTests()).toBe(false);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('Escape يغلق البحث', () => {
        const onClose = vi.fn();
        render(<DismissProbe open={true} onClose={onClose} />);
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('يطوي الحقل المركّز داخل طبقة البحث', () => {
        const wrap = document.createElement('div');
        wrap.setAttribute('data-testid', 'global-search-overlay');
        const input = document.createElement('input');
        wrap.appendChild(input);
        document.body.appendChild(wrap);
        input.focus();
        expect(document.activeElement).toBe(input);
        blurActiveGlobalSearchField();
        expect(document.activeElement).not.toBe(input);
        wrap.remove();
    });
});
