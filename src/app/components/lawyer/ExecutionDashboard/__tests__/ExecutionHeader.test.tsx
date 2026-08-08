import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { ExecutionHeader } from '../ExecutionHeader';

vi.mock('motion/react', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button type="button" {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockExecutionData = {
    id: 'test-1',
    fileNumber: '123/2026',
    directorate: 'دائرة تنفيذ الكرخ',
    creditors: [{ id: 'c1', name: 'محمد أحمد', nationalId: '123456' }],
    debtors: [{ id: 'd1', name: 'علي حسن', nationalId: '654321' }],
    totalAmount: 100000,
    paidAmount: 30000,
    status: 'active',
    createdDate: '2026-01-01',
    docNumber: 'DOC-123',
    docType: 'civil_judgment',
    judgmentDate: '2025-12-01',
    notificationDate: '2026-01-10',
    executionDate: '2026-01-01',
} as any;

describe('ExecutionHeader', () => {
    // ─────────────────────────────────────────────────────────────────────────
    // RENDERING TESTS
    // ─────────────────────────────────────────────────────────────────────────

    describe('Rendering', () => {
        it('should render component without crashing', () => {
            render(<ExecutionHeader executionData={mockExecutionData} onClose={() => {}} />);
            expect(screen.getByText(/ملف التنفيذ رقم/)).toBeInTheDocument();
        });

        it('should display file number in title', () => {
            render(<ExecutionHeader executionData={mockExecutionData} onClose={() => {}} />);
            expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('ملف التنفيذ رقم 123/2026');
        });

        it('should display directorate name', () => {
            render(<ExecutionHeader executionData={mockExecutionData} onClose={() => {}} />);
            expect(screen.getByText('دائرة تنفيذ الكرخ')).toBeInTheDocument();
        });

        it('should show fallback file number when missing', () => {
            const noFileNum = { ...mockExecutionData, fileNumber: undefined };
            render(<ExecutionHeader executionData={noFileNum} onClose={() => {}} />);
            expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('غير محدد');
        });

        it('should show fallback directorate when missing', () => {
            const noDir = { ...mockExecutionData, directorate: undefined };
            render(<ExecutionHeader executionData={noDir} onClose={() => {}} />);
            expect(screen.getByText('دائرة التنفيذ')).toBeInTheDocument();
        });

        it('should display status badge', () => {
            render(<ExecutionHeader executionData={mockExecutionData} onClose={() => {}} />);
            expect(screen.getByText('نشط')).toBeInTheDocument();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // FINANCIAL DISPLAY TESTS
    // ─────────────────────────────────────────────────────────────────────────

    describe('Financial Information', () => {
        it('should display total amount with IQD', () => {
            const { container } = render(<ExecutionHeader executionData={mockExecutionData} onClose={() => {}} />);
            const totalCard = screen.getByText('المبلغ الكلي').closest('div[class*="rounded-xl"]')!;
            expect(totalCard.textContent).toContain('IQD');
            expect(totalCard.textContent).toContain((100000).toLocaleString('ar-IQ'));
        });

        it('should display remaining amount with IQD', () => {
            render(<ExecutionHeader executionData={mockExecutionData} onClose={() => {}} />);
            const remainingCard = screen.getByText('المبلغ المتبقي').closest('div[class*="rounded-xl"]')!;
            expect(remainingCard.textContent).toContain('IQD');
            expect(remainingCard.textContent).toContain((70000).toLocaleString('ar-IQ'));
        });

        it('should display payment progress percentage with one decimal', () => {
            render(<ExecutionHeader executionData={mockExecutionData} onClose={() => {}} />);
            expect(screen.getByText('30.0%')).toBeInTheDocument();
        });

        it('should handle zero paid amount', () => {
            const zeroPaid = { ...mockExecutionData, paidAmount: 0 };
            render(<ExecutionHeader executionData={zeroPaid} onClose={() => {}} />);
            expect(screen.getByText('0.0%')).toBeInTheDocument();
        });

        it('should handle full payment', () => {
            const fullyPaid = { ...mockExecutionData, paidAmount: 100000 };
            render(<ExecutionHeader executionData={fullyPaid} onClose={() => {}} />);
            expect(screen.getByText('100.0%')).toBeInTheDocument();
        });

        it('should cap progress at 100% for overpayment', () => {
            const overPaid = { ...mockExecutionData, paidAmount: 200000 };
            render(<ExecutionHeader executionData={overPaid} onClose={() => {}} />);
            expect(screen.getByText('100.0%')).toBeInTheDocument();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STATUS BADGE TESTS
    // ─────────────────────────────────────────────────────────────────────────

    describe('Status Badge', () => {
        it('should display active status', () => {
            render(<ExecutionHeader executionData={mockExecutionData} onClose={() => {}} />);
            expect(screen.getByText('نشط')).toBeInTheDocument();
        });

        it('should display completed status', () => {
            const completed = { ...mockExecutionData, status: 'completed' };
            render(<ExecutionHeader executionData={completed} onClose={() => {}} />);
            expect(screen.getByText('مكتمل')).toBeInTheDocument();
        });

        it('should display suspended status', () => {
            const suspended = { ...mockExecutionData, status: 'suspended' };
            render(<ExecutionHeader executionData={suspended} onClose={() => {}} />);
            expect(screen.getByText('موقوف')).toBeInTheDocument();
        });

        it('should display pending status', () => {
            const pending = { ...mockExecutionData, status: 'pending' };
            render(<ExecutionHeader executionData={pending} onClose={() => {}} />);
            expect(screen.getByText('معلق')).toBeInTheDocument();
        });

        it('should fallback to pending for unknown status', () => {
            const unknown = { ...mockExecutionData, status: 'something_else' };
            render(<ExecutionHeader executionData={unknown} onClose={() => {}} />);
            expect(screen.getByText('معلق')).toBeInTheDocument();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // INTERACTION TESTS
    // ─────────────────────────────────────────────────────────────────────────

    describe('Interactions', () => {
        it('should call onClose when close button is clicked', () => {
            const onClose = vi.fn();
            render(<ExecutionHeader executionData={mockExecutionData} onClose={onClose} />);

            const buttons = screen.getAllByRole('button');
            const closeButton = buttons[0];
            fireEvent.click(closeButton);

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('should not show expand button when onToggleExpand is not provided', () => {
            render(<ExecutionHeader executionData={mockExecutionData} onClose={() => {}} />);
            expect(screen.queryByText('عرض المزيد')).not.toBeInTheDocument();
        });

        it('should show expand button when onToggleExpand is provided', () => {
            const onToggle = vi.fn();
            render(
                <ExecutionHeader
                    executionData={mockExecutionData}
                    onClose={() => {}}
                    onToggleExpand={onToggle}
                />
            );
            expect(screen.getByText('عرض المزيد')).toBeInTheDocument();
        });

        it('should call onToggleExpand when expand button is clicked', () => {
            const onToggle = vi.fn();
            render(
                <ExecutionHeader
                    executionData={mockExecutionData}
                    onClose={() => {}}
                    onToggleExpand={onToggle}
                />
            );

            fireEvent.click(screen.getByText('عرض المزيد'));
            expect(onToggle).toHaveBeenCalledTimes(1);
        });

        it('should show collapse text when expanded', () => {
            const onToggle = vi.fn();
            render(
                <ExecutionHeader
                    executionData={mockExecutionData}
                    isExpanded={true}
                    onClose={() => {}}
                    onToggleExpand={onToggle}
                />
            );
            expect(screen.getByText('إخفاء التفاصيل')).toBeInTheDocument();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STAT CARDS TESTS
    // ─────────────────────────────────────────────────────────────────────────

    describe('Stat Cards', () => {
        it('should display document type label', () => {
            render(<ExecutionHeader executionData={mockExecutionData} onClose={() => {}} />);
            expect(screen.getByText('نوع السند')).toBeInTheDocument();
        });

        it('should display civil judgment doc type', () => {
            render(<ExecutionHeader executionData={mockExecutionData} onClose={() => {}} />);
            expect(screen.getByText('حكم مدني')).toBeInTheDocument();
        });

        it('should display total amount label', () => {
            render(<ExecutionHeader executionData={mockExecutionData} onClose={() => {}} />);
            expect(screen.getByText('المبلغ الكلي')).toBeInTheDocument();
        });

        it('should display remaining amount label', () => {
            render(<ExecutionHeader executionData={mockExecutionData} onClose={() => {}} />);
            expect(screen.getByText('المبلغ المتبقي')).toBeInTheDocument();
        });

        it('should display parties count', () => {
            render(<ExecutionHeader executionData={mockExecutionData} onClose={() => {}} />);
            expect(screen.getByText('عدد الأطراف')).toBeInTheDocument();
            expect(screen.getByText('2 طرف')).toBeInTheDocument();
        });

        it('should count parties from creditors and debtors arrays', () => {
            const multiParty = {
                ...mockExecutionData,
                creditors: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }],
                debtors: [{ id: 'd1' }, { id: 'd2' }],
            };
            render(<ExecutionHeader executionData={multiParty} onClose={() => {}} />);
            expect(screen.getByText('5 طرف')).toBeInTheDocument();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // EXPANDED SECTION TESTS
    // ─────────────────────────────────────────────────────────────────────────

    describe('Expanded Section', () => {
        it('should not show expanded details by default', () => {
            render(
                <ExecutionHeader
                    executionData={mockExecutionData}
                    onClose={() => {}}
                    onToggleExpand={() => {}}
                />
            );
            expect(screen.queryByText('DOC-123')).not.toBeInTheDocument();
        });

        it('should show doc number when expanded', () => {
            render(
                <ExecutionHeader
                    executionData={mockExecutionData}
                    isExpanded={true}
                    onClose={() => {}}
                    onToggleExpand={() => {}}
                />
            );
            expect(screen.getByText('DOC-123')).toBeInTheDocument();
            expect(screen.getByText('رقم السند')).toBeInTheDocument();
        });

        it('should show judgment date when expanded', () => {
            render(
                <ExecutionHeader
                    executionData={mockExecutionData}
                    isExpanded={true}
                    onClose={() => {}}
                    onToggleExpand={() => {}}
                />
            );
            expect(screen.getByText('تاريخ الحكم')).toBeInTheDocument();
        });

        it('should show notification date when expanded', () => {
            render(
                <ExecutionHeader
                    executionData={mockExecutionData}
                    isExpanded={true}
                    onClose={() => {}}
                    onToggleExpand={() => {}}
                />
            );
            expect(screen.getByText('تاريخ التبليغ')).toBeInTheDocument();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // EDGE CASES
    // ─────────────────────────────────────────────────────────────────────────

    describe('Edge Cases', () => {
        it('should handle missing optional fields gracefully', () => {
            const minimal = {
                id: '1',
                totalAmount: 50000,
                paidAmount: 0,
                status: 'active',
            } as any;
            render(<ExecutionHeader executionData={minimal} onClose={() => {}} />);
            expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('غير محدد');
            expect(screen.getByText('دائرة التنفيذ')).toBeInTheDocument();
        });

        it('should handle zero total amount', () => {
            const zeroAmount = { ...mockExecutionData, totalAmount: 0, paidAmount: 0 };
            render(<ExecutionHeader executionData={zeroAmount} onClose={() => {}} />);
            expect(screen.getByText('0.0%')).toBeInTheDocument();
        });

        it('should handle empty creditors and debtors arrays', () => {
            const noParties = { ...mockExecutionData, creditors: [], debtors: [] };
            render(<ExecutionHeader executionData={noParties} onClose={() => {}} />);
            expect(screen.getByText('0 طرف')).toBeInTheDocument();
        });

        it('should handle missing creditors and debtors fields', () => {
            const noArrays = { ...mockExecutionData, creditors: undefined, debtors: undefined };
            render(<ExecutionHeader executionData={noArrays} onClose={() => {}} />);
            expect(screen.getByText('0 طرف')).toBeInTheDocument();
        });
    });
});
