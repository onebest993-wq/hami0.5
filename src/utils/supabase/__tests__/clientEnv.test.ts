import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    __resetClientEnvCacheForTests,
    extractSupabaseProjectId,
    isClientEnvPlaceholder,
    resolveClientSupabaseConfig,
} from '@/utils/supabase/clientEnv';

describe('clientEnv', () => {
    afterEach(() => {
        __resetClientEnvCacheForTests();
        vi.unstubAllEnvs();
    });

    it('extracts project id from a standard Supabase URL', () => {
        expect(extractSupabaseProjectId('https://abcxyz.supabase.co')).toBe('abcxyz');
        expect(extractSupabaseProjectId('https://abcxyz.supabase.co/')).toBe('abcxyz');
        expect(extractSupabaseProjectId('https://test-project-id.supabase.co')).toBe('test-project-id');
        expect(extractSupabaseProjectId('https://not-supabase.example.com')).toBeNull();
    });

    it('treats template placeholders as empty', () => {
        expect(isClientEnvPlaceholder('')).toBe(true);
        expect(isClientEnvPlaceholder('https://YOUR_PROJECT.supabase.co')).toBe(true);
        expect(isClientEnvPlaceholder('eyJ...')).toBe(true);
        expect(isClientEnvPlaceholder('https://abcxyz.supabase.co')).toBe(false);
    });

    it('uses VITE_* when both are real and derives a single projectId', () => {
        vi.stubEnv('VITE_SUPABASE_URL', 'https://liveproj.supabase.co');
        vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key-value');
        const cfg = resolveClientSupabaseConfig();
        expect(cfg.url).toBe('https://liveproj.supabase.co');
        expect(cfg.projectId).toBe('liveproj');
        expect(cfg.anonKey.startsWith('eyJ')).toBe(true);
    });

    it('falls back to info.ts mock in test mode when VITE_* are placeholders', () => {
        vi.stubEnv('VITE_SUPABASE_URL', 'https://YOUR_PROJECT.supabase.co');
        vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'eyJ...');
        const cfg = resolveClientSupabaseConfig();
        // setup.ts mocks info → test-project-id
        expect(cfg.projectId).toBe('test-project-id');
        expect(cfg.url).toBe('https://test-project-id.supabase.co');
    });
});
