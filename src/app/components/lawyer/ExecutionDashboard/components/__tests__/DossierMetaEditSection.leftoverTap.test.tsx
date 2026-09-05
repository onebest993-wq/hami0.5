import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DossierMetaEditSection } from '../DossierMetaEditSection';

describe('DossierMetaEditSection leftover tap', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not close from the same tap that opened it', () => {
        vi.useFakeTimers();
        const setShow = vi.fn();
        const setDraft = vi.fn();
        render(
            <DossierMetaEditSection
                showEditDossierMetaModal
                dossierMetaDraft={{
                    directorate: 'الكرخ',
                    fileNumber: '12',
                    fileYear: '2026',
                    'creditorName:0': 'علي',
                    'debtorName:0': 'حسن',
                    partyCreditorCount: '1',
                    partyDebtorCount: '1',
                }}
                isEvictionExecutionModule={false}
                setShowEditDossierMetaModal={setShow}
                setDossierMetaDraft={setDraft}
                saveDossierMetaDraft={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByTestId('execution-dossier-meta-edit'));
        expect(setShow).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(100);
        });
        fireEvent.click(screen.getByTestId('execution-dossier-meta-edit'));
        expect(setShow).toHaveBeenCalledWith(false);
    });

    it('keeps typed creditor name even if parent still holds the previous snapshot', () => {
        function Harness() {
            const [draft, setDraft] = React.useState<Record<string, string> | null>({
                directorate: 'الكرخ',
                fileNumber: 'ب / 2333',
                fileYear: '',
                'creditorName:0': 'دائن قديم',
                'debtorName:0': 'مدين ظاهر',
                partyCreditorCount: '1',
                partyDebtorCount: '1',
            });
            return (
                <DossierMetaEditSection
                    showEditDossierMetaModal
                    dossierMetaDraft={draft}
                    isEvictionExecutionModule={false}
                    setShowEditDossierMetaModal={vi.fn()}
                    setDossierMetaDraft={setDraft}
                    saveDossierMetaDraft={vi.fn()}
                />
            );
        }

        render(<Harness />);
        expect(screen.getByTestId('execution-dossier-meta-fileNumber')).toHaveValue('ب');
        expect(screen.getByTestId('execution-dossier-meta-fileYear')).toHaveValue('2333');
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

describe('تعديل بيانات الإضبارة — طبقة فوق محضر المتابعة', () => {
    it('يخرج عبر portal فوق الإضبارة ولا يستخدم z-[125]', () => {
        const src = fs.readFileSync(
            path.join(
                process.cwd(),
                'src/app/components/lawyer/ExecutionDashboard/components/DossierMetaEditSection.tsx',
            ),
            'utf8',
        );
        expect(src).toContain('nestedOverFollowUpPortal');
        expect(src).toContain('createPortal');
        expect(src).toContain('useOverlayBackdropArm');
        expect(src).not.toContain('z-[125]');
    });
});
