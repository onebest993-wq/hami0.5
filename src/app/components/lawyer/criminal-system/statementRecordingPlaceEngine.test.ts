import { describe, expect, it } from 'vitest';
import {
    isJudicialInvestigationDeposit,
    resolveEffectiveStatementRecordingPlace,
    shouldRequireStatementRecordingPlace,
    shouldShowJudicialRatificationCheckbox,
    shouldShowStatementRecordingPlacePicker,
} from './statementRecordingPlaceEngine';

describe('statementRecordingPlaceEngine', () => {
    it('hides place picker when papers are at judicial investigation office', () => {
        expect(
            shouldShowStatementRecordingPlacePicker(true, 'مكتب تحقيق قضائي'),
        ).toBe(false);
        expect(isJudicialInvestigationDeposit('مكتب تحقيق قضائي')).toBe(true);
    });

    it('shows place picker for police deposit or unset deposit during investigation', () => {
        expect(shouldShowStatementRecordingPlacePicker(true, 'مركز شرطة')).toBe(true);
        expect(shouldShowStatementRecordingPlacePicker(true, '')).toBe(true);
        expect(shouldShowStatementRecordingPlacePicker(false, 'مركز شرطة')).toBe(false);
    });

    it('shows ratification only for judicial investigator path in investigation', () => {
        expect(
            shouldShowJudicialRatificationCheckbox(true, 'مكتب تحقيق قضائي', ''),
        ).toBe(true);
        expect(
            shouldShowJudicialRatificationCheckbox(true, 'مركز شرطة', 'judicial_investigator'),
        ).toBe(true);
        expect(
            shouldShowJudicialRatificationCheckbox(true, 'مركز شرطة', 'investigation_officer'),
        ).toBe(false);
        expect(
            shouldShowJudicialRatificationCheckbox(false, 'مكتب تحقيق قضائي', ''),
        ).toBe(false);
    });

    it('resolves implicit judicial place when deposit is at judicial office', () => {
        expect(resolveEffectiveStatementRecordingPlace('مكتب تحقيق قضائي', '')).toBe(
            'judicial_investigator',
        );
        expect(resolveEffectiveStatementRecordingPlace('مركز شرطة', 'investigation_officer')).toBe(
            'investigation_officer',
        );
        expect(resolveEffectiveStatementRecordingPlace('مركز شرطة', '')).toBeUndefined();
    });

    it('requires explicit place selection only when picker is visible', () => {
        expect(shouldRequireStatementRecordingPlace(true, 'مركز شرطة')).toBe(true);
        expect(shouldRequireStatementRecordingPlace(true, 'مكتب تحقيق قضائي')).toBe(false);
    });
});
