import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRepositoryEscapeStack } from '../useRepositoryEscapeStack';

function pressEscape() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

describe('useRepositoryEscapeStack', () => {
    it('يغلق المستودع عند عدم وجود طبقات فرعية', () => {
        const onCloseModal = vi.fn();
        renderHook(() =>
            useRepositoryEscapeStack({
                enabled: true,
                composing: false,
                scannerOpen: false,
                showVoiceRecorder: false,
                onResetComposer: vi.fn(),
                onCloseScanner: vi.fn(),
                onCloseModal,
            }),
        );
        pressEscape();
        expect(onCloseModal).toHaveBeenCalledTimes(1);
    });

    it('يلغي الإنشاء قبل إغلاق المستودع', () => {
        const onResetComposer = vi.fn();
        const onCloseModal = vi.fn();
        renderHook(() =>
            useRepositoryEscapeStack({
                enabled: true,
                composing: true,
                scannerOpen: false,
                showVoiceRecorder: false,
                onResetComposer,
                onCloseScanner: vi.fn(),
                onCloseModal,
            }),
        );
        pressEscape();
        expect(onResetComposer).toHaveBeenCalledTimes(1);
        expect(onCloseModal).not.toHaveBeenCalled();
    });
});
