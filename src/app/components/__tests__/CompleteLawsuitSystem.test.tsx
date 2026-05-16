/**
 * CompleteLawsuitSystem — smoke tests aligned with current props (onClose, onSave).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CompleteLawsuitSystem } from '../lawyer/CompleteLawsuitSystem';

const mockDispatch = vi.fn();
vi.mock('../../context/AppContext', () => ({
    useAppContext: () => ({
        appState: { civilFiles: [], executionFiles: [] },
        dispatch: mockDispatch
    })
}));

describe('CompleteLawsuitSystem', () => {
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders selector header and lawsuit management title', () => {
        render(<CompleteLawsuitSystem onClose={mockOnClose} onSave={mockOnSave} />);
        expect(screen.getByText(/إدارة الدعاوى القضائية \(الشاملة\)/i)).toBeInTheDocument();
    });

    it('calls onClose when header close is clicked', () => {
        render(<CompleteLawsuitSystem onClose={mockOnClose} onSave={mockOnSave} />);
        fireEvent.click(screen.getByRole('button', { name: /إغلاق/i }));
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('opens LawyerNewCase (jurisdiction selection) when choosing إدارة الدعاوى', async () => {
        render(<CompleteLawsuitSystem onClose={mockOnClose} onSave={mockOnSave} />);
        fireEvent.click(screen.getByRole('button', { name: /إدارة الدعاوى/i }));
        await waitFor(() => {
            expect(screen.getByText('اختر التصنيف القضائي')).toBeInTheDocument();
        });
    });
});
