import { describe, expect, it } from 'vitest';
import {
    formatMoneyIntegerDisplay,
    handleMoneyInputChange,
    isPartialMoneyInput,
    normalizeIndicDigits,
    stripMoneyGrouping,
} from '../moneyInput';

describe('moneyInput', () => {
    describe('normalizeIndicDigits', () => {
        it('converts Arabic-Indic digits to ASCII', () => {
            expect(normalizeIndicDigits('١٢٣')).toBe('123');
        });

        it('converts Persian digits to ASCII', () => {
            expect(normalizeIndicDigits('۱۲۳')).toBe('123');
        });

        it('leaves ASCII digits unchanged', () => {
            expect(normalizeIndicDigits('456')).toBe('456');
        });
    });

    describe('stripMoneyGrouping', () => {
        it('removes commas and Arabic thousands separator', () => {
            expect(stripMoneyGrouping('1,234\u066C567')).toBe('1234567');
        });

        it('normalizes Arabic digits before stripping', () => {
            expect(stripMoneyGrouping('١٬٢٣٤')).toBe('1234');
        });
    });

    describe('isPartialMoneyInput', () => {
        it('accepts empty and partial numeric strings', () => {
            expect(isPartialMoneyInput('')).toBe(true);
            expect(isPartialMoneyInput('123')).toBe(true);
            expect(isPartialMoneyInput('12.')).toBe(true);
        });

        it('rejects non-numeric strings', () => {
            expect(isPartialMoneyInput('abc')).toBe(false);
        });
    });

    describe('handleMoneyInputChange', () => {
        it('accepts Arabic-Indic digit input', () => {
            let stored = '';
            handleMoneyInputChange('١٢٣', (v) => {
                stored = v;
            });
            expect(stored).toBe('123');
        });

        it('ignores invalid characters', () => {
            let stored = '50';
            handleMoneyInputChange('abc', (v) => {
                stored = v;
            });
            expect(stored).toBe('50');
        });
    });

    describe('formatMoneyIntegerDisplay', () => {
        it('formats ASCII digits with grouping', () => {
            expect(formatMoneyIntegerDisplay('1234567')).toBe('1,234,567');
        });

        it('formats Arabic-Indic digits after normalization', () => {
            expect(formatMoneyIntegerDisplay('١٢٣٤٥٦')).toBe('123,456');
        });
    });
});
