import { describe, expect, it } from 'vitest';

import { getExecutionStorageBundleKeys } from '@/app/utils/executionStorageKeysLite';
import {
    EXECUTION_WIPE_KEY_PREFIXES,
    shouldPurgeExecutionLocalKey,
} from '@/app/utils/executionWipeRegistry';

/**
 * ثبات دورة حياة الحذف.
 *
 * كان في المستودع قائمتان لمفاتيح التنفيذ: سجل المسح عند تسجيل الخروج
 * (`EXECUTION_WIPE_KEY_PREFIXES`) وحزمة حذف الإضبارة الواحدة
 * (`getExecutionStorageBundleKeys`) — والثانية مكتوبة يدوياً فانحرفت عن الأولى.
 * فسقط من الحزمة `hami_unified_funds_ledger_` و`hami_eviction_grace_`
 * و`hami:employee_personal_unlock`، وأخطرها الأول: **السجل المالي — الأتعاب
 * والنفقات والمدفوعات — كان ينجو من «الحذف النهائي»** ويبقى على القرص.
 *
 * والمسح بالبادئة في `removeExecutionStorageBundleAsync` لا يُنجي: فهو يطابق
 * `execution_{id}` فقط، ولا واحد من الثلاثة يبدأ بذلك.
 *
 * هذا الاختبار يجعل الانحراف مستحيلاً: كل عائلة مفاتيح يملكها القسم يجب أن
 * تكون قابلة للمحو لكل إضبارة على حدة.
 */
describe('execution delete bundle covers every execution-owned key family', () => {
    const DOSSIER_ID = 'exec_cover_1';

    it.each([...EXECUTION_WIPE_KEY_PREFIXES])(
        'purges at least one key for prefix %s',
        (prefix) => {
            const keys = getExecutionStorageBundleKeys(DOSSIER_ID);
            const matching = keys.filter((k) => k.startsWith(prefix));
            expect(
                matching.length,
                `no key in the delete bundle starts with "${prefix}" — data under that prefix survives permanent delete`,
            ).toBeGreaterThan(0);
        },
    );

    it('names the dossier in every purged key so one dossier cannot wipe another', () => {
        const keys = getExecutionStorageBundleKeys(DOSSIER_ID);
        expect(keys.length).toBeGreaterThan(0);
        for (const key of keys) {
            expect(key, `"${key}" does not carry the dossier id`).toContain(DOSSIER_ID);
        }
    });

    it('keeps the logout purge and the per-dossier delete in agreement', () => {
        for (const key of getExecutionStorageBundleKeys(DOSSIER_ID)) {
            expect(
                shouldPurgeExecutionLocalKey(key),
                `"${key}" is deleted per dossier but survives logout purge`,
            ).toBe(true);
        }
    });

    it('purges the financial ledger — the regression that started this test', () => {
        const keys = getExecutionStorageBundleKeys(DOSSIER_ID);
        expect(keys).toContain(`hami_unified_funds_ledger_${DOSSIER_ID}`);
    });

    it('does not reach into a different dossier', () => {
        const keys = getExecutionStorageBundleKeys('exec_1');
        expect(keys).not.toContain('execution_exec_12');
        expect(keys.some((k) => k.includes('exec_12'))).toBe(false);
    });
});
