import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SmartFileModalBootChrome } from '../SmartFileModalBootChrome';
import type { FileData } from '@/app/components/lawyer/LawyerShared';

describe('SmartFileModalBootChrome', () => {
    it('renders dossier chrome with headline and close control', () => {
        const onClose = vi.fn();
        render(
            <SmartFileModalBootChrome
                file={{ id: 'ls-1', type: 'lawsuit', fileNumber: '88', fileYear: '2026' } as FileData}
                onClose={onClose}
            />,
        );

        expect(screen.getByTestId('smart-file-modal-boot-chrome')).toBeTruthy();
        expect(screen.getByText('88/2026')).toBeTruthy();
        expect(screen.getByText('إضبارة الدعوى')).toBeTruthy();
        screen.getByTestId('smart-file-modal-boot-close').click();
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
