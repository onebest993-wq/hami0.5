/**
 * مقطع دعاوى واحد فوق ENCRYPT_MAX_BYTES — تحذير DEV دون كسر الكتابة/الإقلاع.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ENCRYPT_MAX_BYTES } from '@/app/services/secureStorageKeys';
import { warnIfLawsuitSegmentExceedsEncryptLimit } from '@/app/domain/lawsuit/lawsuitSegmentStorage';

describe('warnIfLawsuitSegmentExceedsEncryptLimit', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('does not warn under the encrypt size cap', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        warnIfLawsuitSegmentExceedsEncryptLimit(
            'lawyer_files_active',
            'x'.repeat(ENCRYPT_MAX_BYTES),
        );
        expect(warn).not.toHaveBeenCalled();
    });

    it('warns once-shaped message when a single segment exceeds the cap', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const over = 'x'.repeat(ENCRYPT_MAX_BYTES + 8);
        warnIfLawsuitSegmentExceedsEncryptLimit('lawyer_files_archived', over);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0]?.[0])).toContain('lawyer_files_archived');
        expect(String(warn.mock.calls[0]?.[0])).toContain('ENCRYPT_MAX_BYTES');
    });
});
