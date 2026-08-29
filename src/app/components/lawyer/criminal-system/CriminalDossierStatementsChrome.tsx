import React, { type Dispatch, type SetStateAction } from 'react';
import type { CriminalStoreState, Statement } from './criminalStore';
import { OtherEvidenceEntryForm } from './components/OtherEvidenceEntryForm';
import { CRIMINAL_DOSSIER_TEST_IDS } from './criminalDossierTestIds';
import type { TrialDeposition } from './trialDepositionsEngine';

export type CriminalDossierStatementsChromeProps = {
    setIsOtherEvidenceFormOpen: Dispatch<SetStateAction<boolean>>;
    isOtherEvidenceReadOnly: boolean;
    isEffectiveTrialCourtStage: boolean;
    setEditingTrialDeposition: Dispatch<SetStateAction<TrialDeposition | null>>;
    setIsTrialDepositionModalOpen: Dispatch<SetStateAction<boolean>>;
    setEditingStatement: Dispatch<SetStateAction<Statement | null>>;
    setIsStatementModalOpen: Dispatch<SetStateAction<boolean>>;
    isStatementsTabReadOnly: boolean;
    isOtherEvidenceFormOpen: boolean;
    addOtherEvidenceItem: CriminalStoreState['addOtherEvidenceItem'];
    caseId: string;
    showLegalToast: (message: string, durationMs?: number) => void;
};

/**
 * شريط أدوات تبويب الإفادات + نموذج أدلة الإثبات الأخرى — مستخرَج حرفياً من
 * CriminalDashboardDossierBody. لوحة LazyCriminalDashboardStatementsTab تبقى في المضيف.
 */
export function CriminalDossierStatementsChrome({
    setIsOtherEvidenceFormOpen,
    isOtherEvidenceReadOnly,
    isEffectiveTrialCourtStage,
    setEditingTrialDeposition,
    setIsTrialDepositionModalOpen,
    setEditingStatement,
    setIsStatementModalOpen,
    isStatementsTabReadOnly,
    isOtherEvidenceFormOpen,
    addOtherEvidenceItem,
    caseId,
    showLegalToast,
}: CriminalDossierStatementsChromeProps) {
    return (
        <>
            <div className="flex items-center justify-between gap-3">
                <div className="text-white/80 font-black text-sm whitespace-normal break-words">سجل الإفادات</div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        data-testid={CRIMINAL_DOSSIER_TEST_IDS.otherEvidenceToggle}
                        onClick={() => setIsOtherEvidenceFormOpen((v) => !v)}
                        disabled={isOtherEvidenceReadOnly}
                        className="rounded-lg border border-white/15 bg-white/10 text-white px-4 py-2 text-sm font-black hover:bg-white/15 transition whitespace-normal break-words print:hidden disabled:opacity-40 disabled:pointer-events-none min-h-[44px] touch-manipulation"
                    >
                        أدلة الإثبات الأخرى
                    </button>
                    <button
                        type="button"
                        data-testid={CRIMINAL_DOSSIER_TEST_IDS.statementsAdd}
                        onClick={() => {
                            if (isEffectiveTrialCourtStage) {
                                setEditingTrialDeposition(null);
                                setIsTrialDepositionModalOpen(true);
                                return;
                            }
                            setEditingStatement(null);
                            setIsStatementModalOpen(true);
                        }}
                        disabled={isStatementsTabReadOnly}
                        className="rounded-lg bg-[#E6C673] text-[#0B1021] px-4 py-2 text-sm font-black hover:brightness-110 active:brightness-95 transition whitespace-normal break-words print:hidden disabled:opacity-40 disabled:pointer-events-none min-h-[44px] touch-manipulation"
                    >
                        + إضافة إلى سجل الإفادات
                    </button>
                </div>
            </div>
            {isOtherEvidenceFormOpen ? (
                <OtherEvidenceEntryForm
                    onSubmit={(item) => addOtherEvidenceItem(caseId, item)}
                    onClose={() => setIsOtherEvidenceFormOpen(false)}
                    showLegalToast={showLegalToast}
                />
            ) : null}
        </>
    );
}
