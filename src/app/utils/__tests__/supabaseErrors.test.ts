import { describe, expect, it } from 'vitest';
import { isSupabaseMissingRelationError } from '../supabaseErrors';

describe('isSupabaseMissingRelationError', () => {
    it('detects HTTP 404', () => {
        expect(isSupabaseMissingRelationError({ status: 404, message: 'Not Found' })).toBe(true);
    });

    it('detects PostgREST missing relation codes', () => {
        expect(isSupabaseMissingRelationError({ code: '42P01', message: 'relation missing' })).toBe(true);
        expect(isSupabaseMissingRelationError({ code: 'PGRST205', message: 'Could not find the table' })).toBe(
            true,
        );
    });

    it('ignores unrelated errors', () => {
        expect(isSupabaseMissingRelationError({ code: '23505', message: 'duplicate' })).toBe(false);
        expect(isSupabaseMissingRelationError(null)).toBe(false);
    });
});
