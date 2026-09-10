/**
 * REVIEW-03 §R-4 — شاشة الخطأ كانت تُرسم تحت غطاء إقلاعٍ معتم.
 *
 * الغطاء الأصلي لا يُحرَّر إلا بـ`HamiBoot.notifyReady`، ومساره الوحيد
 * `markBootRevealDone` — وهو لا يُبلَغ حين يفشل الإقلاع. فتُرسم رسالة الخطأ خلف
 * غطاءٍ لا يراه المستخدم، حتى يرفعه المُنقذ الزمني في `MainActivity`.
 *
 * ولمّا رُفع المُنقذ إلى ٢٩ ثانية في `c29e16d2` — وهو الصواب للإقلاع البطيء المشروع —
 * صارت المقايضة: اثنتا عشرة ثانية أفضل في الحالة الشائعة، وتسعٌ **أسوأ** في الحالة
 * النادرة. وهذا الاختبار يُغلق النصف الثاني: المسار القاتل يُحرّر الغطاء بنفسه.
 *
 * ويقيس **العلاقة** لا وجود اسمٍ في نصّ: أنّ الاستدعاء يقع داخل جسم
 * `renderFatalBootError` نفسه، لا في أيّ موضعٍ من الملفّ.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'src/boot/mountApplication.ts'), 'utf8');

/** يقتطع جسم دالّةٍ بمطابقة الأقواس، فلا تُخلط بما بعدها */
function functionBody(text: string, declaration: string): string {
    const start = text.indexOf(declaration);
    expect(start, `${declaration} غير موجودة`).toBeGreaterThanOrEqual(0);
    const open = text.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < text.length; i += 1) {
        if (text[i] === '{') depth += 1;
        else if (text[i] === '}') {
            depth -= 1;
            if (depth === 0) return text.slice(open, i + 1);
        }
    }
    throw new Error(`تعذّر اقتطاع جسم ${declaration}`);
}

describe('المسار القاتل يُحرّر غطاء الإقلاع الأصلي', () => {
    it('renderFatalBootError تُحرّر الغطاء في جسمها هي', () => {
        const body = functionBody(source, 'function renderFatalBootError');

        expect(body).toContain('releaseNativeBootOverlayForFatalError()');
        expect(body).toContain('removeStaticBootShell');
    });

    it('التحرير يمرّ بـnotifyNativeBootReady ولا يُنتظر ولا يُسقط الرسم', () => {
        const body = functionBody(source, 'function releaseNativeBootOverlayForFatalError');

        expect(body).toContain('notifyNativeBootReady');
        expect(body).toContain('nativeBootSplash');
        /* لا await: انتظار الجسر الأصلي يؤخّر رسم الخطأ نفسه */
        expect(body).not.toMatch(/\bawait\b/);
        /* ولا يسقط الرسم إن أخفق التحرير */
        expect(body).toContain('.catch(');
    });
});
