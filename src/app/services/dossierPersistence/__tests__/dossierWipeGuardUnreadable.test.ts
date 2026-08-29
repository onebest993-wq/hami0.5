import { describe, expect, it } from 'vitest';
import {
    isEmptyingPayload,
    readProtectedItemCount,
    shouldRejectDossierWipe,
} from '@/app/services/dossierPersistence/dossierWipeGuard';

/*
 * سلسلة الضياع التي تغلقها هذه الحالات:
 * قراءة تفشل → واجهة فارغة → أول حفظة تلقائية `[]` → الحارس يعدّ الموجود
 * «صفراً» لأنه لم يستطع تحليله → يأذن بالكتابة → آخر نسخة قابلة للإنقاذ تُمحى.
 */

const CIPHERTEXT = 'hami_enc_v2:U2FsdGVkX1+2yQ9kZm9vYmFy';
const TRUNCATED = '[{"id":"case-1","title":"دعوى مدنية"';

describe('حارس المسح — الموجود غير المقروء', () => {
    it('يميّز «لا عناصر» عن «لا أستطيع القراءة»', () => {
        expect(readProtectedItemCount('lawyer_files', '[]')).toBe(0);
        expect(readProtectedItemCount('lawyer_files', null)).toBe(0);
        expect(readProtectedItemCount('lawyer_files', 'null')).toBe(0);
        expect(readProtectedItemCount('lawyer_files', TRUNCATED)).toBeNull();
        expect(readProtectedItemCount('lawyer_files', CIPHERTEXT)).toBeNull();
        expect(readProtectedItemCount('lawyer_files', '"نصّ حرّ"')).toBeNull();
        expect(readProtectedItemCount('lawyer_files', '[{"id":"a"}]')).toBe(1);
    });

    it('يرفض تفريغ مفتاح محمي موجودُه تالف', () => {
        expect(shouldRejectDossierWipe('lawyer_files', '[]', TRUNCATED)).toBe(true);
        expect(shouldRejectDossierWipe('lawyer_notes', '[]', TRUNCATED)).toBe(true);
        expect(shouldRejectDossierWipe('executionFiles', '[]', TRUNCATED)).toBe(true);
        expect(shouldRejectDossierWipe('hami:criminal:case:abc', '{}', TRUNCATED)).toBe(true);
    });

    it('يرفض تفريغ مفتاح محمي موجودُه نصّ مشفَّر لم يُفكّ', () => {
        expect(shouldRejectDossierWipe('lawyer_files', '[]', CIPHERTEXT)).toBe(true);
        expect(shouldRejectDossierWipe('executionFiles', '[]', CIPHERTEXT)).toBe(true);
        expect(shouldRejectDossierWipe('lawyer_settings', '{}', CIPHERTEXT)).toBe(true);
    });

    it('يرفض الكتابة فوق موجود مشفّر/تالف لمفاتيح الدعاوى — يمنع المسح الجزئي البارد', () => {
        const real = JSON.stringify([{ id: 'a' }, { id: 'b' }]);
        expect(shouldRejectDossierWipe('lawyer_files', real, TRUNCATED)).toBe(true);
        expect(shouldRejectDossierWipe('lawyer_files', real, CIPHERTEXT)).toBe(true);
        /* الاستعادة تمرّ عبر deleteItem ثم setItem أو allowShrink بعد فكّ صريح */
    });

    it('لا يغيّر سلوك المفاتيح غير المحمية', () => {
        expect(shouldRejectDossierWipe('hami:ui:scratch', '[]', TRUNCATED)).toBe(false);
    });

    it('يعرف الحمولة المُفرِّغة', () => {
        expect(isEmptyingPayload('lawyer_files', '[]')).toBe(true);
        expect(isEmptyingPayload('lawyer_settings', '{}')).toBe(true);
        expect(isEmptyingPayload('lawyer_files', '')).toBe(true);
        expect(isEmptyingPayload('hami_quantum_legal_tasks_v1', '{"tasks":[]}')).toBe(true);
        expect(isEmptyingPayload('lawyer_files', '[{"id":"a"}]')).toBe(false);
        expect(isEmptyingPayload('lawyer_files', TRUNCATED)).toBe(false);
    });
});
