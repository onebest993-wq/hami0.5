import {
    LAW_NAME_TO_BUNDLE_SLUG,
    lawNameForBundleSlug,
    type IraqiLawBundleArticle,
    type IraqiLawBundleFile,
    type IraqiLawBundleSlug,
} from '@/app/constants/iraqiLawBundleRegistry';

export type BundledLawRow = {
    id: string;
    law_name: string;
    article_number: string;
    content: string;
};

type BundleModule = { default: IraqiLawBundleFile };

/** تحميل كسول — كل ملف قانون chunk مستقل عند أول طلب */
const bundleLoaders = import.meta.glob<BundleModule>('@/data/laws/*.articles.json');

const bundlePathBySlug = new Map<IraqiLawBundleSlug, string>();
for (const path of Object.keys(bundleLoaders)) {
    const match = path.match(/\/([^/]+)\.articles\.json$/);
    if (!match) continue;
    bundlePathBySlug.set(match[1] as IraqiLawBundleSlug, path);
}

const bundleBySlug = new Map<IraqiLawBundleSlug, IraqiLawBundleFile>();
const bundleInflight = new Map<IraqiLawBundleSlug, Promise<IraqiLawBundleFile>>();

function normalizeBundle(raw: unknown, expectedLawName: string): IraqiLawBundleFile {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return { schemaVersion: 1, law_name: expectedLawName, articles: [] };
    }
    const blob = raw as IraqiLawBundleFile;
    const articles = Array.isArray(blob.articles)
        ? blob.articles
              .map((item) => {
                  const article_number = String(item?.article_number ?? '').trim();
                  const content = String(item?.content ?? '').trim();
                  if (!article_number || !content) return null;
                  return { article_number, content } satisfies IraqiLawBundleArticle;
              })
              .filter((item): item is IraqiLawBundleArticle => item !== null)
        : [];
    return {
        schemaVersion: 1,
        law_name:
            typeof blob.law_name === 'string' && blob.law_name.trim()
                ? blob.law_name.trim()
                : expectedLawName,
        articles,
    };
}

function rowsFromBundle(bundle: IraqiLawBundleFile): BundledLawRow[] {
    return bundle.articles.map((article) => ({
        id: `${bundle.law_name}::${article.article_number}`,
        law_name: bundle.law_name,
        article_number: article.article_number,
        content: article.content,
    }));
}

async function loadBundle(slug: IraqiLawBundleSlug): Promise<IraqiLawBundleFile> {
    const cached = bundleBySlug.get(slug);
    if (cached) return cached;

    const pending = bundleInflight.get(slug);
    if (pending) return pending;

    const expectedLawName = lawNameForBundleSlug(slug);
    const path = bundlePathBySlug.get(slug);
    const loader = path ? bundleLoaders[path] : undefined;

    const promise = (async () => {
        if (!loader) {
            const empty = normalizeBundle(null, expectedLawName);
            bundleBySlug.set(slug, empty);
            return empty;
        }
        const mod = await loader();
        const bundle = normalizeBundle(mod.default, expectedLawName);
        if (bundle.law_name !== expectedLawName) {
            bundle.law_name = expectedLawName;
        }
        bundleBySlug.set(slug, bundle);
        return bundle;
    })();

    bundleInflight.set(slug, promise);
    try {
        return await promise;
    } finally {
        bundleInflight.delete(slug);
    }
}

export function isBundledLawRegistered(lawName: string): boolean {
    const slug = LAW_NAME_TO_BUNDLE_SLUG[String(lawName ?? '').trim()];
    return Boolean(slug && bundlePathBySlug.has(slug));
}

export async function loadBundledLawArticles(lawName: string): Promise<IraqiLawBundleArticle[]> {
    const slug = LAW_NAME_TO_BUNDLE_SLUG[String(lawName ?? '').trim()];
    if (!slug) return [];
    const bundle = await loadBundle(slug);
    return bundle.articles;
}

export async function loadBundledLawRows(lawName: string): Promise<BundledLawRow[]> {
    const slug = LAW_NAME_TO_BUNDLE_SLUG[String(lawName ?? '').trim()];
    if (!slug) return [];
    const bundle = await loadBundle(slug);
    return rowsFromBundle(bundle);
}

export async function hasBundledLawArticles(lawName: string): Promise<boolean> {
    const articles = await loadBundledLawArticles(lawName);
    return articles.length > 0;
}

export function bundledLawBundleSlugForLawName(lawName: string): IraqiLawBundleSlug | null {
    return LAW_NAME_TO_BUNDLE_SLUG[String(lawName ?? '').trim()] ?? null;
}

/** للاختبارات — إعادة ضبط الكاش بين الحالات */
export function resetBundledLawLoaderCacheForTests(): void {
    bundleBySlug.clear();
    bundleInflight.clear();
}
