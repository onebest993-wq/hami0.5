import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSparkTextAuditEnabled } from '@/app/spark/audit/sparkAuditConfig';
import {
    resetSparkAuditRuntimeForTests,
    triggerSparkDocumentAudit,
} from '@/app/spark/audit/triggerSparkDocumentAudit';

describe('spark audit guards', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        resetSparkAuditRuntimeForTests();
    });

    it('التدقيق النصي معطّل افتراضياً', () => {
        vi.stubEnv('VITE_SPARK_TEXT_AUDIT_ENABLED', '');
        expect(isSparkTextAuditEnabled()).toBe(false);
    });

    it('يُفعَّل فقط عند VITE_SPARK_TEXT_AUDIT_ENABLED=true', () => {
        vi.stubEnv('VITE_SPARK_TEXT_AUDIT_ENABLED', 'true');
        expect(isSparkTextAuditEnabled()).toBe(true);
    });

    it('لا يرمي خطأ عند الاستدعاء وهو معطّل', () => {
        vi.stubEnv('VITE_SPARK_TEXT_AUDIT_ENABLED', '');
        expect(() =>
            triggerSparkDocumentAudit({
                dossierKey: 'lawsuit:test',
                fieldType: 'petition',
                text: 'نص طويل بما يكفي لتفعيل التدقيق الشكلي في الاختبار',
            }),
        ).not.toThrow();
    });

    it('يتجاهل النصوص القصيرة حتى مع التفعيل', () => {
        vi.stubEnv('VITE_SPARK_TEXT_AUDIT_ENABLED', 'true');
        expect(() =>
            triggerSparkDocumentAudit({
                dossierKey: 'lawsuit:short',
                fieldType: 'petition',
                text: 'قصير',
            }),
        ).not.toThrow();
    });
});
