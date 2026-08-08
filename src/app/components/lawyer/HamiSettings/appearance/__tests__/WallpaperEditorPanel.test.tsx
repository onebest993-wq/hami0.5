import { describe, expect, it, vi, beforeAll } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { WallpaperEditorPanel } from '../WallpaperEditorPanel';

beforeAll(() => {
    class ResizeObserverMock {
        observe() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
});

describe('WallpaperEditorPanel', () => {
    it('يعرض أدوات التحريك والتكبير والتطبيق', async () => {
        const onApply = vi.fn();
        const onCancel = vi.fn();

        const { container } = render(
            <WallpaperEditorPanel
                previewUrl="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                onApply={onApply}
                onCancel={onCancel}
            />,
        );

        const img = container.querySelector('img');
        expect(img).toBeTruthy();
        Object.defineProperty(img!, 'naturalWidth', { configurable: true, value: 1 });
        Object.defineProperty(img!, 'naturalHeight', { configurable: true, value: 1 });
        fireEvent.load(img!);

        expect(screen.getByTestId('settings-wallpaper-editor')).toBeInTheDocument();
        expect(screen.getByTestId('settings-wallpaper-editor-zoom')).toBeInTheDocument();

        fireEvent.input(screen.getByTestId('settings-wallpaper-editor-zoom'), {
            target: { value: '1.5' },
        });

        await waitFor(() => {
            expect(screen.getByTestId('settings-wallpaper-editor-apply')).not.toBeDisabled();
        });

        fireEvent.click(screen.getByTestId('settings-wallpaper-editor-apply'));
        expect(onApply).toHaveBeenCalledWith(
            expect.objectContaining({ scale: expect.any(Number) }),
        );

        fireEvent.click(screen.getByTestId('settings-wallpaper-editor-cancel'));
        expect(onCancel).toHaveBeenCalled();
    });
});
