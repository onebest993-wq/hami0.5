import { describe, expect, it } from 'vitest';
import { stripRepositoryHtml } from './stripRepositoryHtml';

describe('stripRepositoryHtml', () => {
    it('يزيل الوسوم ويضغط المسافات', () => {
        expect(stripRepositoryHtml('<p>مرحبا <strong>بالعالم</strong></p>')).toBe('مرحبا بالعالم');
        expect(stripRepositoryHtml('   ')).toBe('');
        expect(stripRepositoryHtml('نص عادي')).toBe('نص عادي');
        expect(stripRepositoryHtml('<p>أ &amp; ب&nbsp;ج</p>')).toBe('أ & ب ج');
        expect(stripRepositoryHtml('<script>x</script>عنوان')).toBe('عنوان');
    });
    it('Phase0 يحذف وسوم الخطرة كاملة مع محتواها الداخلي (WHOLE BLOCK DELETE)', () => {
        expect(stripRepositoryHtml('<script>alert(1)</script>خارجي')).toBe('خارجي');
        expect(stripRepositoryHtml('<iframe src="x"></iframe>قائمة')).toBe('قائمة');
        expect(stripRepositoryHtml('<object data="x"></object>قائمة')).toBe('قائمة');
        expect(stripRepositoryHtml('<embed src="x"/>قائمة')).toBe('قائمة');
        expect(stripRepositoryHtml('<style>body{color:red}</style>نص')).toBe('نص');
        expect(stripRepositoryHtml('<link rel="stylesheet"/>نص')).toBe('نص');
        expect(stripRepositoryHtml('<meta charset="utf8"/>نص')).toBe('نص');
        expect(stripRepositoryHtml('<base href="/"/>نص')).toBe('نص');
        expect(stripRepositoryHtml('<SCRIPT>upperCase</SCRIPT>نص')).toBe('نص');
    });
    it('Phase1 يزيل أقواس الوسوم المتبقية بعد حذف الخطرة', () => {
        expect(stripRepositoryHtml('<div class="x">محتوى</div>')).toBe('محتوى');
        expect(stripRepositoryHtml('<p>فقرة <span>داخلية</span></p>')).toBe('فقرة داخلية');
    });
    it('يعيد سلسلة فارغة للغير سلسلة ويتفادى انهيار الضغط', () => {
        expect(stripRepositoryHtml(null as unknown as string)).toBe('');
        expect(stripRepositoryHtml(undefined as unknown as string)).toBe('');
        expect(stripRepositoryHtml(42 as unknown as string)).toBe('');
    });
});

describe('XSS Repository TR-5.2 FIRST LINE mapper sanitize path', () => {
    it('يرمي وسوم سكريبت من نص الملاحظة قبل المعالجة', () => {
        const rawNote = '<script>steal()</script>ملاحظة طبيعية';
        expect(stripRepositoryHtml(rawNote)).toBe('ملاحظة طبيعية');
    });
    it('يحمي ضد حقن iframe متداخل', () => {
        expect(stripRepositoryHtml('قبل<iframe src=evil><p>in</p></iframe>بعد')).toBe('قبل بعد');
    });
});
