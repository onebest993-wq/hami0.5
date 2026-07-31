import { describe, expect, it } from 'vitest';
import { fingerprintExecutionOverlayData } from '../executionDashboardCore/executionOverlayDataFingerprint';

describe('fingerprintExecutionOverlayData — مزامنة دورة التبليغ', () => {
    it('يتغيّر عند مسح التكليف بنفس معرف الملف', () => {
        const before = {
            id: 'exec-1',
            employee_summons_assignments_by_debtor: {
                d1: { phase: 'active', purpose: 'حضور' },
            },
        };
        const after = {
            id: 'exec-1',
            employee_summons_assignments_by_debtor: {},
        };
        expect(fingerprintExecutionOverlayData(before)).not.toBe(
            fingerprintExecutionOverlayData(after),
        );
    });

    it('يتغيّر عند مسح التبليغ بالنشر', () => {
        const before = {
            id: 'exec-1',
            publication_notice_by_debtor: {
                d1: {
                    publicationDateYmd: '2020-01-01',
                    newspaper1: 'أ',
                    newspaper2: 'ب',
                },
            },
        };
        const after = {
            id: 'exec-1',
            publication_notice_by_debtor: {},
        };
        expect(fingerprintExecutionOverlayData(before)).not.toBe(
            fingerprintExecutionOverlayData(after),
        );
    });

    it('يتتبّع المفتاح الصحيح debtor_summons_marker_by_debtor (لا typo markers)', () => {
        const before = {
            id: 'exec-1',
            debtor_summons_marker_by_debtor: {
                d2: { id: 'm1', date: '2020-01-01', purpose: 'تبليغ' },
            },
        };
        const after = {
            id: 'exec-1',
            debtor_summons_marker_by_debtor: {},
        };
        expect(fingerprintExecutionOverlayData(before)).not.toBe(
            fingerprintExecutionOverlayData(after),
        );
        // المفتاح الخاطئ (typo القديم) لا يجب أن يُستخدم كمصدر وحيد
        const typoOnly = {
            id: 'exec-1',
            debtor_summons_markers_by_debtor: {
                d2: { id: 'm1', date: '2020-01-01', purpose: 'تبليغ' },
            },
        };
        expect(fingerprintExecutionOverlayData(typoOnly)).toBe(
            fingerprintExecutionOverlayData({ id: 'exec-1' }),
        );
    });
});
