import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderHook } from '@testing-library/react';
import { useFollowupModalTabKeepAlive } from '../followupTabKeepAlive';

describe('useFollowupModalTabKeepAlive', () => {
    it('يبقي التبويبات التي زُرتها مركّبة عند العودة', () => {
        const { result, rerender } = renderHook(
            ({ tab }: { tab: 'seizure_requests' | 'correspondences' | 'admin' }) =>
                useFollowupModalTabKeepAlive(tab),
            { initialProps: { tab: 'seizure_requests' as const } },
        );

        expect([...result.current]).toEqual(['seizure_requests']);

        rerender({ tab: 'correspondences' });
        expect(result.current.has('seizure_requests')).toBe(true);
        expect(result.current.has('correspondences')).toBe(true);

        rerender({ tab: 'admin' });
        expect(result.current.has('seizure_requests')).toBe(true);
        expect(result.current.has('correspondences')).toBe(true);
        expect(result.current.has('admin')).toBe(true);
        expect(result.current.size).toBe(3);

        rerender({ tab: 'seizure_requests' });
        expect(result.current.has('admin')).toBe(true);
        expect(result.current.size).toBe(3);
    });

    it('يصفّر التبويبات المزارة عند تبديل الإضبارة', () => {
        const { result, rerender } = renderHook(
            ({
                tab,
                dossier,
            }: {
                tab: 'seizure_requests' | 'admin';
                dossier: string;
            }) => useFollowupModalTabKeepAlive(tab, dossier),
            { initialProps: { tab: 'seizure_requests' as const, dossier: 'file-a' } },
        );

        rerender({ tab: 'admin', dossier: 'file-a' });
        expect(result.current.size).toBe(2);

        rerender({ tab: 'seizure_requests', dossier: 'file-b' });
        expect([...result.current]).toEqual(['seizure_requests']);
        expect(result.current.has('admin')).toBe(false);
    });

    it('يراكم الزيارة عبر ref لا عبر state عام لكل التبويبات من البداية', () => {
        const src = readFileSync(resolve(__dirname, '../followupTabKeepAlive.ts'), 'utf8');
        expect(src).toContain('useRef');
        expect(src).not.toContain('useState');
        expect(src).toContain('visitedRef');
    });
});
