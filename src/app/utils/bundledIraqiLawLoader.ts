import {
    ALL_IRAQI_LAW_BUNDLE_SLUGS,
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

type StaticLawManifest = {
    version: number;
    generatedAt: string;
    bundles: Record<
        string,
        {
            path: string;
            sha256: string;
            articleCount: number;
            law_name: string;
        }
    >;
};

const MANIFEST_URL = '/static-law-data/manifest.json';
const FETCH_TIMEOUT_MS = 20_000;

const bundleBySlug = new Map<IraqiLawBundleSlug, IraqiLawBundleFile>();
const bundleInflight = new Map<IraqiLawBundleSlug, Promise<IraqiLawBundleFile>>();
let manifestPromise: Promise<StaticLawManifest | null> | null = null;

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

async function fetchJsonWithTimeout(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const response = await fetch(url, { signal: controller.signal, cache: 'default' });
        if (!response.ok) throw new Error(`fetch failed ${response.status}`);
        return await response.json();
    } finally {
        window.clearTimeout(timer);
    }
}

async function loadManifest(): Promise<StaticLawManifest | null> {
    if (!manifestPromise) {
        manifestPromise = fetchJsonWithTimeout(MANIFEST_URL)
            .then((raw) => {
                if (!raw || typeof raw !== 'object') return null;
                const m = raw as StaticLawManifest;
                if (!m.bundles || typeof m.bundles !== 'object') return null;
                return m;
            })
            .catch(() => null);
    }
    return manifestPromise;
}

async function loadBundleFromPublic(slug: IraqiLawBundleSlug): Promise<IraqiLawBundleFile | null> {
    const manifest = await loadManifest();
    const entry = manifest?.bundles?.[slug];
    if (!entry?.path) return null;
    const raw = await fetchJsonWithTimeout(entry.path);
    const expectedLawName = lawNameForBundleSlug(slug);
    const bundle = normalizeBundle(raw, expectedLawName);
    if (bundle.law_name !== expectedLawName) {
        bundle.law_name = expectedLawName;
    }
    return bundle;
}

async function loadBundle(slug: IraqiLawBundleSlug): Promise<IraqiLawBundleFile> {
    const cached = bundleBySlug.get(slug);
    if (cached) return cached;

    const pending = bundleInflight.get(slug);
    if (pending) return pending;

    const expectedLawName = lawNameForBundleSlug(slug);

    const promise = (async () => {
        try {
            const fromPublic = await loadBundleFromPublic(slug);
            if (fromPublic) {
                bundleBySlug.set(slug, fromPublic);
                return fromPublic;
            }
        } catch {
            /* fallback below */
        }

        const empty = normalizeBundle(null, expectedLawName);
        bundleBySlug.set(slug, empty);
        return empty;
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
    return Boolean(slug && ALL_IRAQI_LAW_BUNDLE_SLUGS.includes(slug));
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
    manifestPromise = null;
}
