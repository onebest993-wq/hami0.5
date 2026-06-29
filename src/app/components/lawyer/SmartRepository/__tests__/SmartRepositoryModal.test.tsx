import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SmartRepositoryModal } from '@/app/components/lawyer/SmartRepositoryModal';

vi.mock('react-dom', () => ({
    createPortal: (node: React.ReactNode) => node,
}));

vi.mock('@/app/hooks/useReduceMotion', () => ({
    useReduceMotion: () => true,
}));

vi.mock('@/app/components/lawyer/SmartRepository/SmartRepositoryUnifiedFeed', () => ({
    SmartRepositoryUnifiedFeed: ({
        onRequestClose,
    }: {
        onRequestClose?: () => void;
    }) => {
        React.useEffect(() => {
            const onKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onRequestClose?.();
            };
            window.addEventListener('keydown', onKeyDown, true);
            return () => window.removeEventListener('keydown', onKeyDown, true);
        }, [onRequestClose]);
        return <div data-testid="repository-unified-feed-mock" />;
    },
}));

const scrollLockSpy = vi.fn();
vi.mock('@/app/utils/bodyScrollLock', () => ({
    useBodyScrollLock: (active: boolean) => scrollLockSpy(active),
}));

vi.mock('@/app/hooks/useOpaqueFeatureSurface', () => ({
    useOpaqueFeatureSurface: vi.fn(),
}));

const noop = vi.fn();
const baseProps = {
    isOpen: true,
    onClose: noop,
    notes: [],
    lawsuitFiles: [],
    executionFiles: [],
    onSaveNote: noop,
    onDeleteNote: noop,
    onUpdateLawsuitFile: noop,
    onUpdateExecutionFile: noop,
};

describe('SmartRepositoryModal shell', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يفعّل scroll lock عند الفتح', () => {
        render(<SmartRepositoryModal {...baseProps} />);
        expect(scrollLockSpy).toHaveBeenCalledWith(true);
    });

    it('Escape يستدعي onClose', () => {
        const onClose = vi.fn();
        render(<SmartRepositoryModal {...baseProps} onClose={onClose} />);
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('زر الإغلاق native يستدعي onClose', () => {
        const onClose = vi.fn();
        render(<SmartRepositoryModal {...baseProps} onClose={onClose} />);
        fireEvent.click(screen.getByTestId('smart-repository-close'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('لا يُركّب الطبقة قبل الفتح', () => {
        render(<SmartRepositoryModal {...baseProps} isOpen={false} />);
        expect(screen.queryByTestId('smart-repository-modal')).not.toBeInTheDocument();
    });

    it('يُزيل الطبقة بعد الإغلاق مع reduceMotion', () => {
        const { rerender } = render(<SmartRepositoryModal {...baseProps} />);
        expect(screen.getByTestId('smart-repository-modal')).toBeInTheDocument();
        rerender(<SmartRepositoryModal {...baseProps} isOpen={false} />);
        expect(screen.queryByTestId('smart-repository-modal')).not.toBeInTheDocument();
    });
});
