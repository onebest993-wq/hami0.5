import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertSafeKvPrefix, HQ_VERIFICATION_QUEUE_SELECT, kvPrefixSortBounds } from '../kvStoreAdmin.ts';

describe('assertSafeKvPrefix', () => {
    it('يقبل بادئة التوثيق الكانونية', () => {
        expect(assertSafeKvPrefix('lawyer-verification:')).toBe('lawyer-verification:');
    });

    it('يرفض LIKE-injection', () => {
        expect(() => assertSafeKvPrefix('lawyer-verification:%')).toThrow(/Unsafe/);
        expect(() => assertSafeKvPrefix('a%')).toThrow(/Unsafe/);
        expect(() => assertSafeKvPrefix('../secret')).toThrow(/Unsafe/);
        expect(() => assertSafeKvPrefix('')).toThrow(/Unsafe/);
    });
});

describe('kvPrefixSortBounds', () => {
    it('يرفض البادئة الفارغة', () => {
        expect(() => kvPrefixSortBounds('')).toThrow(/Unsafe/);
    });

    it('المدى يغلق تحت البادئة التالية لا بـ LIKE عام', () => {
        const { gte, lt } = kvPrefixSortBounds('lawyer_files:u1:');
        expect(gte).toBe('lawyer_files:u1:');
        expect(lt).toBe('lawyer_files:u1:\uffff');
        expect('lawyer_files:u1:doc-1' >= gte && 'lawyer_files:u1:doc-1' < lt).toBe(true);
        expect('lawyer_files:u2:doc-1' >= gte && 'lawyer_files:u2:doc-1' < lt).toBe(false);
        expect('calendar:u1:e1' >= gte && 'calendar:u1:e1' < lt).toBe(false);
    });

    it('% في البادئة يبقى حرفاً حرفياً داخل المدى لا حرف LIKE', () => {
        const { gte, lt } = kvPrefixSortBounds('calendar:u1:%');
        expect(gte.includes('%')).toBe(true);
        expect('calendar:u1:event' >= gte && 'calendar:u1:event' < lt).toBe(false);
        expect('calendar:u1:%wild' >= gte && 'calendar:u1:%wild' < lt).toBe(true);
    });
});

describe('HQ prefix scans', () => {
    it('لا تستخدم LIKE على عمود المفتاح', () => {
        const src = readFileSync(join(process.cwd(), 'src/app/api/security/kvStoreAdmin.ts'), 'utf8');
        expect(src).not.toContain(".like('key'");
        expect(src).toContain('applyKvKeyPrefixRange');
        expect(src).toContain('kvPrefixSortBounds');
    });
});

describe('HQ_VERIFICATION_QUEUE_SELECT', () => {
    it('يقرأ الأعلام والحقول العددية بلا معاينات هوية', () => {
        expect(HQ_VERIFICATION_QUEUE_SELECT).toContain('hasIdFront:value->>hasIdFront');
        expect(HQ_VERIFICATION_QUEUE_SELECT).toContain('status:value->>status');
        expect(HQ_VERIFICATION_QUEUE_SELECT).not.toContain('idFrontPreview');
        expect(HQ_VERIFICATION_QUEUE_SELECT).not.toContain('idBackPreview');
        expect(HQ_VERIFICATION_QUEUE_SELECT).not.toContain('faceSelfiePreview');
    });
});
