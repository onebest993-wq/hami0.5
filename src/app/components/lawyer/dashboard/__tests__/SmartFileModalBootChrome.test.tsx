import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SmartFileModalBootChrome } from '../SmartFileModalBootChrome';
import type { FileData } from '@/app/components/lawyer/LawyerShared';

describe('SmartFileModalBootChrome', () => {
    it('renders dossier chrome with close control and no fake body', () => {
        const onClose = vi.fn();
        render(
            <SmartFileModalBootChrome
                file={{ id: 'ls-1', type: 'lawsuit', fileNumber: '88', fileYear: '2026' } as FileData}
                onClose={onClose}
            />,
        );

        expect(screen.getByTestId('smart-file-modal-boot-chrome')).toBeTruthy();
        expect(screen.queryByText('88/2026')).toBeNull();
        expect(screen.getByText('إضبارة الدعوى')).toBeTruthy();
        screen.getByTestId('smart-file-modal-boot-close').click();
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('smart-file-modal-boot-chrome').getAttribute('data-dossier-variant')).toBe(
            'civil',
        );
        expect(screen.queryByText('جاري تحميل الإضبارة…')).toBeNull();
    });

    it('uses personal-status chrome identity for personal files', () => {
        render(
            <SmartFileModalBootChrome
                file={
                    {
                        id: 'ps-1',
                        type: 'lawsuit',
                        lawsuitJurisdiction: 'personal',
                        caseNo: '12/ش/2026',
                    } as FileData
                }
                onClose={vi.fn()}
            />,
        );

        const chrome = screen.getByTestId('smart-file-modal-boot-chrome');
        expect(chrome.getAttribute('data-dossier-variant')).toBe('personal');
        expect(screen.getByText('إضبارة الأحوال الشخصية')).toBeTruthy();
        expect(screen.queryByText('إضبارة الدعوى')).toBeNull();
        expect(screen.queryByText('12/ش/2026')).toBeNull();
    });
});
