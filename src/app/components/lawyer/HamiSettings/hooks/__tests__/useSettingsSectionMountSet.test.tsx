import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSettingsSectionMountSet } from '../useSettingsSectionMountSet';

describe('useSettingsSectionMountSet', () => {
    it('يُبقي الأقسام المُزارَة mounted بعد مغادرتها أثناء فتح الإعدادات', () => {
        const { result, rerender } = renderHook(
            ({ section, open }) => useSettingsSectionMountSet(section, open),
            {
                initialProps: { section: 'appearance' as const, open: true },
            },
        );

        expect(result.current.has('appearance')).toBe(true);
        expect(result.current.size).toBe(1);

        rerender({ section: 'data', open: true });
        expect(result.current.has('data')).toBe(true);
        expect(result.current.has('appearance')).toBe(true);
        expect(result.current.size).toBe(2);

        rerender({ section: 'security', open: true });
        expect(result.current.has('security')).toBe(true);
        expect(result.current.has('appearance')).toBe(true);
        expect(result.current.size).toBe(3);
    });

    it('عند الإغلاق يُبقي القسم النشط فقط — لا يُفرّغ اللوحة (snap reopen)', () => {
        const { result, rerender } = renderHook(
            ({ section, open }) => useSettingsSectionMountSet(section, open),
            {
                initialProps: { section: 'appearance' as const, open: true },
            },
        );

        rerender({ section: 'data', open: true });
        expect(result.current.size).toBe(2);

        rerender({ section: 'data', open: false });
        expect(result.current.size).toBe(1);
        expect(result.current.has('data')).toBe(true);
        expect(result.current.has('appearance')).toBe(false);
    });

    it('keepAlive مغلق ما زال يركّب القسم النشط من البداية', () => {
        const { result } = renderHook(
            ({ section, open }) => useSettingsSectionMountSet(section, open),
            {
                initialProps: { section: 'account' as const, open: false },
            },
        );

        expect(result.current.size).toBe(1);
        expect(result.current.has('account')).toBe(true);
    });
});
