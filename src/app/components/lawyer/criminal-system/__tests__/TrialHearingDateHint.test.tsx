import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrialHearingDateHint } from '../components/TrialHearingDateHint';
import { CRIMINAL_DOSSIER_TEST_IDS } from '../criminalDossierTestIds';

describe('TrialHearingDateHint', () => {
    it('renders formatted hearing date without session number', () => {
        render(<TrialHearingDateHint hearingDate="2026-08-15" />);

        expect(screen.getByTestId(CRIMINAL_DOSSIER_TEST_IDS.trialHearingDateHint)).toBeTruthy();
        expect(screen.getByText('موعد المحاكمة')).toBeTruthy();
        expect(screen.getByText(/لم تُسجَّل جلسة مرافعة بعد/)).toBeTruthy();
        expect(screen.queryByText(/الجلسة رقم/)).toBeNull();
    });
});
