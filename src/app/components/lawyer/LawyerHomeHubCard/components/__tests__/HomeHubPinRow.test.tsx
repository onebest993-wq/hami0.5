import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HomeHubPinRow } from '../HomeHubPinRow';
import type { ClusterPinView } from '@/app/workspace/types';

const view: ClusterPinView = {
    pin: {
        id: 'case-1',
        type: 'lawsuit',
        title: 'دعوى E2E مثبتة',
        clientName: 'سامي',
        caseNumber: '12/2026',
        routePath: 'workspace:lawsuit:case-1',
    },
    related: [],
};

describe('HomeHubPinRow', () => {
    it('يفتح المسار ويلغي التثبيت مع تسمية عربية', () => {
        const onNavigate = vi.fn();
        const onUnpin = vi.fn();
        render(<HomeHubPinRow view={view} onNavigate={onNavigate} onUnpin={onUnpin} />);

        const open = screen.getByTestId('home-hub-pin-lawsuit-case-1').querySelector('button');
        expect(open).toHaveAttribute('aria-label', expect.stringContaining('دعوى E2E مثبتة'));
        fireEvent.click(
            screen.getByRole('button', {
                name: 'دعوى E2E مثبتة، مدني، الموكل: سامي، رقم القضية/الملف: 12/2026',
            }),
        );
        expect(onNavigate).toHaveBeenCalledWith('workspace:lawsuit:case-1');

        fireEvent.click(screen.getByRole('button', { name: 'إلغاء تثبيت دعوى E2E مثبتة' }));
        expect(onUnpin).toHaveBeenCalledWith('case-1', 'lawsuit');
    });
});
