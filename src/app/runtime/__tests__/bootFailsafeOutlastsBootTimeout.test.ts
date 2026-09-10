/**
 * غطاء الإقلاع الأصلي يجب أن يبقى حتى ينتهي الإقلاع — لا قبله.
 *
 * `SAFETY_FAILSAFE_MS` في `MainActivity` يرفع غطاء الإقلاع قسراً، و`mountApplication`
 * يمنح تحميل النواة مهلةً قبل أن يُعلن فشلاً. فإن سبق الرفعُ المهلةَ، رأى المستخدم
 * شاشةً غير مكتملة والإقلاع ما زال مشروعاً — بلا رسالة ولا خطأ.
 *
 * وهذا وقع فعلاً: `e4f3147a` رفعت القيمة ٨ث → ٢٩ث عمداً («≥١.٣× مهلة الإقلاع»)،
 * ثم أعادها `065d18a2` إلى ٨ث ضمن commit تجميعٍ ضخم — بينما المهلة ٢٠ث. فبقيت
 * اثنتا عشرة ثانيةً مكشوفة، ولم يكن ثمّة ما يربط الرقمين فيكشف الانحدار.
 *
 * والاختبار يقيس **العلاقة** بين الرقمين لا وجود اسمٍ في نصّ.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

/** القالب هو مصدر الحقيقة، والنسخة الحيّة تُكتب فوقها بـcap:apply:android */
const MAIN_ACTIVITY_PATHS = [
    'scripts/native-ready/android/java/MainActivity.java',
    'android/app/src/main/java/iq/hami/legal/MainActivity.java',
];

function readSafetyFailsafeMs(relPath: string): number {
    const text = readFileSync(join(root, relPath), 'utf8');
    const match = /SAFETY_FAILSAFE_MS\s*=\s*([0-9_]+)L/.exec(text);
    expect(match, `SAFETY_FAILSAFE_MS غير موجود في ${relPath}`).not.toBeNull();
    return Number(match![1].replace(/_/g, ''));
}

function readCoreModuleLoadTimeoutMs(): number {
    const text = readFileSync(join(root, 'src/boot/mountApplication.ts'), 'utf8');
    const match = /withBootTimeout\([\s\S]*?,\s*([0-9_]+),\s*'core module load'/.exec(text);
    expect(match, 'مهلة تحميل النواة غير موجودة في mountApplication').not.toBeNull();
    return Number(match![1].replace(/_/g, ''));
}

describe('غطاء الإقلاع الأصلي يتجاوز مهلة تحميل النواة', () => {
    it('القالب والنسخة الحيّة يحملان القيمة نفسها', () => {
        const [template, live] = MAIN_ACTIVITY_PATHS.map(readSafetyFailsafeMs);
        expect(live).toBe(template);
    });

    it('الرفع القسري لا يسبق المهلة — بهامش ١.٣ على الأقلّ', () => {
        const failsafeMs = readSafetyFailsafeMs(MAIN_ACTIVITY_PATHS[0]);
        const bootTimeoutMs = readCoreModuleLoadTimeoutMs();

        expect(bootTimeoutMs).toBeGreaterThan(0);
        expect(
            failsafeMs,
            `الغطاء يُرفع عند ${failsafeMs}ms والإقلاع مشروع حتى ${bootTimeoutMs}ms`,
        ).toBeGreaterThanOrEqual(Math.ceil(bootTimeoutMs * 1.3));
    });
});
