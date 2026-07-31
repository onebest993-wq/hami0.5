import { describe, expect, it } from 'vitest';

import { resolveEditableCaseNumber } from '../SmartFileModalsContentSection';

describe('resolveEditableCaseNumber', () => {
    it('uses the injected parent number when the stage still carries the legacy placeholder', () => {
        expect(resolveEditableCaseNumber('جديد', '15/ب/2026')).toBe('15/ب/2026');
    });

    it('keeps a real stage-specific number', () => {
        expect(resolveEditableCaseNumber('45/س/2026', '15/ب/2026')).toBe('45/س/2026');
    });
});
