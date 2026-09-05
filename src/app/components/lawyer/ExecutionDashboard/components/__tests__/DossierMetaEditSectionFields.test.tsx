import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DossierMetaEditSectionFields } from '../DossierMetaEditSectionFields';

describe('DossierMetaEditSectionFields', () => {
    it('always renders creditor and debtor name editors and split file number/year', () => {
        render(
            <DossierMetaEditSectionFields
                dossierMetaDraft={{
                    directorate: 'الكرخ',
                    fileNumber: '12',
                    fileYear: '2026',
                }}
                isEvictionExecutionModule={false}
                isSpecificDeliveryClaim={false}
                setDossierMetaDraft={vi.fn()}
            />,
        );

        expect(screen.getByLabelText('اسم الدائن')).toBeTruthy();
        expect(screen.getByLabelText('اسم المدين')).toBeTruthy();
        expect(screen.getByTestId('execution-dossier-meta-creditor-name')).toBeTruthy();
        expect(screen.getByTestId('execution-dossier-meta-debtor-name')).toBeTruthy();
        expect(screen.getByLabelText('رقم الإضبارة')).toBeTruthy();
        expect(screen.getByLabelText('السنة')).toBeTruthy();
        expect(screen.getByTestId('execution-dossier-meta-fileNumber')).toHaveValue('12');
        expect(screen.getByTestId('execution-dossier-meta-fileYear')).toHaveValue('2026');
    });

    it('hides deceased party name editors from the parties section', () => {
        render(
            <DossierMetaEditSectionFields
                dossierMetaDraft={{
                    directorate: 'الكرخ',
                    fileNumber: '12',
                    fileYear: '2026',
                    partyCreditorCount: '1',
                    partyDebtorCount: '1',
                    'creditorName:0': 'دائن متوفى',
                    'debtorName:0': 'مدين حي',
                    'creditorDeceased:0': '1',
                    'debtorDeceased:0': '0',
                }}
                isEvictionExecutionModule={false}
                isSpecificDeliveryClaim={false}
                setDossierMetaDraft={vi.fn()}
            />,
        );

        expect(screen.queryByLabelText('اسم الدائن')).toBeNull();
        expect(screen.getByLabelText('اسم المدين')).toBeTruthy();
    });

    it('hides the parties section when every party is deceased', () => {
        render(
            <DossierMetaEditSectionFields
                dossierMetaDraft={{
                    directorate: 'الكرخ',
                    fileNumber: '12',
                    fileYear: '2026',
                    partyCreditorCount: '1',
                    partyDebtorCount: '1',
                    'creditorName:0': 'دائن متوفى',
                    'debtorName:0': 'مدين متوفى',
                    'creditorDeceased:0': '1',
                    'debtorDeceased:0': '1',
                }}
                isEvictionExecutionModule={false}
                isSpecificDeliveryClaim={false}
                setDossierMetaDraft={vi.fn()}
            />,
        );

        expect(screen.queryByText('الأطراف')).toBeNull();
        expect(screen.queryByLabelText('اسم الدائن')).toBeNull();
        expect(screen.queryByLabelText('اسم المدين')).toBeNull();
        expect(screen.getByLabelText('اسم المديرية / الجهة')).toBeTruthy();
    });

    it('updates creditor name and file year independently while typing', () => {
        function Harness() {
            const [draft, setDraft] = useState<Record<string, string> | null>({
                directorate: 'الكرخ',
                fileNumber: 'ب',
                fileYear: '2333',
                'creditorName:0': '',
                'debtorName:0': 'مدين ظاهر',
                partyCreditorCount: '1',
                partyDebtorCount: '1',
            });
            return (
                <DossierMetaEditSectionFields
                    dossierMetaDraft={draft ?? {}}
                    isEvictionExecutionModule={false}
                    isSpecificDeliveryClaim={false}
                    setDossierMetaDraft={setDraft}
                />
            );
        }

        render(<Harness />);
        fireEvent.change(screen.getByTestId('execution-dossier-meta-creditor-name'), {
            target: { value: 'علي الدائن' },
        });
        expect(screen.getByTestId('execution-dossier-meta-creditor-name')).toHaveValue('علي الدائن');

        fireEvent.change(screen.getByTestId('execution-dossier-meta-fileYear'), {
            target: { value: '2026' },
        });
        expect(screen.getByTestId('execution-dossier-meta-fileYear')).toHaveValue('2026');
        expect(screen.getByTestId('execution-dossier-meta-fileNumber')).toHaveValue('ب');
    });
});
