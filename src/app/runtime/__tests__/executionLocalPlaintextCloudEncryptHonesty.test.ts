import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    isExecutionLocalPlaintextKey,
    shouldEncryptValue,
} from '@/app/services/secureStorageKeys';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('execution local plaintext + cloud encrypt honesty', () => {
    it('المسار اليومي لا يشفّر مفاتيح التنفيذ محلياً', () => {
        expect(isExecutionLocalPlaintextKey('execution_abc')).toBe(true);
        expect(shouldEncryptValue('execution_abc', '{"debtors":[]}')).toBe(false);
        expect(shouldEncryptValue('executionFiles', '[]')).toBe(false);
    });

    it('مزامنة السحابة ما زالت تشفّر الحمولة في SupabaseService', () => {
        const src = read('src/app/services/SupabaseService.ts');
        expect(src).toContain('async function encryptJsonPayload');
        expect(src).toContain('CryptoService.encryptData');
        expect(src).toContain('encrypted_data');
        expect(src).toContain('async function decryptJsonPayload');
        expect(src).toContain('saveExecutionFile');
        expect(src).toContain('getExecutionFiles');
    });

    it('الإجراء القسري لا يشفّر حمولة محلية بـ CryptoService — السحابة فقط', () => {
        const travel = read(
            'src/app/components/lawyer/execution/personalCoercive/hooks/derived/usePersonalCoerciveDerivedFlowTravel.ts'
        );
        expect(travel).not.toContain('CryptoService');
        expect(travel).not.toContain('encryptData');
        expect(travel).not.toContain('queueEncryptedPayloadForDecision');
        expect(travel).not.toMatch(/encryptedPayloadJson\s*[:=]/);
        const submit = read(
            'src/app/components/lawyer/execution/personalCoercive/hooks/actions/usePersonalCoerciveSubmitCore.tsx'
        );
        expect(submit).not.toContain('queueEncryptedPayloadForDecision');
        expect(submit).not.toContain('CryptoService');
    });

    it('API upsert يرفض حمولة بلا encrypted_data موقّعة', () => {
        const upsert = read('src/app/api/execution-files/upsert/route.ts');
        expect(upsert).toContain('encrypted_data');
        expect(upsert).toContain('encryptedPayloadSignatureMatches');
        expect(upsert).toContain('computeDossierPayloadMac');
    });

    it('تسخين البلوب يرحّل ciphertext القديم فقط — بلا إعادة كتابة كل فتح', () => {
        const persist = read('src/app/utils/executionDossierBlobPersistence.ts');
        expect(persist).toContain('ensureExecutionDossierBlobReady');
        expect(persist).toContain('hami_enc_v2');
        expect(persist).toContain('peekRawFromDisk');
        expect(persist).toContain('startsWith(CIPHER_PREFIX)');
        expect(persist).not.toContain('ترحيل النص الصريح القديم إلى تشفير');
        // لا يجب أن يعيد setItem بلا شرط بعد كل getItem
        expect(persist).not.toMatch(
            /const value = await SecureStoreService\.getItem\(key\);\s*if \(value\) \{\s*await SecureStoreService\.setItem\(key, value\);/,
        );
    });
});
