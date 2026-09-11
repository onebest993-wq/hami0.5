import { useLayoutEffect } from 'react';

const SETTINGS_CHROME = '#0B1021';

type OpaqueSurfaceSnapshot = {
    feature: string | undefined;
    themeColor: string | null;
    hadThemeMeta: boolean;
    htmlBg: string;
    bodyBg: string;
    dash: HTMLElement | null;
    dashBg: string;
};

/**
 * عدّادُ حاملين، لا حفظٌ واستعادة لكل حامل.
 *
 * الحفظ/الاستعادة صحيحٌ للأعمار المتداخلة تماماً وحدها. وشاشتان مستقلّتان — بوابة
 * إعدادات تُغلق بينما يُفتح المستودع — لا تنتهيان بترتيب عكسي بالضرورة، فيقع أحد
 * عطلين، وكلاهما مقيس:
 *   • تنتهي الأولى أوّلاً ⇐ تحذف العَلَم والثانية ما زالت مفتوحة، فيزول الإعتام
 *     من تحت شاشةٍ قائمة.
 *   • تنتهي الثانية أخيراً ⇐ تستعيد `'1'` بعد أن حذفته الأولى، **فيبقى العَلَم
 *     معلّقاً بلا شيء مفتوح**: سطح المنزل يبقى معتماً و`inert` ولا يقبل لمسة.
 *     رُصد في E2E ٢٠٢٦-٠٩-١١ باقياً خمسَ عشرة ثانية بلا أيّ تراكب فوقه.
 *
 * فالحالة الأصلية تُلتقط عند أوّل حامل وتُستعاد عند آخره، وبينهما يفرض كل حامل
 * جديد لونَ كرومه (الأحدث يسود) بلا أن يلمس العدّ.
 */
let holders = 0;
let snapshot: OpaqueSurfaceSnapshot | null = null;

/** لعزل الاختبارات — العدّاد على مستوى الوحدة فيتسرّب بين الحالات بلا هذا */
export function resetOpaqueFeatureSurfaceForTests(): void {
    holders = 0;
    snapshot = null;
}

function readThemeMeta(): HTMLMetaElement | null {
    return document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
}

function applyChrome(chromeColor: string): void {
    const root = document.documentElement;
    root.dataset.hamiFeatureOpen = '1';

    let meta = readThemeMeta();
    if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
    }
    meta.setAttribute('content', chromeColor);

    root.style.backgroundColor = chromeColor;
    document.body.style.backgroundColor = chromeColor;

    const dash = document.querySelector<HTMLElement>('[data-hami-lawyer-dashboard]');
    if (dash) dash.style.backgroundColor = chromeColor;
}

/**
 * يخفّي خلفية اللوحة أثناء شاشة كاملة، ويوحّد لون شريط الحالة/الجسم/SafeView
 * حتى لا يتسرّب لون ثيم الرئيسية من أسفل الشاشات المعتمة (تقويم، إعدادات…).
 */
export function useOpaqueFeatureSurface(active = true, chromeColor = SETTINGS_CHROME): void {
    useLayoutEffect(() => {
        if (!active || typeof document === 'undefined') return;

        if (holders === 0) {
            const root = document.documentElement;
            const dash = document.querySelector<HTMLElement>('[data-hami-lawyer-dashboard]');
            const meta = readThemeMeta();
            snapshot = {
                feature: root.dataset.hamiFeatureOpen,
                themeColor: meta?.getAttribute('content') ?? null,
                hadThemeMeta: Boolean(meta),
                htmlBg: root.style.backgroundColor,
                bodyBg: document.body.style.backgroundColor,
                dash,
                dashBg: dash?.style.backgroundColor ?? '',
            };
        }
        holders += 1;
        applyChrome(chromeColor);

        return () => {
            holders = Math.max(0, holders - 1);
            if (holders > 0 || !snapshot) return;

            const root = document.documentElement;
            if (snapshot.feature !== undefined) root.dataset.hamiFeatureOpen = snapshot.feature;
            else delete root.dataset.hamiFeatureOpen;

            const meta = readThemeMeta();
            if (meta) {
                if (snapshot.themeColor != null) meta.setAttribute('content', snapshot.themeColor);
                else meta.setAttribute('content', SETTINGS_CHROME);
            }

            root.style.backgroundColor = snapshot.htmlBg;
            document.body.style.backgroundColor = snapshot.bodyBg;
            if (snapshot.dash) snapshot.dash.style.backgroundColor = snapshot.dashBg;
            snapshot = null;
        };
    }, [active, chromeColor]);
}
