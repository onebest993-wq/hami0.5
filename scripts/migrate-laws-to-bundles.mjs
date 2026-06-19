#!/usr/bin/env node
/**
 * يقسّم data/dev-iraqi-laws.json (النسخة القديمة الموحّدة)
 * إلى ملف مستقل لكل قانون تحت src/data/laws/
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const legacyFile = path.join(projectRoot, 'data', 'dev-iraqi-laws.json');
const bundleRoot = path.join(projectRoot, 'src', 'data', 'laws');

const LAW_NAME_TO_SLUG = {
  'قانون التنفيذ العراقي رقم 45 لسنة 1980': 'execution',
  'قانون العقوبات العراقي رقم 111 لسنة 1969': 'penal',
  'قانون أصول المحاكمات الجزائية العراقي رقم 23 لسنة 1971': 'criminal-procedure',
  'قانون رعاية الأحداث العراقي رقم 76 لسنة 1983': 'juvenile',
  'قانون المرافعات المدنية العراقي رقم 83 لسنة 1969': 'civil-procedure',
  'قانون الإثبات العراقي رقم 107 لسنة 1979': 'evidence',
};

const SLUG_TO_LAW_NAME = Object.fromEntries(
  Object.entries(LAW_NAME_TO_SLUG).map(([lawName, slug]) => [slug, lawName]),
);

const ALL_SLUGS = Object.values(LAW_NAME_TO_SLUG);

function articleKey(articleNumber) {
  return String(articleNumber ?? '').trim();
}

async function main() {
  await fs.mkdir(bundleRoot, { recursive: true });

  const buckets = new Map();
  for (const slug of ALL_SLUGS) {
    buckets.set(slug, []);
  }

  let legacyCount = 0;
  try {
    const raw = await fs.readFile(legacyFile, 'utf8');
    const rows = JSON.parse(raw);
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const lawName = String(row?.law_name ?? '').trim();
        const slug = LAW_NAME_TO_SLUG[lawName];
        const article_number = articleKey(row?.article_number);
        const content = String(row?.content ?? '').trim();
        if (!slug || !article_number || !content) continue;
        const list = buckets.get(slug);
        const key = articleKey(article_number);
        const idx = list.findIndex((item) => articleKey(item.article_number) === key);
        const article = { article_number, content };
        if (idx >= 0) list[idx] = article;
        else list.push(article);
        legacyCount += 1;
      }
    }
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
  }

  for (const slug of ALL_SLUGS) {
    const articles = buckets.get(slug) ?? [];
    articles.sort((a, b) => {
      const an = Number.parseInt(a.article_number, 10);
      const bn = Number.parseInt(b.article_number, 10);
      if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
      return a.article_number.localeCompare(b.article_number, 'ar');
    });
    const payload = {
      schemaVersion: 1,
      law_name: SLUG_TO_LAW_NAME[slug],
      articles,
    };
    const target = path.join(bundleRoot, `${slug}.articles.json`);
    await fs.writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(`${slug}.articles.json: ${articles.length} مادة`);
  }

  if (legacyCount > 0) {
    console.log(`\nتم ترحيل ${legacyCount} سجل من data/dev-iraqi-laws.json`);
  } else {
    console.log('\nتم تهيئة ملفات الحزم.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
