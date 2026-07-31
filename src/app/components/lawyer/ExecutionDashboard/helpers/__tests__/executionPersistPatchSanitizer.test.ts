import { describe, expect, it } from 'vitest';
import { sanitizeExecutionPersistPatch } from '../executionPersistPatchSanitizer';

describe('sanitizeExecutionPersistPatch', () => {
    it('rejects prototype pollution keys', () => {
        const malicious: Record<string, unknown> = {
            creditors: [{ name: 'x', phone: '', address: '' }],
        };
        Object.defineProperty(malicious, '__proto__', {
            value: { polluted: true },
            enumerable: true,
        });
        const result = sanitizeExecutionPersistPatch(malicious);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(Object.prototype.hasOwnProperty.call(result.patch, '__proto__')).toBe(false);
        }
    });

    it('strips invalid party phone instead of rejecting the whole patch', () => {
        const result = sanitizeExecutionPersistPatch({
            creditors: [{ id: 'c1', name: 'دائن', phone: '123', address: '', isDeceased: true }],
            is_creditor_deceased: true,
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
            const creditors = result.patch.creditors as Array<Record<string, unknown>>;
            expect(creditors[0]?.phone).toBe('');
            expect(creditors[0]?.isDeceased).toBe(true);
            expect(result.patch.is_creditor_deceased).toBe(true);
        }
    });

    it('accepts valid party and dossier meta patch', () => {
        const result = sanitizeExecutionPersistPatch({
            directorate: 'مديرية الكرخ',
            fileNumber: '880',
            fileYear: '2026',
            creditors: [{ id: 'c1', name: 'دائن', phone: '07701234567', address: 'بغداد' }],
        });
        expect(result.ok).toBe(true);
    });

    it('rejects oversize note body', () => {
        const result = sanitizeExecutionPersistPatch({
            noteTitle: 'ملاحظة',
            noteBody: 'x'.repeat(9000),
        });
        expect(result.ok).toBe(false);
    });

    it('rejects oversize caseNotesLog row body', () => {
        const result = sanitizeExecutionPersistPatch({
            caseNotesLog: [{ id: 'n1', title: 'م', body: 'x'.repeat(9000) }],
        });
        expect(result.ok).toBe(false);
    });

    it('accepts valid caseNotesLog and caps pauseReason', () => {
        const result = sanitizeExecutionPersistPatch({
            caseNotesLog: [{ id: 'n1', title: 'ملاحظة', body: 'تفاصيل' }],
            isPaused: true,
            pauseReason: '  قرار محكمة  ',
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.patch.pauseReason).toBe('قرار محكمة');
        }
    });
});
