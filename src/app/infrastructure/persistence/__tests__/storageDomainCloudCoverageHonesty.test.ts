/**
 * كلّ نطاق تخزين له موقفٌ معلَن من السحابة — أو تسقط هذه البوّابة.
 *
 * القياس ٢٠٢٦-٠٩-١١: لم يكن في المستودع موضعٌ واحد يجيب «هل يمكن أن تعيش بيانات
 * محامٍ على هاتفه وحده؟». الجواب كان موزّعاً على أربعة مصادر مستقلّة:
 *   • `cloudSyncEngine.resolveSyncBucket` — ثلاث سلال ورابعة اسمها `unsupported`
 *   • `lawyerWorkCloudGate.isWorkLocalKvMaterial` — بادئات KV
 *   • `workCloudCheckpoint` — خمس شرائح في حمولة نقطة الحفظ
 *   • اختبارات `*NetworkIsolationHonesty` — ما هو محلّي بقرار
 * ولا شيء يربطها، فنطاقٌ جديد يُضاف بلا موقف لا يُلاحظه أحد.
 *
 * وهذا ليس قلقاً نظرياً: التخزين المحلّي هنا IndexedDB، والمتصفّح يُخليه تحت ضغط
 * المساحة بلا إذن ولا إشعار. فنطاقٌ بلا مسارٍ سحابي = عملٌ يمكن أن يزول.
 *
 * الفحص لا يقرّر لأحد: يطالب فقط بأن يكون لكلّ نطاق موقفٌ **مكتوب** في واحدة من
 * ثلاث قوائم. وإضافة نطاقٍ جديد بلا موقف تُسقط الاختبار.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { StorageDomainKeys } from '@/app/infrastructure/persistence/storageDomains';

const root = process.cwd();
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8');

/** نطاقات لها مسار سحابي — ومعه الموضع الذي يثبته */
const SYNCED: Record<string, string> = {
    [StorageDomainKeys.lawsuitFiles]:
        "cloudSyncEngine: سلة 'lawsuit'، وشريحة `lawsuits` في نقطة الحفظ",
    [StorageDomainKeys.executionFiles]:
        "cloudSyncEngine: سلة 'execution'، وشريحة `execution` في نقطة الحفظ",
    [StorageDomainKeys.globalNotes]:
        "cloudSyncEngine: سلة 'notes'، وشريحة `notes` في نقطة الحفظ",
};

/** نطاقات محلّية **بقرار موثّق**، ولكلٍّ اختبارٌ يحرس محلّيتها */
const LOCAL_BY_DESIGN: Record<string, string> = {
    [StorageDomainKeys.settings]:
        'settingsNetworkIsolationHonesty + offlineSectionsCloudOnlyNetworkHonesty: ' +
        '`lawyer_settings` محلي مشفّر، لا يمرّ بـKV ولا بـ/api/settings/cloud-sync',
    [StorageDomainKeys.theme]: 'تفضيل عرض — يتبع lawyer_settings ولا قيمة لاستعادته من جهاز آخر',
    [StorageDomainKeys.shape]: 'تفضيل عرض — كما theme',
    [StorageDomainKeys.wallpaper]: 'تفضيل عرض — كما theme',
    [StorageDomainKeys.quantumTasks]:
        'tasksNetworkIsolationHonesty + offlineSectionsCloudOnlyNetworkHonesty: ' +
        'المهام الميدانية تُحفظ محلياً؛ طلب العون شبكة تعاون لا مزامنة إضابير',
    [StorageDomainKeys.notifications]:
        'إشعارات الجهاز — مشتقّة من الإضابير المزامَنة، ولا معنى لنقل صندوق إشعارات جهاز',
    [StorageDomainKeys.workspacePins]:
        'تثبيتات واجهة تشير إلى إضابير مزامَنة — تُفقد التثبيتات لا العمل',
};

/**
 * نطاقات بلا مسار سحابي **وبلا قرار** — ينتظر كلمة المالك.
 *
 * وهذه ليست قائمةً تُطوّل: وجودُ مفتاحٍ هنا إقرارٌ بأنّ عملاً حقيقياً قد يعيش على
 * جهازٍ واحد. التفصيل والقياس في `.audit/FINDING_STORAGE_CLOUD_COVERAGE.md`.
 */
const AWAITING_OWNER_DECISION: Record<string, string> = {
    [StorageDomainKeys.criminalStore]:
        'لا سلة ولا بادئة KV ولا شريحة في نقطة الحفظ ولا اختبار محلّية — ' +
        'وحده بين النطاقات بلا أيّ موقف معلَن. والخادم يسجّل ملكية القضية بلا محتواها.',
    [StorageDomainKeys.criminalMeta]: 'كما criminalStore — فهرس القضايا الجزائية نفسه',
};

describe('تغطية النطاقات سحابياً: لكل نطاق موقف معلَن', () => {
    it('لا نطاق تخزين بلا موقف مكتوب', () => {
        const declared = new Set([
            ...Object.keys(SYNCED),
            ...Object.keys(LOCAL_BY_DESIGN),
            ...Object.keys(AWAITING_OWNER_DECISION),
        ]);
        const undeclared = Object.entries(StorageDomainKeys)
            .filter(([, key]) => !declared.has(key))
            .map(([name, key]) => `${name} (${key})`);

        expect(
            undeclared,
            'نطاق تخزين بلا موقف من السحابة. أضِفه إلى إحدى القوائم الثلاث بسببٍ مكتوب، ' +
                'ولا تُضِفه إلى AWAITING_OWNER_DECISION إلا بعد قياسٍ يُثبت غياب كل مسار.',
        ).toEqual([]);
    });

    it('المزامَنة تُطابق ما يقوله المحرّك ونقطة الحفظ فعلاً', () => {
        const engine = read('src/app/services/cloudSyncEngine.ts');
        const checkpoint = read('src/app/services/cloud/workCloudCheckpoint.ts');

        /* السلال الثلاث قائمة بأسمائها — لا سلة رابعة صامتة */
        expect(engine).toContain(
            "export type CloudSyncBucket = 'execution' | 'lawsuit' | 'notes' | 'unsupported'",
        );
        /* شرائح نقطة الحفظ — تغيّرها يُبطل جدول SYNCED أعلاه */
        for (const slice of ['lawsuits:', 'execution:', 'notes:', 'calendar:']) {
            expect(checkpoint).toContain(slice);
        }
    });

    it('ما ينتظر قرار المالك لم يُكتسب مساراً سحابياً بصمت', () => {
        const engine = read('src/app/services/cloudSyncEngine.ts');
        const gate = read('src/app/services/settings/lawyerWorkCloudGate.ts');
        const checkpoint = read('src/app/services/cloud/workCloudCheckpoint.ts');

        /*
         * إن ظهر الجزائي في أيٍّ من الثلاثة فقد صار مزامَناً — وهو خبرٌ سارّ يستوجب
         * نقله إلى SYNCED، لا تركه هنا. سقوط هذا التأكيد دعوةٌ لتحديث الجدول.
         */
        for (const source of [engine, gate, checkpoint]) {
            expect(source.toLowerCase()).not.toContain('criminal');
        }
    });
});
