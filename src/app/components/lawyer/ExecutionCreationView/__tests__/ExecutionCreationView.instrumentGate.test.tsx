import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ExecutionCreationView } from '@/app/components/lawyer/ExecutionCreationView';
import { prefetchInstrumentDetailsSection } from '@/app/components/lawyer/ExecutionCreationView/components/instrumentDetailsSectionLazy';

describe('ExecutionCreationView instrument gate', () => {
    beforeAll(() => {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    });

    it('reveals رقم الإضبارة on Enter only, not while typing, and drops section headings', () => {
        render(<ExecutionCreationView isOpen onClose={vi.fn()} onSave={vi.fn()} />);

        expect(screen.getByLabelText('اسم المديرية')).toBeInTheDocument();
        expect(screen.queryByLabelText('رقم الإضبارة')).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'بيانات المديرية' })).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'السند المنفذ' })).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'أطراف الإضبارة' })).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('اسم المديرية'), {
            target: { value: 'تنفيذ الكرخ' },
        });
        expect(screen.queryByLabelText('رقم الإضبارة')).not.toBeInTheDocument();

        fireEvent.keyDown(screen.getByLabelText('اسم المديرية'), { key: 'Enter' });
        expect(screen.getByLabelText('رقم الإضبارة')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('رقم الإضبارة'), {
            target: { value: '1540/2026' },
        });
        expect(screen.queryByRole('heading', { name: 'السند المنفذ' })).not.toBeInTheDocument();
        expect(screen.queryByLabelText('رقم الحكم')).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('اسم المديرية'), {
            target: { value: 'تنفيذ الرصافة' },
        });
        fireEvent.keyDown(screen.getByLabelText('اسم المديرية'), { key: 'Enter' });
        expect(screen.getByLabelText('رقم الإضبارة')).toBeInTheDocument();
        expect(screen.getByDisplayValue('1540/2026')).toBeInTheDocument();
    });

    it('mounts the instrument section only after file-number commit, not after typing', () => {
        const body = readFileSync(
            resolve(__dirname, '../components/ExecutionCreationFormBody.tsx'),
            'utf8',
        );
        expect(body).toContain("isRevealed('docType')");
        expect(body).not.toContain('isDirectorateSectionComplete(directorate, fileNumber)');
        expect(body).toContain("commitStep('fileNumber')");
        expect(body).toContain("commitStep('docType')");
    });

    it('يفتح ورقة نوع السند عند الضغط على زر الاختيار', async () => {
        await prefetchInstrumentDetailsSection();
        render(<ExecutionCreationView isOpen onClose={vi.fn()} onSave={vi.fn()} />);

        fireEvent.change(screen.getByLabelText('اسم المديرية'), {
            target: { value: 'تنفيذ الكرخ' },
        });
        fireEvent.keyDown(screen.getByLabelText('اسم المديرية'), { key: 'Enter' });
        fireEvent.change(screen.getByLabelText('رقم الإضبارة'), {
            target: { value: '1540/2026' },
        });
        fireEvent.keyDown(screen.getByLabelText('رقم الإضبارة'), { key: 'Enter' });

        const picker = await screen.findByRole('button', { name: 'نوع السند المنفذ' }, { timeout: 5000 });
        expect(picker).toHaveTextContent('قرارات المحاكم');
        expect(screen.getByLabelText('رقم الحكم')).toBeInTheDocument();
        fireEvent.click(picker);

        expect(screen.getByRole('dialog', { name: 'نوع السند المنفذ' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'قرارات المحاكم' })).toBeInTheDocument();
    });
});
