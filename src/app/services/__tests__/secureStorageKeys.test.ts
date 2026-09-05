import { describe, expect, it } from 'vitest';

import {
    ENCRYPT_MAX_BYTES,
    fallsBackToPlaintextBySize,
    isEncryptOrFailStorageKey,
    isExecutionLocalPlaintextKey,
    isSensitiveStorageKey,
    isTransactionsStorageKey,
    isWarmEncryptAlwaysKey,
    shouldEncryptValue,
} from '@/app/services/secureStorageKeys';

/**
 * سياسة offline-first للتنفيذ: لا تشفير محلي يومي — الحمولة السحابية وحدها تُشفَّر.
 * المعاملات ليست ضمن الاستثناء: العزل عندها شبكي لا تشفيري.
 */
describe('secureStorageKeys execution local plaintext', () => {
    it('بلوب الإضبارة والفهرس plaintext محلي', () => {
        expect(isExecutionLocalPlaintextKey('execution_exec_priv_1')).toBe(true);
        expect(isExecutionLocalPlaintextKey('execution_exec_priv_1_decisions')).toBe(true);
        expect(isExecutionLocalPlaintextKey('execution_form_exec_priv_1')).toBe(true);
        expect(isExecutionLocalPlaintextKey('executionFiles')).toBe(true);
        expect(isExecutionLocalPlaintextKey('executionFiles:user-abc')).toBe(true);
        expect(isSensitiveStorageKey('execution_exec_priv_1')).toBe(false);
        expect(shouldEncryptValue('execution_x', '{"id":"x"}')).toBe(false);
        expect(shouldEncryptValue('executionFiles:user-abc', '[{"id":"e1"}]')).toBe(false);
    });

    it('أقمار التنفيذ اليومية plaintext', () => {
        expect(isExecutionLocalPlaintextKey('hami_unified_funds_ledger_exec_1')).toBe(true);
        expect(isExecutionLocalPlaintextKey('hami_garnishment_details_exec_1')).toBe(true);
        expect(isExecutionLocalPlaintextKey('garnishment_exec_1')).toBe(true);
        expect(isSensitiveStorageKey('hami_unified_funds_ledger_exec_1')).toBe(false);
        expect(shouldEncryptValue('hami_unified_funds_ledger_exec_1', '{}')).toBe(false);
    });

    it('tombstones التنفيذ plaintext محلي', () => {
        expect(isExecutionLocalPlaintextKey('hami:execution:dossier-tombstones:v1')).toBe(true);
        expect(isExecutionLocalPlaintextKey('hami:execution:dossier-tombstones:v1:uid-1')).toBe(true);
        expect(shouldEncryptValue('hami:execution:dossier-tombstones:v1', '["e1"]')).toBe(false);
    });

    it('الدعاوى تبقى مشفّرة محلياً', () => {
        expect(isSensitiveStorageKey('lawyer_files_active')).toBe(true);
        expect(shouldEncryptValue('lawyer_files_active', '{"cases":[]}')).toBe(true);
        expect(isExecutionLocalPlaintextKey('lawyer_files_active')).toBe(false);
    });

    it('مفاتيح واجهة غير التنفيذ تبقى كما هي', () => {
        expect(isSensitiveStorageKey('lawyer_theme')).toBe(false);
        expect(isExecutionLocalPlaintextKey('lawyer_theme')).toBe(false);
    });
});

describe('secureStorageKeys transactions stay encrypted at rest', () => {
    const oversize = 'x'.repeat(ENCRYPT_MAX_BYTES + 1);

    it('سجل المعاملات والخيوط والقوالب مفاتيح حسّاسة تُشفَّر', () => {
        for (const key of [
            'hami:transactions:v1',
            'hami:transactionsThreading:v1:user-1',
            'hami:transactions:taskTemplates:v1:user-1',
        ] as const) {
            expect(isTransactionsStorageKey(key)).toBe(true);
            expect(isSensitiveStorageKey(key)).toBe(true);
            expect(shouldEncryptValue(key, '[]')).toBe(true);
        }
    });

    it('فوق حدّ الحجم تُشفَّر أو تفشل بلا سقوط لنص صريح', () => {
        for (const key of ['hami:transactions:v1', 'hami:transactionsThreading:v1:user-1'] as const) {
            expect(isWarmEncryptAlwaysKey(key)).toBe(true);
            expect(isEncryptOrFailStorageKey(key)).toBe(true);
            expect(fallsBackToPlaintextBySize(key, oversize)).toBe(false);
            expect(shouldEncryptValue(key, oversize)).toBe(true);
        }
    });

    it('لا يخلط معاملات مع مفاتيح أخرى', () => {
        expect(isTransactionsStorageKey('hami:calendar:events:v1')).toBe(false);
        expect(isTransactionsStorageKey('lawyer_files_active')).toBe(false);
    });
});

describe('secureStorageKeys settings stay encrypted at rest', () => {
    const oversize = 'x'.repeat(ENCRYPT_MAX_BYTES + 1);

    it('lawyer_settings تشفير أو فشل — بلا سقوط لنص صريح', () => {
        expect(isSensitiveStorageKey('lawyer_settings')).toBe(true);
        expect(isWarmEncryptAlwaysKey('lawyer_settings')).toBe(true);
        expect(isEncryptOrFailStorageKey('lawyer_settings')).toBe(true);
        expect(fallsBackToPlaintextBySize('lawyer_settings', oversize)).toBe(false);
        expect(shouldEncryptValue('lawyer_settings', oversize)).toBe(true);
        expect(shouldEncryptValue('lawyer_settings', '{}')).toBe(true);
    });
});

describe('secureStorageKeys tasks stay encrypted at rest', () => {
    const oversize = 'x'.repeat(ENCRYPT_MAX_BYTES + 1);

    it('مهام الأجندة وطلبات العون تشفير أو فشل', () => {
        for (const key of ['hami_quantum_legal_tasks_v1', 'hami_task_help_requests_v1'] as const) {
            expect(isSensitiveStorageKey(key)).toBe(true);
            expect(isWarmEncryptAlwaysKey(key)).toBe(true);
            expect(isEncryptOrFailStorageKey(key)).toBe(true);
            expect(fallsBackToPlaintextBySize(key, oversize)).toBe(false);
            expect(shouldEncryptValue(key, oversize)).toBe(true);
        }
    });
});
