import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DebtorSeizureCategoryBadges } from '@/app/components/lawyer/execution/DebtorSeizureCategoryBadges';

describe('DebtorSeizureCategoryBadges', () => {
    it('يرسم شارة المنقول دون ReferenceError على normalizeLine', () => {
        expect(() =>
            render(
                <DebtorSeizureCategoryBadges
                    seizedAssets={[
                        {
                            id: 'mov-1',
                            type: 'vehicle',
                            status: 'seized',
                            description: 'مركبة تجريبية',
                            details: { seizureUiKind: 'vehicle' },
                        },
                    ]}
                    realEstateSeizureAssets={[]}
                    thirdPartySeizureAssets={[]}
                    standaloneExecutionMarks={[]}
                />,
            ),
        ).not.toThrow();
        expect(screen.getByRole('button', { name: /منقول/ })).toBeTruthy();
    });
});
