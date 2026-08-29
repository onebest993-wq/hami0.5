/**
 * مستندات المستودع: من «بلا حماية» إلى «محميّة بشواهد قبر».
 *
 * كان `hami:repository:docs:v1` مصفوفةً يملكها المحامي خارج قائمة الحماية بالكامل،
 * بينما نظيرها `hami:smartvault:docs:v1` محميّ منذ البداية. فأي قراءة فاشلة تُظهر
 * قائمة خالية، وأوّل حفظة بعدها تكتب `[]` فوق المستندات بلا مانع.
 *
 * والحماية وحدها لا تكفي: حذف آخر مستند يكتب `[]` أيضاً، وهو نفس شكل الحمولة.
 * فبلا شاهد قبر يصير الحذف مستحيلاً — يرفض الحارس، ويُبعَث المستند. الاختبارات
 * أدناه تُثبّت الطرفين: لا مسحَ بالخطأ، ولا حذفَ مستحيل.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { shouldRejectDossierWipe } from '../dossierWipeGuard';
import {
    backupDomainForStorageKey,
    isProtectedStorageKey,
    PROTECTED_WARM_KEYS,
} from '../protectedStorageKeys';
import {
    markRepositoryDocDeleted,
    resetRepositoryDocsTombstonesForTests,
} from '@/app/services/forum/repositoryDocsTombstonesLite';

const KEY = 'hami:repository:docs:v1';

const doc = (id: string, authorId = 'lawyer-1') => ({
    id,
    authorId,
    title: `مستند ${id}`,
    authorName: 'محامٍ',
    uploadDate: '2026-01-01T00:00:00.000Z',
    fileName: `${id}.pdf`,
    mimeType: 'application/pdf',
    storagePath: `idb:forum:${id}`,
    fileSize: 1024,
});

describe('حماية مستندات المستودع من المسح', () => {
    beforeEach(() => {
        localStorage.clear();
        resetRepositoryDocsTombstonesForTests();
    });

    it('المفتاح مُدرَج محميّاً وله مجال نسخ احتياطي ويُسخَّن عند الإقلاع', () => {
        expect(isProtectedStorageKey(KEY)).toBe(true);
        expect(backupDomainForStorageKey(KEY)).toBe('repository');
        // بلا تسخين تعود `getItemSync` فراغاً فتُقرأ القائمة خالية قبل جهوز IndexedDB
        expect([...PROTECTED_WARM_KEYS]).toContain(KEY);
    });

    it('يرفض [] فوق مستندات موجودة', () => {
        const existing = JSON.stringify([doc('a'), doc('b')]);
        expect(shouldRejectDossierWipe(KEY, '[]', existing)).toBe(true);
    });

    it('يرفض حمولة تالفة أو مشفَّرة لم تُفكّ', () => {
        // نصّ لا يُفهَم: لا سبيل للجزم أنه كان فارغاً، والكتابة فوقه لا تُنقَذ
        expect(shouldRejectDossierWipe(KEY, '[]', 'ENC:v1:9f3a…')).toBe(true);
    });

    it('يسمح بـ[] حين يحمل كل مستند على القرص شاهد قبر', () => {
        const existing = JSON.stringify([doc('a'), doc('b')]);
        markRepositoryDocDeleted('lawyer-1', 'a');
        markRepositoryDocDeleted('lawyer-1', 'b');
        expect(shouldRejectDossierWipe(KEY, '[]', existing)).toBe(false);
    });

    it('يرفض [] حين شاهدُ واحدٍ فقط من مستندَين', () => {
        const existing = JSON.stringify([doc('a'), doc('b')]);
        markRepositoryDocDeleted('lawyer-1', 'a');
        expect(shouldRejectDossierWipe(KEY, '[]', existing)).toBe(true);
    });

    it('شاهدُ مؤلّفٍ آخر لا يُبيح مسح مستند غيره', () => {
        const existing = JSON.stringify([doc('a', 'lawyer-1')]);
        markRepositoryDocDeleted('lawyer-2', 'a');
        expect(shouldRejectDossierWipe(KEY, '[]', existing)).toBe(true);
    });
});
