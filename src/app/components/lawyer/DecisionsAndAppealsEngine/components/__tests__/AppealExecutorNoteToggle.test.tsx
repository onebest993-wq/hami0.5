import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AppealExecutorNoteToggle } from '../AppealExecutorNoteToggle';

describe('AppealExecutorNoteToggle', () => {
    it('لا يعرض شيئاً بدون تسبيب', () => {
        const { container } = render(<AppealExecutorNoteToggle note="" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('يعرض زر التسبيب ثم النص عند النقر', () => {
        render(<AppealExecutorNoteToggle note="سبب الرفض" />);
        expect(screen.getByRole('button', { name: 'تسبيب المنفذ' })).toBeInTheDocument();
        expect(screen.queryByText('سبب الرفض')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'تسبيب المنفذ' }));
        expect(screen.getByText('سبب الرفض')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'إخفاء تسبيب المنفذ' }));
        expect(screen.queryByText('سبب الرفض')).not.toBeInTheDocument();
    });
});
