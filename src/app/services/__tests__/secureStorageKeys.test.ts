import { describe, expect, it } from 'vitest';

import {
    isExecutionLocalPlaintextKey,
    isSensitiveStorageKey,
    isTransactionsLocalPlaintextKey,
    shouldEncryptValue,
} from '@/app/services/secureStorageKeys';

/**
 * سياسة offline-first للتنفيذ والمعاملات: لا تشفير محلي يومي.
 * الشبكة/WIFE فقط عند مزامنة العمل؛ تشفير إضبارة الدعاوى/التنفيذ عند السحابة منفصل.
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

describe('secureStorageKeys transactions local plaintext', () => {
    it('سجل المعاملات والخيوط والقوالب plaintext محلي', () => {
        expect(isTransactionsLocalPlaintextKey('hami:transactions:v1')).toBe(true);
        expect(isTransactionsLocalPlaintextKey('hami:transactionsThreading:v1:user-1')).toBe(true);
        expect(isTransactionsLocalPlaintextKey('hami:transactions:taskTemplates:v1:user-1')).toBe(true);
        expect(isSensitiveStorageKey('hami:transactions:v1')).toBe(false);
        expect(shouldEncryptValue('hami:transactions:v1', '[]')).toBe(false);
        expect(shouldEncryptValue('hami:transactionsThreading:v1:user-1', '{}')).toBe(false);
    });

    it('لا يخلط معاملات مع مفاتيح أخرى', () => {
        expect(isTransactionsLocalPlaintextKey('hami:calendar:events:v1')).toBe(false);
        expect(isTransactionsLocalPlaintextKey('lawyer_files_active')).toBe(false);
    });
});
