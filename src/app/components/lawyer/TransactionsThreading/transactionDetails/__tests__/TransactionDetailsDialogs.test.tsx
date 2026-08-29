import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransactionDetailsDialogs } from '../TransactionDetailsDialogs';

vi.mock('@/app/hooks/useReduceMotion', () => ({ useReduceMotion: () => true }));

const baseProps = {
    completeOpen: false,
    onCompleteOpenChange: vi.fn(),
    onCompleteTransaction: vi.fn(),
    saveTemplateOpen: false,
    onSaveTemplateOpenChange: vi.fn(),
    canSaveTemplate: true,
    templateName: '',
    onTemplateNameChange: vi.fn(),
    onSaveTemplate: vi.fn(),
    templatesOpen: false,
    onTemplatesOpenChange: vi.fn(),
    templates: [],
    isReadOnly: false,
    existingTaskCount: 0,
    userId: 'user-1',
    onImportTemplate: vi.fn(),
    onDeleteTemplate: vi.fn(),
    reportOpen: false,
    onReportOpenChange: vi.fn(),
    reportText: '',
    copied: false,
    onCopyReport: vi.fn(),
};

describe('TransactionDetailsDialogs', () => {
    it('يعرض ورقة استيراد القوالب داخل hub عند الفتح', () => {
        render(<TransactionDetailsDialogs {...baseProps} templatesOpen />);

        const sheet = screen.getByTestId('transactions-templates-sheet');
        expect(sheet).toHaveAttribute('data-state', 'open');
        expect(screen.getByText('استيراد من قوالبي')).toBeInTheDocument();
        expect(screen.getByText('لا توجد قوالب محفوظة بعد.')).toBeInTheDocument();
    });

    it('يعرض حوار حفظ القالب مع تنبيه عند غياب المهام', () => {
        render(
            <TransactionDetailsDialogs
                {...baseProps}
                saveTemplateOpen
                canSaveTemplate={false}
            />,
        );

        expect(screen.getByText('حفظ المسار كقالب')).toBeInTheDocument();
        expect(screen.getByText('أضف مهمة واحدة على الأقل في المسار قبل حفظ القالب.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'حفظ' })).toBeDisabled();
    });

    it('يعرض حوار تحديث الموكل فوراً عند الفتح', () => {
        render(
            <TransactionDetailsDialogs
                {...baseProps}
                reportOpen
                reportText="نص التقرير"
            />,
        );

        expect(screen.getByText('تحديث الموكل')).toBeInTheDocument();
        expect(screen.getByText('نص التقرير')).toBeInTheDocument();
    });

    it('حوار الإنهاء لا يذكر مالية أو أرشفة', () => {
        render(<TransactionDetailsDialogs {...baseProps} completeOpen />);

        expect(screen.getByText('إنهاء المعاملة')).toBeInTheDocument();
        expect(screen.getByText('بعد الإنهاء لن تتمكن من إضافة مهام أو مستمسكات أو تعديل الحالات.')).toBeInTheDocument();
        expect(screen.queryByText(/حركات مالية/)).not.toBeInTheDocument();
        expect(screen.queryByText(/بعد الأرشفة/)).not.toBeInTheDocument();
    });
});
