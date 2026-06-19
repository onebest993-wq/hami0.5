import {
    ALL_IRAQI_LAW_BUNDLE_SLUGS,
    LAW_NAME_TO_BUNDLE_SLUG,
    lawNameForBundleSlug,
    type IraqiLawBundleArticle,
    type IraqiLawBundleFile,
    type IraqiLawBundleSlug,
} from '@/app/constants/iraqiLawBundleRegistry';

type BundleModule = { default: IraqiLawBundleFile };

const bundleModules = import.meta.glob<BundleModule>('@/data/laws/*.articles.json', {
    eager: true,
});

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

const bundleBySlug = new Map<IraqiLawBundleSlug, IraqiLawBundleFile>();

for (const slug of ALL_IRAQI_LAW_BUNDLE_SLUGS) {
    const fileName = `${slug}.articles.json`;
    const mod = Object.entries(bundleModules).find(([path]) => path.endsWith(fileName));
    const expectedLawName = lawNameForBundleSlug(slug);
    const bundle = normalizeBundle(mod?.[1]?.default, expectedLawName);
    if (bundle.law_name !== expectedLawName) {
        bundle.law_name = expectedLawName;
    }
    bundleBySlug.set(slug, bundle);
}

export function getBundledLawArticles(lawName: string): IraqiLawBundleArticle[] {
    const slug = LAW_NAME_TO_BUNDLE_SLUG[String(lawName ?? '').trim()];
    if (!slug) return [];
    return bundleBySlug.get(slug)?.articles ?? [];
}

export function getBundledLawRows(lawName: string): Array<{
    id: string;
    law_name: string;
    article_number: string;
    content: string;
}> {
    const slug = LAW_NAME_TO_BUNDLE_SLUG[String(lawName ?? '').trim()];
    if (!slug) return [];
    const bundle = bundleBySlug.get(slug);
    if (!bundle) return [];
    return bundle.articles.map((article) => ({
        id: `${bundle.law_name}::${article.article_number}`,
        law_name: bundle.law_name,
        article_number: article.article_number,
        content: article.content,
    }));
}

export function hasBundledLawArticles(lawName: string): boolean {
    return getBundledLawArticles(lawName).length > 0;
}

export function bundledLawBundleSlugForLawName(lawName: string): IraqiLawBundleSlug | null {
    return LAW_NAME_TO_BUNDLE_SLUG[String(lawName ?? '').trim()] ?? null;
}
