import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SalarySeizureLogDetailCard } from '../SalarySeizureLogDetailCard';
import type { SeizedAsset } from '@/app/types/execution';

describe('SalarySeizureLogDetailCard', () => {
    function buildAsset(): SeizedAsset {
        return {
            id: 'salary-1',
            type: 'salary',
            status: 'seized',
            title: 'حجز راتب',
            description: '',
            details: {
                employerName: 'دائرة التنفيذ',
                salaryAmount: '500000',
                monthlyDeductionIqd: 100000,
            },
        } as unknown as SeizedAsset;
    }

    it('saves entered salary seizure details', () => {
        const onSaveDetails = vi.fn();
        const showToast = vi.fn();

        render(
            <SalarySeizureLogDetailCard
                asset={buildAsset()}
                executionData={null}
                executionId="exec-1"
                titleLabel="حجز راتب"
                locked={false}
                releasedLocked={false}
                isPending={false}
                onSaveDetails={onSaveDetails}
                onRelease={vi.fn()}
                showToast={showToast}
            />,
        );

        const inputs = screen.getAllByRole('textbox');

        fireEvent.change(inputs[0]!, {
            target: { value: 'وزارة المالية' },
        });
        fireEvent.change(inputs[1]!, {
            target: { value: '700000' },
        });
        fireEvent.change(inputs[2]!, {
            target: { value: '150000' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));

        expect(onSaveDetails).toHaveBeenCalledWith(
            'salary-1',
            expect.objectContaining({
                salaryAmount: '700,000',
                monthlyDeductionIqd: 150000,
                employerName: 'وزارة المالية',
            }),
        );
        expect(showToast).toHaveBeenCalledWith('تم حفظ بيانات سجل الراتب.', 'success');
    });

    it('shows release action for seized unlocked assets', () => {
        const onRelease = vi.fn();

        render(
            <SalarySeizureLogDetailCard
                asset={buildAsset()}
                executionData={null}
                executionId="exec-1"
                titleLabel="حجز راتب"
                locked={false}
                releasedLocked={false}
                isPending={false}
                onSaveDetails={vi.fn()}
                onRelease={onRelease}
                showToast={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'فك الحجز' }));
        expect(onRelease).toHaveBeenCalledTimes(1);
    });
});
