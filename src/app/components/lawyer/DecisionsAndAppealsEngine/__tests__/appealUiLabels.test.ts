import { describe, expect, it } from 'vitest';
import {
    appealAppellantDisplayLabel,
    appealCassationEntryLabels,
    appealCreditorRequestPauseGateMessage,
    appealCreditorRequestRevokedGateMessage,
    appealDirectCassationButtonLabel,
    appealInitialCassationEntryButtonLabel,
    appealInitialGrievanceEntryButtonLabel,
    appealCreditorAgentDebtorHarmedNotice,
    appealInitialCassationTimeline,
    appealRelabelTimelineMessage,
    cassationCourtButtonClass,
    isAppealResultFavorableToDebtorClient,
    resolveAppealUiPerspective,
} from '../appealUiLabels';

describe('appealUiLabels', () => {
    it('detects debtor agent perspective from execution data', () => {
        expect(
            resolveAppealUiPerspective({
                representedParty: 'debtor',
                debtors: [{ isClient: true }],
                creditors: [],
            })
        ).toBe('debtor_agent');
    });

    it('uses first-person cassation label for debtor agent', () => {
        const labels = appealCassationEntryLabels('debtor_agent', 'debtor');
        expect(labels.button).toBe('تمييز قرار المنفذ');
        expect(labels.timelineDescription).toContain('وكيل المدين');
    });

    it('keeps third-person label for creditor agent recording debtor cassation', () => {
        const labels = appealCassationEntryLabels('creditor_agent', 'debtor');
        expect(labels.button).toBe('قام المدين بتمييز القرار');
    });

    it('shows static notice when creditor agent has no appeal path', () => {
        expect(appealCreditorAgentDebtorHarmedNotice()).toContain('للمدين فقط');
        expect(appealCreditorAgentDebtorHarmedNotice()).toContain('وكيل الدائن');
    });

    it('splits initial appeal entry labels by harmed party for debtor agent', () => {
        expect(appealInitialGrievanceEntryButtonLabel('debtor_agent', 'debtor')).toBe(
            'سجل تظلم موكّلنا'
        );
        expect(appealInitialGrievanceEntryButtonLabel('debtor_agent', 'lawyer')).toBe(
            'قام الدائن بالطعن'
        );
        expect(appealInitialCassationEntryButtonLabel('debtor_agent', 'lawyer', false)).toContain(
            'الدائن'
        );
        expect(appealInitialCassationEntryButtonLabel('debtor_agent', 'debtor', false)).toBe(
            'ميّز قرار المنفذ مباشرة'
        );
    });

    it('uses debtor-agent direct cassation button copy', () => {
        expect(appealDirectCassationButtonLabel('debtor_agent', false)).toBe(
            'ميّز قرار المنفذ مباشرة'
        );
    });

    it('uses debtor-agent timeline for initial cassation', () => {
        expect(appealInitialCassationTimeline('debtor_agent', 'debtor')).toContain(
            'موكّل المدين'
        );
    });

    it('uses first-person pause gate copy for debtor agent', () => {
        expect(appealCreditorRequestPauseGateMessage('debtor_agent')).toContain('موكّلنا');
        expect(appealCreditorRequestPauseGateMessage('debtor_agent')).toContain(
            'حتى يسجّل الدائن تمييزاً'
        );
        expect(appealCreditorRequestPauseGateMessage('debtor_agent')).not.toContain(
            'سجّل التمييز أدناه'
        );
        expect(
            appealCreditorRequestPauseGateMessage('debtor_agent', { cassationFiled: true })
        ).toContain('سجّل تمييزاً');
    });

    it('maps debtor appellant label for debtor agent proceedings', () => {
        expect(appealAppellantDisplayLabel('المدين', 'debtor_agent')).toBe('موكّلنا');
        expect(appealAppellantDisplayLabel('الدائن', 'debtor_agent')).toBe('الدائن');
    });

    it('uses debtor-agent revoked gate copy', () => {
        expect(appealCreditorRequestRevokedGateMessage('debtor_agent', true)).toContain(
            'طلب الدائن'
        );
    });

    it('scores appeal results from debtor-client perspective', () => {
        expect(isAppealResultFavorableToDebtorClient('قبول التظلم', 'debtor')).toBe(true);
        expect(isAppealResultFavorableToDebtorClient('قبول التظلم', 'lawyer')).toBe(false);
        expect(isAppealResultFavorableToDebtorClient('رد التظلم', 'lawyer')).toBe(true);
        expect(isAppealResultFavorableToDebtorClient('نقض القرار', 'lawyer')).toBe(true);
        expect(isAppealResultFavorableToDebtorClient('نقض القرار', 'debtor')).toBe(false);
        expect(isAppealResultFavorableToDebtorClient('تصديق القرار', 'debtor')).toBe(true);
        expect(isAppealResultFavorableToDebtorClient('تصديق القرار', 'lawyer')).toBe(false);
    });

    it('relabels stored timeline copy for debtor agent', () => {
        expect(
            appealRelabelTimelineMessage('تم تسجيل تظلم موكّل المدين', 'debtor_agent')
        ).toBe('تم تسجيل تظلم موكّلنا');
        expect(
            appealRelabelTimelineMessage('قُبل التظلم — يتاح للطرف الآخر التمييز', 'debtor_agent')
        ).toContain('موكّلنا');
        expect(
            appealRelabelTimelineMessage('قُبل التظلم — يتاح للطرف الآخر التمييز', 'creditor_agent')
        ).not.toContain('موكّلنا');
    });

    it('colors cassation court buttons from debtor-client favorability', () => {
        expect(cassationCourtButtonClass('debtor_agent', 'debtor', 'rad_laheeza')).toContain(
            'emerald'
        );
        expect(cassationCourtButtonClass('debtor_agent', 'lawyer', 'rad_laheeza')).toContain(
            'rose'
        );
        expect(cassationCourtButtonClass('debtor_agent', 'lawyer', 'naqd')).toContain('emerald');
        expect(cassationCourtButtonClass('creditor_agent', 'debtor', 'naqd')).toContain('purple');
    });
});

describe('debtor agent card deduplication helpers', () => {
    it('hides fate line when header pill already states appeal outcome', async () => {
        const {
            shouldHideDebtorAgentFateLine,
            shouldShowAppealResultChipSeparate,
        } = await import('../utils');
        expect(
            shouldHideDebtorAgentFateLine('الطعن لصالح موكّلنا', { kind: 'continue', message: '' })
        ).toBe(true);
        expect(
            shouldHideDebtorAgentFateLine('لصالح موكّلنا — قبول المنفذ', {
                kind: 'continue',
                message: '',
            })
        ).toBe(false);
        expect(
            shouldShowAppealResultChipSeparate('الطعن ضد موكّلنا', 'debtor_agent')
        ).toBe(false);
        expect(
            shouldShowAppealResultChipSeparate('طعن الدائن — تظلم', 'debtor_agent')
        ).toBe(false);
        expect(
            shouldShowAppealResultChipSeparate('الطعن ضد موكّلنا', 'creditor_agent')
        ).toBe(true);
    });
});
