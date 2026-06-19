import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  ALL_IRAQI_LAW_BUNDLE_SLUGS,
  assertAllowedLawBundleName,
  bundleFileNameForSlug,
  emptyLawBundle,
  lawNameForBundleSlug,
  type IraqiLawBundleArticle,
  type IraqiLawBundleFile,
  type IraqiLawBundleSlug,
} from '@/app/constants/iraqiLawBundleRegistry';
import {
  extractArticleSortNumber,
  parseOptionalArticleBound,
} from './lawsAdminUtils.ts';

export type DevLawRow = {
  id: string;
  law_name: string;
  article_number: string;
  content: string;
};

const DEFAULT_BUNDLE_ROOT = path.join(process.cwd(), 'src', 'data', 'laws');

function isProductionNodeEnv(): boolean {
  return (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
}

/** تفعيل تلقائي في التطوير عند غياب service_role. */
export function shouldUseDevLocalLawsStore(): boolean {
  if (isProductionNodeEnv()) return false;
  return !(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
}

function getBundleRoot(): string {
  const override = (process.env.DEV_LAWS_BUNDLE_DIR ?? '').trim();
  return override || DEFAULT_BUNDLE_ROOT;
}

function getBundleFilePath(slug: IraqiLawBundleSlug): string {
  return path.join(getBundleRoot(), bundleFileNameForSlug(slug));
}

function normalizeBundleArticle(raw: unknown): IraqiLawBundleArticle | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const article_number =
    row.article_number === null || row.article_number === undefined
      ? ''
      : String(row.article_number).trim();
  const content = typeof row.content === 'string' ? row.content.trim() : '';
  if (!article_number || !content) return null;
  return { article_number, content };
}

function normalizeBundleFile(raw: unknown, expectedLawName: string): IraqiLawBundleFile {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyLawBundle(expectedLawName);
  }
  const blob = raw as Record<string, unknown>;
  const law_name =
    typeof blob.law_name === 'string' && blob.law_name.trim()
      ? blob.law_name.trim()
      : expectedLawName;
  const articles = Array.isArray(blob.articles)
    ? blob.articles
        .map((item) => normalizeBundleArticle(item))
        .filter((item): item is IraqiLawBundleArticle => item !== null)
    : [];
  return {
    schemaVersion: 1,
    law_name,
    articles,
  };
}

async function readBundleBySlug(slug: IraqiLawBundleSlug): Promise<IraqiLawBundleFile> {
  const expectedLawName = lawNameForBundleSlug(slug);
  try {
    const raw = await fs.readFile(getBundleFilePath(slug), 'utf8');
    return normalizeBundleFile(JSON.parse(raw), expectedLawName);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException | undefined)?.code;
    if (code === 'ENOENT') return emptyLawBundle(expectedLawName);
    throw err;
  }
}

async function writeBundleBySlug(slug: IraqiLawBundleSlug, bundle: IraqiLawBundleFile): Promise<void> {
  const bundleRoot = getBundleRoot();
  await fs.mkdir(bundleRoot, { recursive: true });
  const filePath = getBundleFilePath(slug);
  const payload: IraqiLawBundleFile = {
    schemaVersion: 1,
    law_name: lawNameForBundleSlug(slug),
    articles: bundle.articles,
  };
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function articleKey(articleNumber: string): string {
  return articleNumber.trim();
}

function bundleToRows(bundle: IraqiLawBundleFile): DevLawRow[] {
  return bundle.articles.map((article) => ({
    id: `${bundle.law_name}::${article.article_number}`,
    law_name: bundle.law_name,
    article_number: article.article_number,
    content: article.content,
  }));
}

function sortRows(rows: DevLawRow[]): DevLawRow[] {
  return [...rows].sort((a, b) => {
    const byLaw = a.law_name.localeCompare(b.law_name, 'ar');
    if (byLaw !== 0) return byLaw;
    const an = extractArticleSortNumber(a.article_number) ?? Number.MAX_SAFE_INTEGER;
    const bn = extractArticleSortNumber(b.article_number) ?? Number.MAX_SAFE_INTEGER;
    return an - bn;
  });
}

export async function devLocalInsertLaw(params: {
  law_name: string;
  article_number: string;
  content: string;
}): Promise<DevLawRow> {
  const slug = assertAllowedLawBundleName(params.law_name);
  const bundle = await readBundleBySlug(slug);
  const key = articleKey(params.article_number);
  const nextArticle: IraqiLawBundleArticle = {
    article_number: params.article_number,
    content: params.content,
  };
  const idx = bundle.articles.findIndex((row) => articleKey(row.article_number) === key);
  if (idx >= 0) {
    bundle.articles[idx] = nextArticle;
  } else {
    bundle.articles.push(nextArticle);
  }
  await writeBundleBySlug(slug, bundle);
  return {
    id: `${bundle.law_name}::${params.article_number}`,
    law_name: bundle.law_name,
    article_number: params.article_number,
    content: params.content,
  };
}

export async function devLocalImportLawArticles(params: {
  law_name: string;
  articles: Array<{ article_number: string; content: string }>;
}): Promise<{ imported: number }> {
  const slug = assertAllowedLawBundleName(params.law_name);
  const bundle = await readBundleBySlug(slug);

  for (const article of params.articles) {
    const key = articleKey(article.article_number);
    const nextArticle: IraqiLawBundleArticle = {
      article_number: article.article_number,
      content: article.content,
    };
    const idx = bundle.articles.findIndex((row) => articleKey(row.article_number) === key);
    if (idx >= 0) {
      bundle.articles[idx] = nextArticle;
    } else {
      bundle.articles.push(nextArticle);
    }
  }

  await writeBundleBySlug(slug, bundle);
  return { imported: params.articles.length };
}

export async function devLocalListLaws(lawName?: string): Promise<DevLawRow[]> {
  if (lawName) {
    const slug = assertAllowedLawBundleName(lawName);
    return sortRows(bundleToRows(await readBundleBySlug(slug)));
  }

  const rows: DevLawRow[] = [];
  for (const slug of ALL_IRAQI_LAW_BUNDLE_SLUGS) {
    rows.push(...bundleToRows(await readBundleBySlug(slug)));
  }
  return sortRows(rows);
}

export async function devLocalClearLaws(params: {
  lawName: string;
  articleFrom?: number | null;
  articleTo?: number | null;
}): Promise<
  | { ok: true; deletedCount: number; message: string; article_from?: number; article_to?: number }
  | { ok: false; error: string }
> {
  const slug = assertAllowedLawBundleName(params.lawName);
  const { lawName } = params;
  const articleFrom = params.articleFrom ?? null;
  const articleTo = params.articleTo ?? null;
  const hasRange = articleFrom !== null || articleTo !== null;

  if (hasRange && (articleFrom === null || articleTo === null)) {
    return { ok: false, error: 'لحذف نطاق محدد، أرسل article_from و article_to معاً.' };
  }
  if (hasRange && articleFrom! > articleTo!) {
    return { ok: false, error: 'article_from يجب أن يكون أصغر من أو يساوي article_to.' };
  }

  const bundle = await readBundleBySlug(slug);
  const kept: IraqiLawBundleArticle[] = [];
  const removed: IraqiLawBundleArticle[] = [];

  for (const article of bundle.articles) {
    if (!hasRange) {
      removed.push(article);
      continue;
    }
    const n = extractArticleSortNumber(article.article_number);
    if (n !== null && n >= articleFrom! && n <= articleTo!) {
      removed.push(article);
    } else {
      kept.push(article);
    }
  }

  await writeBundleBySlug(slug, { ...bundle, articles: kept });

  if (!hasRange) {
    return {
      ok: true,
      deletedCount: removed.length,
      message: `تم تنظيف مواد (${lawName}) من ملف الحزمة المحلية (${bundleFileNameForSlug(slug)}).`,
    };
  }

  if (removed.length === 0) {
    return {
      ok: true,
      deletedCount: 0,
      message: `لا توجد مواد ضمن النطاق ${articleFrom}–${articleTo} في (${lawName}).`,
      article_from: articleFrom!,
      article_to: articleTo!,
    };
  }

  return {
    ok: true,
    deletedCount: removed.length,
    message: `تم حذف ${removed.length} مادة (من ${articleFrom} إلى ${articleTo}) من (${lawName}) في ملف الحزمة المحلية.`,
    article_from: articleFrom!,
    article_to: articleTo!,
  };
}

export function parseDevLocalArticleBound(raw: unknown): number | null {
  return parseOptionalArticleBound(raw);
}

/** لسكربت الترحيل — كتابة حزمة كاملة لقانون واحد. */
export async function writeLawBundleFile(
  slug: IraqiLawBundleSlug,
  articles: IraqiLawBundleArticle[],
): Promise<void> {
  await writeBundleBySlug(slug, {
    schemaVersion: 1,
    law_name: lawNameForBundleSlug(slug),
    articles,
  });
}

export async function readLawBundleFile(slug: IraqiLawBundleSlug): Promise<IraqiLawBundleFile> {
  return readBundleBySlug(slug);
}

/** معرّف فريد عند الحاجة لسجلات API. */
export function createLawRowId(): string {
  return randomUUID();
}
