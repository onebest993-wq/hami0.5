#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const bundleRoot = path.join(projectRoot, 'src', 'data', 'laws');

const SOURCES = [
  {
    slug: 'penal',
    lawName: 'قانون العقوبات العراقي رقم 111 لسنة 1969',
    url: 'https://wiki.dorar-aliraq.net/iraqilaws/law/20706.html',
  },
  {
    slug: 'criminal-procedure',
    lawName: 'قانون أصول المحاكمات الجزائية العراقي رقم 23 لسنة 1971',
    url: 'https://wiki.dorar-aliraq.net/iraqilaws/law/4895.html',
  },
  {
    slug: 'juvenile',
    lawName: 'قانون رعاية الأحداث العراقي رقم 76 لسنة 1983',
    url: 'https://wiki.dorar-aliraq.net/iraqilaws/law/19105.html',
  },
  {
    slug: 'execution',
    lawName: 'قانون التنفيذ العراقي رقم 45 لسنة 1980',
    url: 'https://wiki.dorar-aliraq.net/iraqilaws/law/3121.html',
  },
];

function decodeHtmlEntities(input) {
  return String(input ?? '')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeDigits(input) {
  return String(input ?? '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function cleanBlock(html) {
  return decodeHtmlEntities(
    String(html ?? '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?p[^>]*>/gi, '')
      .replace(/<\/?strong[^>]*>/gi, '')
      .replace(/<\/?em[^>]*>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r/g, ''),
  )
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^\s*المحتوى\s*\d*\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractEntryContent(html) {
  const match = html.match(/<div class="entry-content">([\s\S]*?)<\/div>/i);
  if (!match) {
    throw new Error('تعذر العثور على entry-content في الصفحة.');
  }
  return match[1];
}

function parseArticlesFromEntryContent(entryContent) {
  const paragraphRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  const headerRegex = /(المادة|مادة)\s*[–-]?\s*([0-9٠-٩]+)\s*[–-]?/g;
  const byNumber = new Map();

  for (const match of entryContent.matchAll(paragraphRegex)) {
    const block = cleanBlock(match[1]);
    if (!block) continue;

    const rawHeaders = [...block.matchAll(headerRegex)];
    if (rawHeaders.length === 0) continue;
    const prefix = block.slice(0, rawHeaders[0]?.index ?? 0).trim();
    if (prefix) {
      const prefixWordCount = prefix.split(/\s+/).filter(Boolean).length;
      if (prefixWordCount > 12 && /[.؟!،]/.test(prefix)) continue;
    }

    const headers = [];
    let lastAcceptedNumber = -1;

    for (const header of rawHeaders) {
      const articleNumber = Number.parseInt(normalizeDigits(header[2]), 10);
      if (!Number.isFinite(articleNumber)) continue;
      if (headers.length === 0 || articleNumber > lastAcceptedNumber) {
        headers.push({
          index: header.index ?? 0,
          text: header[0],
          articleNumber,
        });
        lastAcceptedNumber = articleNumber;
      }
    }

    for (let i = 0; i < headers.length; i += 1) {
      const current = headers[i];
      const next = headers[i + 1];
      const body = block
        .slice(current.index + current.text.length, next ? next.index : undefined)
        .replace(/^\s*[:.\-–]+\s*/u, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (!body) continue;

      byNumber.set(String(current.articleNumber), {
        article_number: String(current.articleNumber),
        content: body,
      });
    }
  }

  return [...byNumber.values()].sort(
    (a, b) => Number.parseInt(a.article_number, 10) - Number.parseInt(b.article_number, 10),
  );
}

async function fetchLawHtml(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`فشل الجلب: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function writeBundle(source, articles) {
  await fs.mkdir(bundleRoot, { recursive: true });
  const target = path.join(bundleRoot, `${source.slug}.articles.json`);
  const payload = {
    schemaVersion: 1,
    law_name: source.lawName,
    articles,
  };
  await fs.writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function main() {
  for (const source of SOURCES) {
    const html = await fetchLawHtml(source.url);
    const articles = parseArticlesFromEntryContent(extractEntryContent(html));
    if (articles.length === 0) {
      throw new Error(`لم يتم استخراج أي مواد من ${source.slug}`);
    }
    await writeBundle(source, articles);
    console.log(`${source.slug}: ${articles.length} مادة`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
